import os
from django.conf import settings

# Exact feature columns expected by the trained scikit-learn Gradient Boosting pipeline
ML_FEATURE_COLS = [
    'state_level',
    'ww_pct',
    'pt_pct',
    'fa_pct',
    'n_completed',
    'progress_ratio',
    'w_ww',
    'w_pt',
    'w_fa',
    'subject'
]

# Aliased for backward compatibility
FEATURE_NAMES = ML_FEATURE_COLS

FEATURE_LABELS = {
    'state_level': 'Term Forecasting State (1=Early, 2=Mid, 3=Late)',
    'ww_pct': 'Written Works Average (%)',
    'pt_pct': 'Performance Tasks Average (%)',
    'fa_pct': 'Final Assessment / Summative Test Average (%)',
    'n_completed': 'Total Graded Assessments Completed',
    'progress_ratio': 'Curricular Progress Ratio (0.0 - 1.0)',
    'w_ww': 'Written Works Weight',
    'w_pt': 'Performance Tasks Weight',
    'w_fa': 'Final Assessment Weight',
    'subject': 'Curricular Subject Code',
}

MODEL_NAMES = [
    'Baseline',
    'Linear Regression',
    'Random Forest',
    'Gradient Boosting',
]

CHECKPOINTS = ['EARLY', 'MID', 'LATE', 'CURRENT']

# Standard DepEd Order No. 8, s. 2015 Component Weights for Junior High School
SUBJECT_WEIGHTS = {
    'FILIPINO': {'w_ww': 0.20, 'w_pt': 0.50, 'w_fa': 0.30},
    'ENGLISH': {'w_ww': 0.20, 'w_pt': 0.50, 'w_fa': 0.30},
    'MATH': {'w_ww': 0.20, 'w_pt': 0.50, 'w_fa': 0.30},
    'MATHEMATICS': {'w_ww': 0.20, 'w_pt': 0.50, 'w_fa': 0.30},
    'SCIENCE': {'w_ww': 0.20, 'w_pt': 0.50, 'w_fa': 0.30},
    'AP': {'w_ww': 0.20, 'w_pt': 0.50, 'w_fa': 0.30},
    'ARALING PANLIPUNAN': {'w_ww': 0.20, 'w_pt': 0.50, 'w_fa': 0.30},
    'ESP': {'w_ww': 0.20, 'w_pt': 0.50, 'w_fa': 0.30},
    'VALUES': {'w_ww': 0.20, 'w_pt': 0.50, 'w_fa': 0.30},
    'EDUKASYON SA PAGPAPAKATAO': {'w_ww': 0.20, 'w_pt': 0.50, 'w_fa': 0.30},
    'TLE': {'w_ww': 0.20, 'w_pt': 0.60, 'w_fa': 0.20},
    'TECHNOLOGY AND LIVELIHOOD EDUCATION': {'w_ww': 0.20, 'w_pt': 0.60, 'w_fa': 0.20},
    'MAPEH': {'w_ww': 0.20, 'w_pt': 0.60, 'w_fa': 0.20},
    'DEFAULT': {'w_ww': 0.20, 'w_pt': 0.50, 'w_fa': 0.30},
}

def get_subject_weights(subject_name: str) -> dict:
    """Returns the DepEd component weights for a given subject."""
    clean_name = (subject_name or '').strip().upper()
    for key, weights in SUBJECT_WEIGHTS.items():
        if key in clean_name or clean_name in key:
            return weights
    return SUBJECT_WEIGHTS['DEFAULT']

def get_performance_descriptor(grade: float) -> str:
    """
    Returns the official academic performance descriptor:
    - 90.0 - 100.0: Advancing (Outstanding)
    - 85.0 - 89.9: Benchmarking (Very Satisfactory)
    - 80.0 - 84.9: Developing (Satisfactory)
    - 75.0 - 79.9: Connecting (Fairly Satisfactory)
    - Below 75.0: Emerging (Did Not Meet Expectations)
    """
    if grade >= 90.0:
        return 'Advancing'
    elif grade >= 85.0:
        return 'Benchmarking'
    elif grade >= 80.0:
        return 'Developing'
    elif grade >= 75.0:
        return 'Connecting'
    else:
        return 'Emerging'

def get_risk_level(grade: float) -> str:
    """
    Evaluates academic risk based on predicted transmuted grade:
    - < 75.0: HIGH (failing mark warning)
    - 75.0 - 79.9: MEDIUM (borderline passing mark)
    - >= 80.0: LOW (stable mastery)
    """
    if grade < 75.0:
        return 'HIGH'
    elif grade < 80.0:
        return 'MEDIUM'
    else:
        return 'LOW'

# Storage path for serialized model artifacts
MODELS_DIR = os.path.join(settings.BASE_DIR, 'ml_models')
os.makedirs(MODELS_DIR, exist_ok=True)

PRIMARY_MODEL_PATH = os.path.join(MODELS_DIR, 'claroed_grade_forecaster.joblib')
