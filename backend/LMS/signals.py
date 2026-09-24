from django.db.models.signals import post_delete
from django.dispatch import receiver
from django.db import models
from .models import Quiz, Student, SubjectOffering, QuarterlyGrade


@receiver(post_delete, sender=Quiz)
def on_quiz_post_delete(sender, instance, **kwargs):
    """
    Ensure student QuarterlyGrade components and final grades recalculate
    whenever a Quiz is deleted from anywhere (viewsets, admin, shell, cascade, etc.)
    """
    offering_id = getattr(instance, 'SubjectOffering_id', None)
    semester = getattr(instance, 'semester', None)
    grade_type = getattr(instance, 'grade_type', None)

    if not offering_id or not semester or not grade_type:
        return

    try:
        offering = SubjectOffering.objects.select_related('section').get(id=offering_id)
    except SubjectOffering.DoesNotExist:
        return

    # Find all enrolled students or students with existing grades in this offering
    student_ids = set(
        Student.objects.filter(section=offering.section).values_list('id', flat=True)
    )
    grade_student_ids = set(
        QuarterlyGrade.objects.filter(SubjectOffering_id=offering_id, semester=semester).values_list('student_id', flat=True)
    )
    all_student_ids = student_ids | grade_student_ids

    # Import locally to prevent circular imports
    from .views import recalc_quarterly_component

    for s_id in all_student_ids:
        try:
            student = Student.objects.get(id=s_id)
            recalc_quarterly_component(
                student=student,
                offering=offering,
                semester=semester,
                grade_type=grade_type,
            )
        except Student.DoesNotExist:
            pass
