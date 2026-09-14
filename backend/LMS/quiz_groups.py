"""Teacher-owned group assignment endpoints for group activities."""
from django.db import transaction
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Quiz, QuizActivityGroup, Student
from .quiz_group_grading import QuizGroupGradingMixin


class GroupInput(serializers.Serializer):
    id = serializers.IntegerField(required=False, min_value=1)
    name = serializers.CharField(max_length=80, allow_blank=False)
    student_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1), allow_empty=False
    )


class GroupSetInput(serializers.Serializer):
    revision = serializers.IntegerField(min_value=0)
    groups = GroupInput(many=True)

    def validate(self, data):
        names, students, group_ids = set(), set(), set()
        roster = self.context['roster_ids']
        owned_ids = self.context['group_ids']
        for group in data['groups']:
            name = group['name'].casefold()
            if name in names:
                raise serializers.ValidationError('Each group must have a different name.')
            names.add(name)
            group_id = group.get('id')
            if group_id is not None:
                if group_id not in owned_ids or group_id in group_ids:
                    raise serializers.ValidationError('Invalid or repeated group ID.')
                group_ids.add(group_id)
            for student_id in group['student_ids']:
                if student_id not in roster:
                    raise serializers.ValidationError('Select only students currently in this activity’s section.')
                if student_id in students:
                    raise serializers.ValidationError('A student can belong to only one group per activity.')
                students.add(student_id)
        return data


def group_data(quiz):
    roster = Student.objects.filter(section_id=quiz.SubjectOffering.section_id).select_related('user').order_by('user__last_name', 'user__first_name', 'id')
    return {
        'activity_mode': quiz.activity_mode,
        'section': quiz.SubjectOffering.section.name,
        'grade_level': quiz.SubjectOffering.section.get_grade_level_display(),
        'revision': quiz.group_revision,
        'editable': not quiz.attempts.exists(),
        'students': [
            {'id': student.id,
             'name': f'{student.user.first_name} {student.user.last_name}'.strip() or str(student.user.school_id)}
            for student in roster
        ],
        'groups': [
            {'id': group.id, 'name': group.name,
             'student_ids': [student.id for student in group.members.all()]}
            for group in quiz.activity_groups.prefetch_related('members').order_by('id')
        ],
    }


class QuizGroupsMixin(QuizGroupGradingMixin):
    @action(detail=True, methods=['get', 'put'], url_path='groups')
    def groups(self, request, pk=None):
        # get_object uses TeacherQuizViewSet's owner-filtered queryset.
        quiz = self.get_object()
        if quiz.activity_mode != 'GROUP':
            return Response({'detail': 'Groups are available only for By Group activities.'}, status=400)
        if request.method == 'GET':
            return Response(group_data(quiz))
        with transaction.atomic():
            quiz = Quiz.objects.select_for_update().select_related('SubjectOffering__section').get(pk=quiz.pk)
            if quiz.activity_mode != 'GROUP':
                return Response({'detail': 'This activity is no longer By Group.'}, status=400)
            if quiz.attempts.exists():
                return Response({'detail': 'Groups cannot be changed after an activity attempt has started.'}, status=409)
            serializer = GroupSetInput(data=request.data, context={
                'roster_ids': set(Student.objects.filter(section_id=quiz.SubjectOffering.section_id).values_list('id', flat=True)),
                'group_ids': set(quiz.activity_groups.values_list('id', flat=True)),
            })
            serializer.is_valid(raise_exception=True)
            data = serializer.validated_data
            if data['revision'] != quiz.group_revision:
                return Response({'detail': 'Groups changed in another tab. Reload groups before saving.'}, status=409)
            retained = []
            for entry in data['groups']:
                if 'id' in entry:
                    group = quiz.activity_groups.get(pk=entry['id'])
                    group.name = entry['name']
                    group.save(update_fields=['name'])
                else:
                    group = QuizActivityGroup.objects.create(quiz=quiz, name=entry['name'])
                group.members.set(entry['student_ids'])
                retained.append(group.id)
            quiz.activity_groups.exclude(pk__in=retained).delete()
            quiz.group_revision += 1
            quiz.save(update_fields=['group_revision'])
            return Response(group_data(quiz))
