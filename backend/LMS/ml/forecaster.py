import os
import joblib
import numpy as np
import pandas as pd
from django.utils import timezone
from LMS.models import (
    Student, SubjectOffering, Semester, GradeForecast,
    ForecastingModelMetric
)
from .constants import (
    ML_FEATURE_COLS, PRIMARY_MODEL_PATH, MODELS_DIR,
    get_performance_descriptor, get_risk_level
)
from .feature_extractor import FeatureExtractor


class GradeForecaster:
    """
    Inference service for generating AI-assisted final semester grade forecasts.
    Powered by an empirical Gradient Boosting Regressor trained on real DepEd grade sheet data.
    """

    def __init__(self):
        self.feature_cols = ML_FEATURE_COLS
        self.model = None
        self.model_name = 'Gradient Boosting'
        self._load_model()

    def _load_model(self):
        """Loads serialized trained pipeline from disk."""
        target_path = PRIMARY_MODEL_PATH
        fallback_path = os.path.join(MODELS_DIR, 'claroed_grade_forecaster.joblib')

        load_path = None
        if os.path.exists(target_path):
            load_path = target_path
        elif os.path.exists(fallback_path):
            load_path = fallback_path

        if load_path:
            try:
                self.model = joblib.load(load_path)
            except Exception as e:
                print(f"[GradeForecaster] Warning: Failed to load model from {load_path}: {e}")
                self.model = None
        else:
            print(f"[GradeForecaster] Warning: Model artifact not found at {target_path}.")
            self.model = None

    def generate_recommendations(self, features: dict, trend: str, weak_topics: list, predicted_grade: float) -> str:
        """Constructs concrete pedagogical recommendations based on component gaps and trends."""
        recs = []
        ww = features.get('ww_pct', 75.0)
        pt = features.get('pt_pct', 75.0)
        fa = features.get('fa_pct', 75.0)

        # Component-specific targeted interventions
        if ww < 75.0:
            recs.append("Needs reinforcement in Written Works and conceptual quizzes. Review module practice sheets.")
        if pt < 75.0:
            recs.append("Performance Tasks require attention; focus on rubric compliance and hands-on milestones.")
        if fa < 75.0:
            recs.append("Summative test scores are low. Practice sample test items and exam review drills.")

        # Weak topics
        if weak_topics:
            topics_clean = [t.split('(')[0].strip() for t in weak_topics[:2]]
            recs.append(f"Focus remediation on challenging topic areas: {', '.join(topics_clean)}.")

        # Trend and overall trajectory
        if trend == 'DECLINING':
            recs.append("Recent performance shows a downward trend. Schedule a teacher consultation to recover points.")
        elif trend == 'IMPROVING':
            recs.append("Positive trajectory detected; maintain current study habits and submission consistency.")

        if predicted_grade >= 90.0:
            recs.append("Student is performing at an Advanced level; encourage participation in enrichment activities.")
        elif not recs:
            recs.append("Consistent submission pace observed. Maintain steady effort across all components.")

        return " ".join(recs)

    def predict_for_student(self, student: Student, offering: SubjectOffering, semester=None, checkpoint='CURRENT'):
        """
        Generates and persists an AI grade forecast for a single student.
        Enforces minimum eligibility barrier (>=1 WW, >=1 PT, >=1 FA).
        """
        extracted = FeatureExtractor.extract_features_for_student(
            student=student,
            offering=offering,
            semester=semester,
            checkpoint=checkpoint
        )

        is_eligible = extracted.get('eligible', False)
        baseline_grade = extracted.get('baseline_grade', 75.0)
        strong_topics = extracted.get('strong_topics', [])
        weak_topics = extracted.get('weak_topics', [])
        quiz_count = extracted.get('quiz_count', 0)

        if not is_eligible:
            eligibility_info = extracted.get('eligibility', {})
            reason = eligibility_info.get('reason', 'Minimum assessment criteria not yet met.')
            risk_level = get_risk_level(baseline_grade)
            descriptor = get_performance_descriptor(baseline_grade)

            return {
                'eligible': False,
                'status': 'INELIGIBLE',
                'student_id': student.id,
                'student_name': f"{student.user.first_name} {student.user.last_name}".strip() or student.user.username,
                'subject_id': offering.id,
                'subject_name': offering.name,
                'checkpoint': checkpoint,
                'model_name': self.model_name,
                'predicted_grade': round(baseline_grade, 1),
                'baseline_grade': round(baseline_grade, 1),
                'confidence_score': 0.30,
                'risk_level': risk_level,
                'performance_trend': 'STABLE',
                'performance_descriptor': descriptor,
                'features': extracted.get('features') or {},
                'strong_topics': strong_topics,
                'weak_topics': weak_topics,
                'recommendations': reason,
                'reason': reason,
                'eligibility': eligibility_info,
            }

        # Student is eligible - run model inference
        features = extracted['features']
        input_df = pd.DataFrame([features])

        if self.model is not None:
            try:
                raw_pred = float(self.model.predict(input_df)[0])
                predicted_grade = round(float(np.clip(raw_pred, 60.0, 100.0)), 1)
            except Exception as e:
                print(f"[GradeForecaster] Inference error: {e}. Falling back to baseline.")
                predicted_grade = baseline_grade
        else:
            predicted_grade = baseline_grade

        # Determine Trend
        diff = predicted_grade - baseline_grade
        if diff > 0.5:
            trend = 'IMPROVING'
        elif diff < -0.5:
            trend = 'DECLINING'
        else:
            trend = 'STABLE'

        descriptor = get_performance_descriptor(predicted_grade)
        risk_level = get_risk_level(predicted_grade)

        # Confidence based on state and progress
        state_level = features.get('state_level', 1)
        if state_level == 1:
            confidence = 0.70
        elif state_level == 2:
            confidence = 0.85
        else:
            confidence = 0.95

        recommendations = self.generate_recommendations(features, trend, weak_topics, predicted_grade)

        # Actual grade comparison if finalized
        actual_grade = FeatureExtractor.get_target_grade(student, offering, semester)
        error = round(actual_grade - predicted_grade, 2) if actual_grade is not None else None

        # Build model comparisons for defense inspection
        model_comparisons = {
            'Baseline': round(baseline_grade, 1),
            'Gradient Boosting': round(predicted_grade, 1),
        }

        # Persist to database
        forecast_obj, _ = GradeForecast.objects.update_or_create(
            student=student,
            SubjectOffering=offering,
            checkpoint=checkpoint,
            defaults={
                'semester': semester,
                'current_average': baseline_grade,
                'quiz_count': quiz_count,
                'model_name': self.model_name,
                'predicted_grade': predicted_grade,
                'baseline_grade': baseline_grade,
                'confidence_score': confidence,
                'risk_level': risk_level,
                'performance_trend': trend,
                'features': features,
                'model_comparisons': model_comparisons,
                'actual_grade': actual_grade,
                'error': error,
                'recommendations': recommendations,
                'strong_topics': strong_topics,
                'weak_topics': weak_topics,
            }
        )

        return {
            'id': forecast_obj.id,
            'eligible': True,
            'status': 'FORECAST_READY',
            'student_id': student.id,
            'student_name': f"{student.user.first_name} {student.user.last_name}".strip() or student.user.username,
            'subject_id': offering.id,
            'subject_name': offering.name,
            'checkpoint': checkpoint,
            'model_name': self.model_name,
            'predicted_grade': predicted_grade,
            'baseline_grade': baseline_grade,
            'confidence_score': confidence,
            'risk_level': risk_level,
            'performance_trend': trend,
            'performance_descriptor': descriptor,
            'features': features,
            'model_comparisons': model_comparisons,
            'actual_grade': actual_grade,
            'error': error,
            'strong_topics': strong_topics,
            'weak_topics': weak_topics,
            'recommendations': recommendations,
            'generated_at': forecast_obj.updated_at.isoformat(),
        }

    def predict_for_offering(self, offering_id: int, semester=None, checkpoint='CURRENT'):
        """
        Batch predictions for all students enrolled in a SubjectOffering.
        Returns a sorted list of student forecast summaries for teachers.
        """
        offering = SubjectOffering.objects.select_related('section').get(id=offering_id)
        students = Student.objects.filter(section=offering.section).select_related('user')

        results = []
        for s in students:
            res = self.predict_for_student(s, offering, semester=semester, checkpoint=checkpoint)
            results.append(res)

        # Sort: Ineligible/High risk first, then lowest predicted grade
        risk_priority = {'HIGH': 0, 'MEDIUM': 1, 'LOW': 2}
        results.sort(key=lambda r: (
            0 if not r.get('eligible', True) else 1,
            risk_priority.get(r['risk_level'], 3),
            r['predicted_grade']
        ))

        return results
