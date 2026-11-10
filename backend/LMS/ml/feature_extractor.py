import numpy as np
import pandas as pd
from django.db.models import Avg, Count
from LMS.models import Quiz, QuizAttempt, QuizAnswer, QuarterlyGrade, Semester, SubjectOffering, Student
from .constants import (
    ML_FEATURE_COLS, FEATURE_NAMES,
    get_subject_weights, get_performance_descriptor, get_risk_level
)


class FeatureExtractor:
    """
    Extracts educational performance feature vectors for machine learning models
    aligned with DepEd Order No. 8, s. 2015 and Claro M. Recto High School standards.
    
    Enforces the Minimum Eligibility Rule:
    - Requires at least 1 graded Written Work (WW), 1 Performance Task (PT),
      and 1 Final Assessment / Summative Test (FA/ST) before forecasting activates.
    """

    @classmethod
    def normalize_subject_code(cls, subject_name: str) -> str:
        """Normalizes school subject names into the 7 standard DepEd Junior High categories."""
        name = (subject_name or '').strip().upper()
        if 'MATH' in name:
            return 'MATH'
        elif 'SCI' in name:
            return 'SCIENCE'
        elif 'ENG' in name:
            return 'ENGLISH'
        elif 'FIL' in name:
            return 'FILIPINO'
        elif 'AP' in name or 'ARALIN' in name or 'PANLIPUNAN' in name:
            return 'AP'
        elif 'VAL' in name or 'ESP' in name or 'EDUKASYON SA PAGPAPAKATAO' in name:
            return 'VALUES'
        elif 'TLE' in name or 'TECH' in name or 'LIVELIHOOD' in name or 'TVL' in name or 'COMPUTER' in name:
            return 'TLE'
        elif 'MAPEH' in name or 'PE' in name or 'MUSIC' in name or 'ART' in name or 'HEALTH' in name:
            return 'TLE'  # Shares 20-60-20 weight profile
        return 'MATH'  # Fallback default

    @classmethod
    def get_student_attempts(cls, student, offering, semester=None, checkpoint='CURRENT'):
        """
        Retrieves graded attempts for the student, enforcing strict temporal eligibility.
        """
        quiz_filter = {'SubjectOffering': offering}
        if semester:
            quiz_filter['semester'] = semester

        all_quizzes = list(Quiz.objects.filter(**quiz_filter).order_by('created_at', 'id'))
        if not all_quizzes:
            return [], []

        # Checkpoint temporal filtering if checkpoint is not CURRENT
        if checkpoint == 'EARLY':
            cutoff = max(1, int(round(len(all_quizzes) * 0.40)))
            allowed_quizzes = all_quizzes[:cutoff]
        elif checkpoint == 'MID':
            cutoff = max(1, int(round(len(all_quizzes) * 0.70)))
            allowed_quizzes = all_quizzes[:cutoff]
        elif checkpoint == 'LATE':
            cutoff = max(1, int(round(len(all_quizzes) * 0.90)))
            allowed_quizzes = all_quizzes[:cutoff]
        else:
            allowed_quizzes = all_quizzes

        attempts = list(QuizAttempt.objects.filter(
            student=student,
            quiz__in=allowed_quizzes,
            status__in=['SUBMITTED', 'GRADED']
        ).select_related('quiz').order_by('submitted_at', 'id'))

        return allowed_quizzes, attempts

    @classmethod
    def check_eligibility(cls, student, offering, semester=None, checkpoint='CURRENT'):
        """
        Checks if student satisfies the minimum assessment barrier:
        >= 1 Written Work (WW), >= 1 Performance Task (PT), >= 1 Summative Assessment/Exam (FA).
        """
        allowed_quizzes, attempts = cls.get_student_attempts(student, offering, semester, checkpoint)

        # Map best score per quiz
        ww_count = 0
        pt_count = 0
        fa_count = 0

        attempted_quiz_ids = set()
        for att in attempts:
            q = att.quiz
            if q.id not in attempted_quiz_ids:
                attempted_quiz_ids.add(q.id)
                if q.grade_type == 'WRITTEN_WORK':
                    ww_count += 1
                elif q.grade_type == 'PERFORMANCE_TASK':
                    pt_count += 1
                elif q.grade_type == 'FINAL_EXAM':
                    fa_count += 1

        missing = []
        if ww_count < 1:
            missing.append('Written Works (WW)')
        if pt_count < 1:
            missing.append('Performance Tasks (PT)')
        if fa_count < 1:
            missing.append('Summative Assessment / Exam (FA)')

        is_eligible = (ww_count >= 1 and pt_count >= 1 and fa_count >= 1)

        return {
            'eligible': is_eligible,
            'ww_count': ww_count,
            'pt_count': pt_count,
            'fa_count': fa_count,
            'total_completed': len(attempted_quiz_ids),
            'missing_components': missing,
            'reason': (
                f"Requires at least 1 graded assessment in Written Works, 1 in Performance Tasks, "
                f"and 1 in Summative Assessment/Exam. Currently missing: {', '.join(missing)}."
            ) if not is_eligible else "Eligible for forecasting."
        }

    @classmethod
    def extract_features_for_student(cls, student, offering, semester=None, checkpoint='CURRENT'):
        """
        Extracts the 10-dimensional input feature vector for a student.
        Returns a dict containing eligibility status, feature vector, and diagnostic details.
        """
        eligibility = cls.check_eligibility(student, offering, semester, checkpoint)
        allowed_quizzes, attempts = cls.get_student_attempts(student, offering, semester, checkpoint)

        # Derive subject weights
        weights = get_subject_weights(offering.name)
        w_ww = weights['w_ww']
        w_pt = weights['w_pt']
        w_fa = weights['w_fa']
        subject_code = cls.normalize_subject_code(offering.name)

        if not attempts:
            return {
                'eligible': False,
                'eligibility': eligibility,
                'features': None,
                'current_average': 0.0,
                'quiz_count': 0,
                'strong_topics': [],
                'weak_topics': [],
            }

        # Calculate scores per quiz (best percentage)
        quiz_scores = {}
        topic_stats = {}

        for att in attempts:
            q = att.quiz
            pct = (att.score / q.total_points * 100.0) if q.total_points > 0 else 0.0
            pct = min(100.0, max(0.0, pct))

            if q.id not in quiz_scores or pct > quiz_scores[q.id]['pct']:
                quiz_scores[q.id] = {
                    'pct': pct,
                    'grade_type': q.grade_type,
                    'title': q.title,
                    'score': att.score,
                    'total': q.total_points,
                }

        # Topic aggregation from question answers if available
        answers = QuizAnswer.objects.filter(
            attempt__in=attempts,
            question__question_type__in=['MULTIPLE_CHOICE', 'TRUE_FALSE']
        ).select_related('question__quiz')

        for ans in answers:
            topic = ans.question.quiz.title
            if topic not in topic_stats:
                topic_stats[topic] = {'correct': 0, 'total': 0}
            topic_stats[topic]['total'] += 1
            if ans.is_correct:
                topic_stats[topic]['correct'] += 1

        # Fallback to quiz titles if no question answers recorded
        if not topic_stats:
            for q_id, q_data in quiz_scores.items():
                topic = q_data['title']
                topic_stats[topic] = {
                    'correct': q_data['pct'],
                    'total': 100.0
                }

        # Compute component averages
        ww_scores = [d['pct'] for d in quiz_scores.values() if d['grade_type'] == 'WRITTEN_WORK']
        pt_scores = [d['pct'] for d in quiz_scores.values() if d['grade_type'] == 'PERFORMANCE_TASK']
        fa_scores = [d['pct'] for d in quiz_scores.values() if d['grade_type'] == 'FINAL_EXAM']

        ww_pct = float(np.mean(ww_scores)) if ww_scores else 75.0
        pt_pct = float(np.mean(pt_scores)) if pt_scores else 75.0
        fa_pct = float(np.mean(fa_scores)) if fa_scores else 75.0

        n_completed = len(quiz_scores)
        # Standard DepEd term assessment blueprint: 10 planned assessments (5 WW, 3 PT, 2 ST/TE)
        total_expected = max(10, len(allowed_quizzes))
        progress_ratio = round(min(1.0, max(0.1, n_completed / total_expected)), 2)

        # Assign state level
        if progress_ratio <= 0.50:
            state_level = 1
        elif progress_ratio <= 0.80:
            state_level = 2
        else:
            state_level = 3

        # Compute Baseline Grade (weighted average of observed components)
        active_weight = 0.0
        weighted_sum = 0.0
        if ww_scores:
            weighted_sum += ww_pct * w_ww
            active_weight += w_ww
        if pt_scores:
            weighted_sum += pt_pct * w_pt
            active_weight += w_pt
        if fa_scores:
            weighted_sum += fa_pct * w_fa
            active_weight += w_fa

        baseline_grade = round(weighted_sum / active_weight, 1) if active_weight > 0 else 75.0

        # Build ML Feature Dictionary
        features = {
            'state_level': state_level,
            'ww_pct': round(ww_pct, 1),
            'pt_pct': round(pt_pct, 1),
            'fa_pct': round(fa_pct, 1),
            'n_completed': n_completed,
            'progress_ratio': progress_ratio,
            'w_ww': w_ww,
            'w_pt': w_pt,
            'w_fa': w_fa,
            'subject': subject_code,
        }

        # Identify Strong and Weak Topics
        topic_accuracies = []
        for topic, stat in topic_stats.items():
            acc = (stat['correct'] / stat['total'] * 100.0) if stat['total'] > 0 else 0.0
            topic_accuracies.append((topic, acc))

        topic_accuracies.sort(key=lambda x: x[1], reverse=True)
        strong_topics = [f"{t} ({acc:.0f}%)" for t, acc in topic_accuracies if acc >= 80.0][:3]
        weak_topics = [f"{t} ({acc:.0f}%)" for t, acc in reversed(topic_accuracies) if acc < 75.0][:3]

        return {
            'eligible': eligibility['eligible'],
            'eligibility': eligibility,
            'features': features,
            'baseline_grade': baseline_grade,
            'current_average': baseline_grade,
            'quiz_count': n_completed,
            'strong_topics': strong_topics,
            'weak_topics': weak_topics,
            'topic_accuracies': topic_accuracies,
            'state_level': state_level,
        }

    @classmethod
    def get_target_grade(cls, student, offering, semester=None):
        """
        Retrieves ground-truth transmuted final grade from QuarterlyGrade if finalized.
        """
        query = {'student': student, 'SubjectOffering': offering}
        if semester:
            query['semester'] = semester

        grade_record = QuarterlyGrade.objects.filter(**query).first()
        if grade_record and grade_record.final_grade > 0:
            return float(grade_record.final_grade)
        return None
