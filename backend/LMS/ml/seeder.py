import random
from datetime import timedelta
from django.utils import timezone
from LMS.models import (
    SchoolYear, Semester, Student, SubjectOffering,
    Quiz, QuizQuestion, QuizChoice, QuizAttempt, QuarterlyGrade
)


def seed_historical_forecasting_data(verbose=True):
    """
    Seeds rich, realistic academic performance data across SEM1, SEM2, and SEM3
    for all enrolled sections and students.
    
    Creates:
    - Standardized activities (Written Works, Performance Tasks, Final Exam) per semester.
    - Realistic student attempts with latent ability models (high achievers, steady average,
      improvers, declining, and at-risk students with missing assignments).
    - Accurate component totals and finalized QuarterlyGrade targets.
    
    This provides the necessary historical ground-truth for time-aware
    train (SEM1) -> validation (SEM2) -> test (SEM3) evaluation.
    """
    school_year = SchoolYear.objects.filter(is_active=True).first() or SchoolYear.objects.first()
    if not school_year:
        school_year = SchoolYear.objects.create(year_label="2026-2027", is_active=True)

    semesters = {}
    for sem_name in ['SEM1', 'SEM2', 'SEM3']:
        sem, _ = Semester.objects.get_or_create(school_year=school_year, name=sem_name)
        semesters[sem_name] = sem

    from LMS.models import Section, Teacher

    sections = list(Section.objects.all())
    teachers = list(Teacher.objects.all().select_related('user'))
    default_teacher = teachers[0].user if teachers else None

    # Ensure sections with enrolled students have an active SubjectOffering
    for sec in sections:
        student_count = Student.objects.filter(section=sec).count()
        if student_count > 0 and not SubjectOffering.objects.filter(section=sec).exists():
            SubjectOffering.objects.create(
                name="Mathematics",
                section=sec,
                teacher=default_teacher,
                room_number="Room 201",
                schedule="MWF 9:00 - 10:00 AM"
            )

    offerings = SubjectOffering.objects.all().select_related('section', 'teacher')
    if not offerings.exists():
        if verbose:
            print("No SubjectOfferings found to seed.")
        return

    random.seed(42)  # For deterministic, reproducible evaluation benchmarks

    # Define standard activity blueprints for each semester
    activity_templates = [
        {'title': 'Activity 1: Fundamentals Quiz', 'grade_type': 'WRITTEN_WORK', 'points': 25, 'days': 7},
        {'title': 'Task 1: Practical Skills Demo', 'grade_type': 'PERFORMANCE_TASK', 'points': 40, 'days': 15},
        {'title': 'Activity 2: Concept Check', 'grade_type': 'WRITTEN_WORK', 'points': 25, 'days': 24},
        {'title': 'Task 2: Project Milestone', 'grade_type': 'PERFORMANCE_TASK', 'points': 50, 'days': 35},
        {'title': 'Activity 3: Midterm Exercises', 'grade_type': 'WRITTEN_WORK', 'points': 30, 'days': 48},
        {'title': 'Task 3: Group Presentation', 'grade_type': 'PERFORMANCE_TASK', 'points': 50, 'days': 60},
        {'title': 'Activity 4: Mastery Review', 'grade_type': 'WRITTEN_WORK', 'points': 30, 'days': 72},
        {'title': 'Final Examination', 'grade_type': 'FINAL_EXAM', 'points': 60, 'days': 85},
    ]

    base_time = timezone.now() - timedelta(days=270)

    # Assign student latent profiles
    students = list(Student.objects.all().select_related('user', 'section'))
    student_profiles = {}
    for s in students:
        # Base ability mean between 68 and 95
        roll = random.random()
        if roll < 0.20:
            # High achiever (88 - 97)
            base_ability = random.uniform(88, 97)
            profile_type = 'high'
        elif roll < 0.65:
            # Solid average (78 - 87)
            base_ability = random.uniform(78, 87)
            profile_type = 'average'
        elif roll < 0.85:
            # Improver (starts 72, rises)
            base_ability = random.uniform(72, 79)
            profile_type = 'improver'
        else:
            # At risk / struggling (65 - 74, higher missing rate)
            base_ability = random.uniform(65, 74)
            profile_type = 'at_risk'

        student_profiles[s.id] = {
            'ability': base_ability,
            'type': profile_type,
            'consistency': random.uniform(2.0, 5.0),
        }

    sem_order = [('SEM1', 0), ('SEM2', 90), ('SEM3', 180)]

    total_attempts_created = 0
    total_grades_created = 0

    for offering in offerings:
        offering_students = [s for s in students if s.section_id == offering.section_id]
        if not offering_students:
            continue

        for sem_name, sem_day_offset in sem_order:
            sem = semesters[sem_name]
            sem_start = base_time + timedelta(days=sem_day_offset)

            created_quizzes = []
            for tmpl in activity_templates:
                quiz_title = f"{sem_name} - {offering.name}: {tmpl['title']}"
                open_date = sem_start + timedelta(days=tmpl['days'])
                close_date = open_date + timedelta(days=7)

                quiz, _ = Quiz.objects.get_or_create(
                    SubjectOffering=offering,
                    semester=sem,
                    title=quiz_title,
                    defaults={
                        'grade_type': tmpl['grade_type'],
                        'total_points': float(tmpl['points']),
                        'open_time': open_date,
                        'close_time': close_date,
                        'status': 'CLOSED',
                        'teacher': offering.teacher,
                        'time_limit': 45,
                    }
                )
                created_quizzes.append((quiz, tmpl))

            # Simulate attempts and compute final grades for each student
            for student in offering_students:
                prof = student_profiles.get(student.id, {'ability': 80.0, 'type': 'average', 'consistency': 3.0})
                ability = prof['ability']

                # Trend modification across semesters
                if prof['type'] == 'improver':
                    if sem_name == 'SEM2':
                        ability += 4.0
                    elif sem_name == 'SEM3':
                        ability += 8.0
                elif prof['type'] == 'at_risk':
                    if sem_name == 'SEM2':
                        ability -= 2.0
                    elif sem_name == 'SEM3':
                        ability -= 3.0

                ability = max(55.0, min(99.0, ability))

                ww_scores, ww_totals = 0.0, 0.0
                pt_scores, pt_totals = 0.0, 0.0
                qa_scores, qa_totals = 0.0, 0.0

                for quiz, tmpl in created_quizzes:
                    q_points = tmpl['points']
                    g_type = tmpl['grade_type']

                    # Determine if student misses activity
                    miss_prob = 0.02 if prof['type'] == 'high' else 0.06 if prof['type'] == 'average' else 0.22 if prof['type'] == 'at_risk' else 0.05
                    # Final exams are rarely missed
                    if g_type == 'FINAL_EXAM':
                        miss_prob *= 0.2

                    is_missing = random.random() < miss_prob

                    if g_type == 'WRITTEN_WORK':
                        ww_totals += q_points
                    elif g_type == 'PERFORMANCE_TASK':
                        pt_totals += q_points
                    elif g_type == 'FINAL_EXAM':
                        qa_totals += q_points

                    if not is_missing:
                        # Score around student ability with noise
                        noise = random.gauss(0, prof['consistency'])
                        pct = max(45.0, min(100.0, ability + noise))
                        earned_points = round((pct / 100.0) * q_points, 1)

                        if g_type == 'WRITTEN_WORK':
                            ww_scores += earned_points
                        elif g_type == 'PERFORMANCE_TASK':
                            pt_scores += earned_points
                        elif g_type == 'FINAL_EXAM':
                            qa_scores += earned_points

                        # Create or update QuizAttempt
                        att_time = quiz.open_time + timedelta(hours=random.randint(6, 48))
                        time_spent = random.randint(480, 2400)

                        QuizAttempt.objects.update_or_create(
                            quiz=quiz,
                            student=student,
                            defaults={
                                'score': earned_points,
                                'status': 'GRADED',
                                'time_spent': time_spent,
                                'started_at': att_time,
                                'submitted_at': att_time + timedelta(seconds=time_spent),
                            }
                        )
                        total_attempts_created += 1

                # Calculate final quarterly/semester grade (DepEd Order No. 8, s. 2015)
                from LMS.grading_utils import deped_transmute
                ww_pct = (ww_scores / ww_totals * 100.0) if ww_totals > 0 else 0.0
                pt_pct = (pt_scores / pt_totals * 100.0) if pt_totals > 0 else 0.0
                qa_pct = (qa_scores / qa_totals * 100.0) if qa_totals > 0 else 0.0

                initial_grade = round((ww_pct * 0.40) + (pt_pct * 0.40) + (qa_pct * 0.20), 2)
                transmuted_grade = float(deped_transmute(initial_grade) or 60.0)

                QuarterlyGrade.objects.update_or_create(
                    student=student,
                    SubjectOffering=offering,
                    semester=sem,
                    defaults={
                        'written_work_score': ww_scores,
                        'written_work_total': ww_totals if ww_totals > 0 else 100.0,
                        'performance_task_score': pt_scores,
                        'performance_task_total': pt_totals if pt_totals > 0 else 100.0,
                        'quarterly_assessment_score': qa_scores,
                        'quarterly_assessment_total': qa_totals if qa_totals > 0 else 100.0,
                        'ww_weight': 0.40,
                        'pt_weight': 0.40,
                        'qa_weight': 0.20,
                        'initial_grade': initial_grade,
                        'transmuted_grade': transmuted_grade,
                        'final_grade': transmuted_grade,
                    }
                )
                total_grades_created += 1

    if verbose:
        print(f"Seeding Complete: Created/Updated {total_attempts_created} quiz attempts and {total_grades_created} quarterly grades across SEM1, SEM2, SEM3.")
    return total_grades_created
