"""Teacher-owned quiz duplication; requires nullable quiz schedule fields."""
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Quiz, QuizQuestion, QuizChoice, SubjectOffering


class DuplicateQuizInput(serializers.Serializer):
    SubjectOffering = serializers.IntegerField(min_value=1)
    title = serializers.CharField(max_length=255, required=False)


def copy_quiz(source, target, teacher, title):
    """Call inside a transaction; only copy content, never student records."""
    fields = {name: getattr(source, name) for name in (
        'description', 'activity_mode', 'grade_type', 'time_limit',
        'semester_id', 'passing_score', 'show_correct_answers',
        'shuffle_questions', 'allow_multiple_attempts',
    )}
    duplicate = Quiz.objects.create(
        **fields, teacher=teacher, SubjectOffering=target, title=title,
        status='DRAFT', open_time=None, close_time=None, total_points=0,
    )
    total = 0
    for original in source.questions.order_by('order', 'id').prefetch_related('choices'):
        question = QuizQuestion.objects.create(
            quiz=duplicate, question_text=original.question_text,
            question_type=original.question_type, points=original.points,
            order=original.order,
        )
        QuizChoice.objects.bulk_create([
            QuizChoice(question=question, choice_text=choice.choice_text,
                       is_correct=choice.is_correct, order=choice.order)
            for choice in original.choices.all()
        ])
        total += original.points
    duplicate.total_points = total
    duplicate.save(update_fields=['total_points'])
    return duplicate


class QuizDuplicateMixin:
    @action(detail=True, methods=['get', 'post'], url_path='duplicate')
    def duplicate(self, request, pk=None):
        source = self.get_object()  # Keep the viewset's permission/object checks.
        if request.user.role != 'TEACHER' or source.teacher_id != request.user.id:
            return Response({'detail': 'Only the owning teacher can duplicate this quiz.'}, status=403)
        targets = SubjectOffering.objects.filter(teacher=request.user).exclude(
            pk=source.SubjectOffering_id
        )
        if request.method == 'GET':
            offerings = []
            for offering in targets.select_related('section').order_by('name', 'section__name', 'id'):
                grade = str(offering.section.grade_level).replace('GRADE_', '').replace('_', ' ')
                offerings.append({'id': offering.id, 'label': f'{offering.name} {grade}- {offering.section.name}'})
            return Response({'offerings': offerings})
        serializer = DuplicateQuizInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            source = get_object_or_404(Quiz.objects.select_for_update(), pk=source.pk, teacher=request.user)
            target = get_object_or_404(targets.select_for_update(), pk=serializer.validated_data['SubjectOffering'])
            title = serializer.validated_data.get('title', f'{source.title[:248]} (Copy)')
            duplicate = copy_quiz(source, target, request.user, title)
        return Response({'id': duplicate.id, 'title': duplicate.title, 'status': duplicate.status}, status=201)
