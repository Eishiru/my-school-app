import React from "react";
import { Users, Award, TrendingUp, CheckSquare } from "lucide-react";
import type { StudentRowData, ActivityItem } from "../types/gradingSheetTypes";

interface GradingSummaryCardsProps {
  students: StudentRowData[];
  activities: ActivityItem[];
}

export const GradingSummaryCards: React.FC<GradingSummaryCardsProps> = ({
  students,
  activities,
}) => {
  const totalStudents = students.length;

  const studentsWithGrades = students.filter(
    (s) => s.final_grade !== null && s.final_grade !== undefined && s.final_grade > 0
  );

  const averageGrade =
    studentsWithGrades.length > 0
      ? Number(
          (
            studentsWithGrades.reduce(
              (acc, s) => acc + (s.final_grade ?? 0),
              0
            ) / studentsWithGrades.length
          ).toFixed(2)
        )
      : null;

  const passedStudents = studentsWithGrades.filter(
    (s) => (s.final_grade ?? 0) >= 75
  ).length;

  const passingRate =
    studentsWithGrades.length > 0
      ? Math.round((passedStudents / studentsWithGrades.length) * 100)
      : null;

  const wwCount = activities.filter((a) => a.grade_type === "WRITTEN_WORK").length;
  const ptCount = activities.filter((a) => a.grade_type === "PERFORMANCE_TASK").length;
  const feCount = activities.filter((a) => a.grade_type === "FINAL_EXAM").length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Total Students */}
      <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Enrolled Students
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
            {totalStudents}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
          <Users className="w-4 h-4" />
        </div>
      </div>

      {/* Class Average */}
      <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Class Average (GWA)
          </div>
          <div className="text-xl font-bold font-mono mt-0.5">
            {averageGrade !== null ? (
              <span className={averageGrade >= 75 ? "text-slate-900 font-bold" : "text-rose-600"}>
                {averageGrade.toFixed(2)}
              </span>
            ) : (
              <span className="text-slate-400 font-medium text-base">—</span>
            )}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
          <Award className="w-4 h-4" />
        </div>
      </div>

      {/* Passing Rate */}
      <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Passing Rate
          </div>
          <div className="text-xl font-bold font-mono mt-0.5">
            {passingRate !== null ? (
              <span className={passingRate >= 75 ? "text-emerald-700 font-bold" : "text-amber-600"}>
                {passingRate}%
              </span>
            ) : (
              <span className="text-slate-400 font-medium text-base">—</span>
            )}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
          <TrendingUp className="w-4 h-4" />
        </div>
      </div>

      {/* Activities Summary */}
      <div className="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Recorded Activities
          </div>
          <div className="text-xs font-semibold text-slate-700 mt-1 flex items-center gap-1.5 font-mono">
            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">WW: {wwCount}</span>
            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">PT: {ptCount}</span>
            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">Exam: {feCount}</span>
          </div>
        </div>
        <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
          <CheckSquare className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
