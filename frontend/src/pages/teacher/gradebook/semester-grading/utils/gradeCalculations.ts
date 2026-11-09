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
 * Computes weighted final grade based on category percentages and metrics
 * Formula: (WW% * WW_Weight) + (PT% * PT_Weight) + (FE% * FE_Weight)
 */
export function calculateFinalGrade(
  wwPct: number,
  ptPct: number,
  fePct: number,
  metrics: GradingMetrics
): number {
  const wwWeight = (metrics.ww_weight ?? 40) / 100;
  const ptWeight = (metrics.pt_weight ?? 40) / 100;
  const feWeight = (metrics.sa_weight ?? 20) / 100;

  const weighted =
    wwPct * wwWeight + ptPct * ptWeight + fePct * feWeight;

  return Number(weighted.toFixed(2));
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
