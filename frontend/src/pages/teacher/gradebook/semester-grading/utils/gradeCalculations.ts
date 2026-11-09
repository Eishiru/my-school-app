import type {
  ActivityItem,
  GradingMetrics,
  GradeStatus,
} from "../types/gradingSheetTypes";

/**
 * Converts decimal weight (e.g. 0.40) to percentage (e.g. 40)
 */
export function decimalToPercent(value?: number | null): number {
  if (value === undefined || value === null) return 40;
  return Math.round(Number(value) * 100);
}

/**
 * Converts percentage weight (e.g. 40) to decimal (e.g. 0.40)
 */
export function percentToDecimal(value: number): number {
  return Number((value / 100).toFixed(4));
}

/**
 * Calculates percentage from earned score and total possible points
 */
export function calculatePercentage(
  earned: number | null | undefined,
  total: number | null | undefined
): number {
  const safeEarned = Number(earned ?? 0);
  const safeTotal = Number(total ?? 0);

  if (!Number.isFinite(safeTotal) || safeTotal <= 0) {
    return 0;
  }

  return Number(((safeEarned / safeTotal) * 100).toFixed(2));
}

/**
 * Sums individual activity scores for a category and computes total percentage
 */
export function calculateCategoryTotals(
  activityScores: Record<number, number | null>,
  activities: ActivityItem[]
): { earned: number; total: number; pct: number } {
  if (!activities || activities.length === 0) {
    return { earned: 0, total: 0, pct: 0 };
  }

  let earnedSum = 0;
  let totalSum = 0;

  for (const act of activities) {
    const score = activityScores[act.id];
    if (score !== undefined && score !== null && Number.isFinite(score)) {
      earnedSum += Number(score);
    }
    const maxPoints = Number(act.total_points ?? 0);
    if (Number.isFinite(maxPoints) && maxPoints > 0) {
      totalSum += maxPoints;
    }
  }

  const pct = totalSum > 0 ? Number(((earnedSum / totalSum) * 100).toFixed(2)) : 0;

  return {
    earned: Number(earnedSum.toFixed(2)),
    total: Number(totalSum.toFixed(2)),
    pct,
  };
}

/**
 * Computes the weighted score from percentage score and category weight
 * e.g., 85.0% * 40% = 34.00
 */
export function calculateWeightedScore(
  percentage: number | null | undefined,
  weight: number | null | undefined
): number {
  const safePct = Number(percentage ?? 0);
  const safeWeight = Number(weight ?? 0);
  if (!Number.isFinite(safePct) || !Number.isFinite(safeWeight)) return 0;
  const normalizedWeight = safeWeight > 1 ? safeWeight / 100 : safeWeight;
  return Number((safePct * normalizedWeight).toFixed(2));
}

/**
 * Computes raw Initial Grade by summing component weighted scores
 * Formula: WS_WW + WS_PT + WS_FE
 */
export function calculateInitialGrade(
  wwPct: number,
  ptPct: number,
  fePct: number,
  metrics: GradingMetrics
): number {
  const wwWS = calculateWeightedScore(wwPct, metrics.ww_weight ?? 40);
  const ptWS = calculateWeightedScore(ptPct, metrics.pt_weight ?? 40);
  const feWS = calculateWeightedScore(fePct, metrics.sa_weight ?? 20);

  return Number((wwWS + ptWS + feWS).toFixed(2));
}

/**
 * Official DepEd Order No. 8, s. 2015 Transmutation Table
 * Maps Initial Grade (0-100%) to Transmuted Report Card Grade (60-100)
 */

export type TransmutationRange = {
  min: number;
  max: number;
  transmutedGrade: number;
};

export const DEPED_TRANSMUTATION_TABLE: TransmutationRange[] = [
  { min: 99.50, max: 100.00, transmutedGrade: 100 },
  { min: 98.32, max: 99.49, transmutedGrade: 99 },
  { min: 97.14, max: 98.31, transmutedGrade: 98 },
  { min: 95.96, max: 97.13, transmutedGrade: 97 },
  { min: 94.78, max: 95.95, transmutedGrade: 96 },
  { min: 93.60, max: 94.77, transmutedGrade: 95 },
  { min: 92.42, max: 93.59, transmutedGrade: 94 },
  { min: 91.24, max: 92.41, transmutedGrade: 93 },
  { min: 90.06, max: 91.23, transmutedGrade: 92 },
  { min: 88.88, max: 90.05, transmutedGrade: 91 },
  { min: 87.70, max: 88.87, transmutedGrade: 90 },
  { min: 86.52, max: 87.69, transmutedGrade: 89 },
  { min: 85.34, max: 86.51, transmutedGrade: 88 },
  { min: 84.16, max: 85.33, transmutedGrade: 87 },
  { min: 82.98, max: 84.15, transmutedGrade: 86 },
  { min: 81.80, max: 82.97, transmutedGrade: 85 },
  { min: 80.62, max: 81.79, transmutedGrade: 84 },
  { min: 79.44, max: 80.61, transmutedGrade: 83 },
  { min: 78.26, max: 79.43, transmutedGrade: 82 },
  { min: 77.08, max: 78.25, transmutedGrade: 81 },
  { min: 75.90, max: 77.07, transmutedGrade: 80 },

  { min: 74.72, max: 75.89, transmutedGrade: 79 },
  { min: 73.54, max: 74.71, transmutedGrade: 78 },
  { min: 72.36, max: 73.53, transmutedGrade: 77 },
  { min: 71.18, max: 72.35, transmutedGrade: 76 },
  { min: 70.00, max: 71.17, transmutedGrade: 75 },
  { min: 65.34, max: 69.99, transmutedGrade: 74 },
  { min: 60.67, max: 65.33, transmutedGrade: 73 },
  { min: 56.01, max: 60.66, transmutedGrade: 72 },
  { min: 51.34, max: 56.00, transmutedGrade: 71 },
  { min: 46.67, max: 51.33, transmutedGrade: 70 },
  { min: 42.01, max: 46.66, transmutedGrade: 69 },
  { min: 37.34, max: 42.00, transmutedGrade: 68 },
  { min: 32.68, max: 37.33, transmutedGrade: 67 },
  { min: 28.01, max: 32.67, transmutedGrade: 66 },
  { min: 23.35, max: 28.00, transmutedGrade: 65 },
  { min: 18.68, max: 23.34, transmutedGrade: 64 },
  { min: 14.01, max: 18.67, transmutedGrade: 63 },
  { min: 9.35, max: 14.00, transmutedGrade: 62 },
  { min: 4.68, max: 9.34, transmutedGrade: 61 },
  { min: 0.00, max: 4.67, transmutedGrade: 60 },
];

export function transmuteGrade(
  initialGrade: number | null | undefined
): number | null {
  if (
    initialGrade == null ||
    !Number.isFinite(initialGrade) ||
    initialGrade < 0 ||
    initialGrade > 100
  ) {
    return null;
  }

  const score =
    Math.round((initialGrade + Number.EPSILON) * 100) / 100;

  const matchedRange = DEPED_TRANSMUTATION_TABLE.find(
    ({ min, max }) => score >= min && score <= max
  );

  return matchedRange?.transmutedGrade ?? null;
}

/**
 * Computes official Term Grade (DepEd Transmuted Grade) based on category percentages and metrics
 */
export function calculateFinalGrade(
  wwPct: number,
  ptPct: number,
  fePct: number,
  metrics: GradingMetrics
): number {
  const initial = calculateInitialGrade(wwPct, ptPct, fePct, metrics);
  return transmuteGrade(initial) ?? 60;
}

/**
 * Determines passing / failing status for a given final grade
 */
export function getGradeStatus(finalGrade: number | null | undefined): GradeStatus {
  if (finalGrade === null || finalGrade === undefined || !Number.isFinite(finalGrade)) {
    return {
      isPassed: false,
      label: "INCOMPLETE",
      colorClass: "bg-slate-100 text-slate-600 border-slate-200",
    };
  }

  if (finalGrade >= 75) {
    return {
      isPassed: true,
      label: "PASSED",
      colorClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }

  return {
    isPassed: false,
    label: "FAILED",
    colorClass: "bg-rose-50 text-rose-700 border-rose-200",
  };
}
