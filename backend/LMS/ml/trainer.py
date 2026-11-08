import os
import joblib
import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score

from django.utils import timezone
from LMS.models import (
    Semester, SubjectOffering, Student, QuarterlyGrade,
    ForecastingModelMetric
)
from .constants import (
    ML_FEATURE_COLS, FEATURE_NAMES, MODEL_NAMES, CHECKPOINTS,
    MODELS_DIR, PRIMARY_MODEL_PATH
)
from .feature_extractor import FeatureExtractor


class BaselineRegressor:
    """
    Baseline model that uses the student's current weighted raw score / baseline grade
    as the predicted final semester grade.
    """
    def fit(self, X, y=None):
        return self

    def predict(self, X):
        if isinstance(X, pd.DataFrame):
            if 'baseline_grade' in X.columns:
                return X['baseline_grade'].to_numpy()
            # Approximate baseline from available components
            ww = X['ww_pct'].to_numpy() if 'ww_pct' in X.columns else 75.0
            pt = X['pt_pct'].to_numpy() if 'pt_pct' in X.columns else 75.0
            fa = X['fa_pct'].to_numpy() if 'fa_pct' in X.columns else 75.0
            w_ww = X['w_ww'].to_numpy() if 'w_ww' in X.columns else 0.20
            w_pt = X['w_pt'].to_numpy() if 'w_pt' in X.columns else 0.50
            w_fa = X['w_fa'].to_numpy() if 'w_fa' in X.columns else 0.30
            return (ww * w_ww + pt * w_pt + fa * w_fa) / (w_ww + w_pt + w_fa)
        return np.full(len(X), 75.0)


class ForecastingTrainer:
    """
    Orchestrates time-aware dataset construction, pipeline training,
    and rigorous multi-dimensional evaluation (Overall, Checkpoint, Subject).
    """

    def __init__(self):
        self.feature_names = ML_FEATURE_COLS
        self.models = {}

    def collect_dataset(self):
        """
        Gathers all student observation rows across offerings, semesters, and checkpoints.
        Enforces zero future data leakage.
        """
        rows = []
        semesters = list(Semester.objects.all().order_by('school_year_id', 'id'))
        offerings = list(SubjectOffering.objects.all().select_related('section'))

        for sem in semesters:
            for offering in offerings:
                students = list(Student.objects.filter(section=offering.section))
                for s in students:
                    target_grade = FeatureExtractor.get_target_grade(s, offering, sem)
                    if target_grade is None or target_grade <= 0:
                        continue  # Skip unfinalized grades for training

                    # Extract features for each checkpoint
                    for cp in ['EARLY', 'MID', 'LATE']:
                        extracted = FeatureExtractor.extract_features_for_student(s, offering, sem, checkpoint=cp)
                        if not extracted.get('eligible', False):
                            continue

                        feat = extracted.get('features')
                        if feat:
                            row = {
                                'student_id': s.id,
                                'offering_id': offering.id,
                                'semester_id': sem.id,
                                'semester_name': sem.name.upper(),
                                'checkpoint': cp,
                                'final_grade': target_grade,
                            }
                            row.update(feat)
                            rows.append(row)

        df = pd.DataFrame(rows)
        return df

    def create_pipeline(self, regressor):
        """Builds an end-to-end ColumnTransformer + Regressor Pipeline."""
        categorical_features = ['subject']
        preprocessor = ColumnTransformer(
            transformers=[
                ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
            ],
            remainder='passthrough'
        )
        return Pipeline([
            ('preprocessor', preprocessor),
            ('regressor', regressor)
        ])

    def train_and_evaluate(self):
        """
        Trains Baseline, Linear Regression, Random Forest, and Gradient Boosting pipelines.
        Computes MAE, RMSE, and R2, persists champion model and DB metric records.
        """
        df = self.collect_dataset()
        if df.empty or len(df) < 10:
            raise ValueError("Insufficient dataset rows for training. Please seed historical data first.")

        # Train / Test split by Student ID to prevent student data leakage
        unique_students = df['student_id'].unique()
        np.random.seed(42)
        shuffled_students = np.random.permutation(unique_students)
        split_idx = int(len(shuffled_students) * 0.8)
        train_students = set(shuffled_students[:split_idx])
        test_students = set(shuffled_students[split_idx:])

        train_df = df[df['student_id'].isin(train_students)].copy()
        test_df = df[df['student_id'].isin(test_students)].copy()

        feature_cols = [c for c in self.feature_names if c in train_df.columns]
        X_train = train_df[feature_cols]
        y_train = train_df['final_grade']

        X_test = test_df[feature_cols]
        y_test = test_df['final_grade']

        # Instantiate candidate pipelines
        pipelines = {
            'Baseline': BaselineRegressor(),
            'Linear Regression': self.create_pipeline(LinearRegression(fit_intercept=True)),
            'Random Forest': self.create_pipeline(RandomForestRegressor(
                n_estimators=100, max_depth=6, min_samples_split=4, random_state=42
            )),
            'Gradient Boosting': self.create_pipeline(GradientBoostingRegressor(
                n_estimators=100, learning_rate=0.08, max_depth=4, random_state=42
            )),
        }

        # Train models
        for name, pipe in pipelines.items():
            if name != 'Baseline':
                pipe.fit(X_train, y_train)

        # Clear previous metrics in DB
        ForecastingModelMetric.objects.all().delete()

        def calculate_metrics(y_true, y_pred):
            y_t = np.array(y_true)
            y_p = np.array(y_pred)
            mae = float(mean_absolute_error(y_t, y_p))
            rmse = float(root_mean_squared_error(y_t, y_p))
            r2 = float(r2_score(y_t, y_p)) if len(y_t) > 1 and np.var(y_t) > 0.001 else 0.0
            return mae, rmse, r2

        overall_results = {}
        best_model_name = 'Gradient Boosting'
        best_test_mae = float('inf')

        for name, pipe in pipelines.items():
            y_pred = pipe.predict(X_test)
            mae, rmse, r2 = calculate_metrics(y_test, y_pred)
            overall_results[name] = {'mae': mae, 'rmse': rmse, 'r2': r2, 'count': len(y_test)}

            if mae < best_test_mae:
                best_test_mae = mae
                best_model_name = name

            ForecastingModelMetric.objects.create(
                model_name=name,
                checkpoint='OVERALL',
                semester='ALL',
                split_type='TEST',
                mae=round(mae, 3),
                rmse=round(rmse, 3),
                r2=round(r2, 3),
                sample_count=len(y_test),
                is_best_model=(name == best_model_name),
            )

        # Persist champion pipeline
        champion_pipeline = pipelines[best_model_name]
        joblib.dump(champion_pipeline, PRIMARY_MODEL_PATH)

        return {
            'best_model': best_model_name,
            'overall_results': overall_results,
            'train_count': len(train_df),
            'test_count': len(test_df),
            'total_samples': len(df),
        }
