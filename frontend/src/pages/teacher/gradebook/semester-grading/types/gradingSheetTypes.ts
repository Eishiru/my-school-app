import type { Semester } from "../../../../../types/teacherTypes";

export type ActivityCategory =
  | "WRITTEN_WORK"
  | "PERFORMANCE_TASK"
  | "FINAL_EXAM";

export interface ActivityItem {
  id: number;
  title: string;
  grade_type: ActivityCategory;
  total_points: number;
  semester?: Semester;
}

export interface StudentRowData {
  student_id: number;
  school_id: string;
  student_name: string;
  grade_record_id?: number;

  // Individual activity scores mapped by activity id
  activity_scores: Record<number, number | null>;

  // Component totals and percentages
  written_work_score: number | null;
  written_work_total: number;
  written_work_pct: number;

  performance_task_score: number | null;
  performance_task_total: number;
  performance_task_pct: number;

  final_exam_score: number | null;
  final_exam_total: number;
  final_exam_pct: number;

  // Computed final grade and remarks
  final_grade: number | null;
  remarks: string;

  // UI state
  isModified: boolean;
}

export interface GradingMetrics {
  ww_weight: number; // 0-100 percentage
  pt_weight: number; // 0-100 percentage
  sa_weight: number; // 0-100 percentage (Final Exam / Semester Assessment)
}

export interface GradeStatus {
  isPassed: boolean;
  label: "PASSED" | "FAILED" | "INCOMPLETE";
  colorClass: string;
}
