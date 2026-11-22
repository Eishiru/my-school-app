"""
DepEd Order No. 8, s. 2015 - Grading System Transmutation Table
Policy Guidelines on Classroom Assessment for the K to 12 Basic Education Program.
"""
from typing import Optional


# Official DepEd Transmutation Table (Descending threshold order)
# Format: (min_initial_grade, transmuted_grade)
DEPED_TRANSMUTATION_THRESHOLDS = [
    (100.00, 100),
    (98.40, 99),
    (96.80, 98),
    (95.20, 97),
    (93.60, 96),
    (92.00, 95),
    (90.40, 94),
    (88.80, 93),
    (87.20, 92),
    (85.60, 91),
    (84.00, 90),
    (82.40, 89),
    (80.80, 88),
    (79.20, 87),
    (77.60, 86),
    (76.00, 85),
    (74.40, 84),
    (72.80, 83),
    (71.20, 82),
    (69.60, 81),
    (68.00, 80),
    (66.40, 79),
    (64.80, 78),
    (63.20, 77),
    (61.60, 76),
    (60.00, 75),  # Passing mark
    (56.00, 74),
    (52.00, 73),
    (48.00, 72),
    (44.00, 71),
    (40.00, 70),
    (36.00, 69),
    (32.00, 68),
    (28.00, 67),
    (24.00, 66),
    (20.00, 65),
    (16.00, 64),
    (12.00, 63),
    (8.00, 62),
    (4.00, 61),
    (0.00, 60),
]


def deped_transmute(initial_grade: Optional[float]) -> Optional[int]:
    """
    Converts a raw weighted Initial Grade (0-100%) into an official
    DepEd Transmuted Grade (60-100) per DepEd Order No. 8, s. 2015.
    
    Returns None if initial_grade is None.
    """
    if initial_grade is None:
        return None
    
    try:
        score = round(float(initial_grade), 2)
    except (ValueError, TypeError):
        return None

    if score >= 100.00:
        return 100
    if score < 0.00:
        return 60

    for threshold, transmuted in DEPED_TRANSMUTATION_THRESHOLDS:
        if score >= threshold:
            return transmuted

    return 60


def compute_weighted_score(percentage: float, weight: float) -> float:
    """
    Computes weighted score given a percentage score (0-100) and weight (0-1 or 0-100).
    Returns weighted score rounded to 2 decimal places.
    """
    if percentage is None or weight is None:
        return 0.0
    w = weight if weight <= 1.0 else weight / 100.0
    return round(float(percentage) * w, 2)
