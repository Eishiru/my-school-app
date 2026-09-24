"""Grade one submitted group work item and credit every assigned member."""
import math
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Quiz, QuizActivityGroup, QuizAttempt, QuizAnswer


class QuestionGradeInput(serializers.Serializer):
    question_id = serializers.IntegerField(min_value=1)
    points = serializers.FloatField(min_value=0)
    feedback = serializers.CharField(required=False, allow_blank=True, default='', max_length=10000)


class GroupGradeInput(serializers.Serializer):
    group_id = serializers.IntegerField(min_value=1)
    source_attempt_id = serializers.IntegerField(min_value=1)
    revision = serializers.IntegerField(min_value=0)
    grades = QuestionGradeInput(many=True, allow_empty=False)

    def validate_grades(self, grades):
        expected = self.context['questions']
        seen = set()
        for grade in grades:
            question_id, points = grade['question_id'], grade['points']
            if question_id not in expected or question_id in seen:
                raise serializers.ValidationError('Provide exactly one grade for each question in this activity.')
            maximum = expected[question_id]
            if not math.isfinite(points) or not math.isfinite(maximum) or not 0 <= points <= maximum:
                raise serializers.ValidationError(f'Question {question_id}: score must be between 0 and {maximum}.')
            seen.add(question_id)
        if seen != set(expected):
            raise serializers.ValidationError('Grade every question before saving the group result.')
        return grades


def user_name(user):
    return f"{user.first_name} {user.last_name}".strip() or str(user.school_id)


def grading_data(quiz, request):
    groups = []
    for group in quiz.activity_groups.prefetch_related('members__user').select_related('graded_by').order_by('id'):
        members = list(group.members.all())
        member_ids = [member.id for member in members]
        submissions = QuizAttempt.objects.filter(
            quiz=quiz, student_id__in=member_ids, group__isnull=True,
            status__in=['SUBMITTED', 'GRADED'], submitted_at__isnull=False,
        ).select_related('student__user').prefetch_related('answers').order_by('-submitted_at', '-id')
        groups.append({
            'id': group.id, 'name': group.name,
            'members': [{'id': member.id, 'name': user_name(member.user)} for member in members],
            'revision': group.grading_revision,
            'source_attempt_id': group.source_attempt_id,
            'grades': group.question_grades,
            'graded_at': group.graded_at,
            'graded_by': user_name(group.graded_by) if group.graded_by else None,
            'submissions': [{
                'id': attempt.id, 'student_name': user_name(attempt.student.user),
                'submitted_at': attempt.submitted_at,
                'answers': [{
                    'question_id': answer.question_id, 'text': answer.text_answer,
                    'file_url': request.build_absolute_uri(answer.answer_file_url) if answer.answer_file_url else '',
                } for answer in attempt.answers.all()],
            } for attempt in submissions],
        })
    return {
        'groups': groups,
        'questions': [{'id': question.id, 'text': question.question_text, 'points': question.points}
                      for question in quiz.questions.order_by('order', 'id')],
    }


def apply_group_grade(quiz, group, source, grades, teacher, members):
    """Caller holds the quiz/group locks inside one transaction."""
    now = timezone.now()
    total = sum(grade['points'] for grade in grades)
    source_answers = {answer.question_id: answer for answer in source.answers.all()}
    for member in members:
        # Group credit is distinct from work submitted by this student.
        credit, _ = QuizAttempt.objects.update_or_create(
            quiz=quiz, student=member, group=group,
            defaults={'score': total, 'status': 'GRADED', 'submitted_at': None},
        )
        for grade in grades:
            answer = source_answers.get(grade['question_id'])
            QuizAnswer.objects.update_or_create(
                attempt=credit, question_id=grade['question_id'],
                defaults={
                    'selected_choice': None,
                    'text_answer': answer.text_answer if answer else '',
                    'answer_file': answer.answer_file.name if answer and answer.answer_file else '',
                    'points_earned': grade['points'], 'teacher_feedback': grade.get('feedback', ''),
                    'manually_graded': True, 'graded_by': teacher, 'graded_at': now, 'is_correct': None,
                },
            )
        credit.answers.exclude(question_id__in=[grade['question_id'] for grade in grades]).delete()
    group.source_attempt = source
    group.question_grades = grades
    group.graded_by = teacher
    group.graded_at = now
    group.grading_revision += 1
    group.save(update_fields=['source_attempt', 'question_grades', 'graded_by', 'graded_at', 'grading_revision'])
    # Import lazily: views imports the mixin while the module is loading.
    from .views import recalc_quarterly_component
    for member in members:
        recalc_quarterly_component(student=member, offering=quiz.SubjectOffering,
                                   semester=quiz.semester, grade_type=quiz.grade_type)


class QuizGroupGradingMixin:
    @action(detail=True, methods=['get', 'put'], url_path='group-grading')
    def group_grading(self, request, pk=None):
        quiz = self.get_object()  # Owner-filtered TeacherQuizViewSet queryset.
        if quiz.activity_mode != 'GROUP':
            return Response({'detail': 'Use individual grading for this activity.'}, status=400)
        if request.method == 'GET':
            return Response(grading_data(quiz, request))
        with transaction.atomic():
            quiz = Quiz.objects.select_for_update().select_related('SubjectOffering__section', 'semester').get(pk=quiz.pk)
            if quiz.activity_mode != 'GROUP':
                return Response({'detail': 'This activity is no longer By Group.'}, status=409)
            questions = list(quiz.questions.all())
            if not questions or any(question.question_type != 'SHORT_ANSWER' for question in questions):
                return Response({'detail': 'Group grading requires an activity with Short Answer questions only.'}, status=400)
            serializer = GroupGradeInput(data=request.data, context={'questions': {q.id: q.points for q in questions}})
            serializer.is_valid(raise_exception=True)
            data = serializer.validated_data
            group = quiz.activity_groups.select_for_update().filter(pk=data['group_id']).first()
            if group is None:
                return Response({'detail': 'Group not found in this activity.'}, status=404)
            if group.grading_revision != data['revision']:
                return Response({'detail': 'This group was graded in another tab. Reload before saving.'}, status=409)
            members = list(group.members.select_related('user').all())
            if not members or any(member.section_id != quiz.SubjectOffering.section_id for member in members):
                return Response({'detail': 'All group members must belong to this activity’s section.'}, status=400)
            source = QuizAttempt.objects.select_for_update().filter(
                pk=data['source_attempt_id'], quiz=quiz, student_id__in=[member.id for member in members],
                group__isnull=True, status__in=['SUBMITTED', 'GRADED'], submitted_at__isnull=False,
            ).first()
            if source is None:
                return Response({'detail': 'Choose submitted work from a member of this group.'}, status=400)
            apply_group_grade(quiz, group, source, data['grades'], request.user, members)
            return Response(grading_data(quiz, request))
