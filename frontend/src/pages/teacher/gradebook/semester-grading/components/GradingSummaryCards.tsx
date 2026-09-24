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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Students */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
        <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Students
          </div>
          <div className="text-xl font-black text-slate-900 mt-0.5">
            {totalStudents}
          </div>
        </div>
      </div>

      {/* Class Average */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
        <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
          <Award className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Class Average
          </div>
          <div className="text-xl font-black text-slate-900 mt-0.5">
            {averageGrade !== null ? (
              <span
                className={
                  averageGrade >= 75 ? "text-emerald-600" : "text-rose-600"
                }
              >
                {averageGrade.toFixed(2)}
              </span>
            ) : (
              <span className="text-slate-400 font-medium text-base">—</span>
            )}
          </div>
        </div>
      </div>

      {/* Passing Rate */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
        <div className="p-3 rounded-xl bg-blue-50 text-blue-600 shrink-0">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Passing Rate
          </div>
          <div className="text-xl font-black text-slate-900 mt-0.5">
            {passingRate !== null ? (
              <span
                className={
                  passingRate >= 75 ? "text-emerald-600" : "text-amber-600"
                }
              >
                {passingRate}%
              </span>
            ) : (
              <span className="text-slate-400 font-medium text-base">—</span>
            )}
          </div>
        </div>
      </div>

      {/* Activities Recorded */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
        <div className="p-3 rounded-xl bg-amber-50 text-amber-600 shrink-0">
          <CheckSquare className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Activities
          </div>
          <div className="text-xs font-bold text-slate-700 mt-0.5 flex items-center gap-1.5">
            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
              WW: {wwCount}
            </span>
            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
              PT: {ptCount}
            </span>
            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
              Exam: {feCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
