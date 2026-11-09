import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Save,
  Trash2,
  AlertCircle,
  Layers,
  FileText,
  Briefcase,
  Award,
  Plus,
  Pencil,
  Check,
} from "lucide-react";
import type {
  StudentRowData,
  ActivityItem,
  GradingMetrics,
  ActivityCategory,
} from "../types/gradingSheetTypes";
import { InlineScoreCell } from "./InlineScoreCell";
import { getGradeStatus } from "../utils/gradeCalculations";

export type ComponentView = "ALL" | ActivityCategory;

interface ActivityGradingTableProps {
  subjectId?: number;
  students: StudentRowData[];
  activities: ActivityItem[];
  metrics: GradingMetrics;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  isEditing?: boolean;
  isSavingAll?: boolean;
  isSavingRow: (studentId: number) => boolean;
  isDeletingRow: (gradeId?: number) => boolean;
  onActivityScoreChange: (
    studentId: number,
    activityId: number,
    score: number | null
  ) => void;
  onSummaryScoreChange: (
    studentId: number,
    category: "written_work" | "performance_task" | "final_exam",
    field: "score" | "total",
    value: number | null
  ) => void;
  onRemarksChange: (studentId: number, remarks: string) => void;
  onSaveRow: (row: StudentRowData) => Promise<void>;
  onDeleteRow: (gradeId?: number) => Promise<void>;
  onSaveAll?: () => void;
  onDiscardChanges?: () => void;
  onOpenAddActivity?: (category?: ActivityCategory) => void;
  onDeleteActivity?: (activityId: number, title: string) => void;
}

export const ActivityGradingTable: React.FC<ActivityGradingTableProps> = ({
  subjectId,
  students,
  activities,
  metrics,
  isLoading,
  isError,
  errorMessage,
  isEditing = false,
  isSavingAll = false,
  isSavingRow,
  isDeletingRow,
  onActivityScoreChange,
  onSummaryScoreChange,
  onRemarksChange,
  onSaveRow,
  onDeleteRow,
  onSaveAll,
  onDiscardChanges,
  onOpenAddActivity,
  onDeleteActivity,
}) => {
  // Active component section filter ("ALL", "WRITTEN_WORK", "PERFORMANCE_TASK", "FINAL_EXAM")
  const [activeSection, setActiveSection] = useState<ComponentView>("ALL");

  // Separate activities by grade_type
  const wwActivities = activities.filter(
    (a) => a.grade_type === "WRITTEN_WORK"
  );
  const ptActivities = activities.filter(
    (a) => a.grade_type === "PERFORMANCE_TASK"
  );
  const feActivities = activities.filter(
    (a) => a.grade_type === "FINAL_EXAM"
  );

  const showWW = activeSection === "ALL" || activeSection === "WRITTEN_WORK";
  const showPT = activeSection === "ALL" || activeSection === "PERFORMANCE_TASK";
  const showFE = activeSection === "ALL" || activeSection === "FINAL_EXAM";

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-sm">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-600">
          Loading student class record and activities...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-12 text-center shadow-sm">
        <div className="flex items-center justify-center gap-2 text-rose-600 font-bold mb-1">
          <AlertCircle className="w-5 h-5" />
          <span>Failed to load semester grades</span>
        </div>
        {errorMessage && (
          <p className="text-xs text-rose-500 mt-1 max-w-md mx-auto">
            {errorMessage}
          </p>
        )}
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-sm text-slate-500 text-sm">
        No student records found for this semester.
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
      {/* Component Section Switcher Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 bg-slate-50/75">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1.5 select-none">
            View Section:
          </span>

          {/* Button: All Components */}
          <button
            type="button"
            onClick={() => setActiveSection("ALL")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeSection === "ALL"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Components</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                activeSection === "ALL"
                  ? "bg-slate-800 text-slate-200"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {activities.length}
            </span>
          </button>

          {/* Button: Written Works */}
          <button
            type="button"
            onClick={() => setActiveSection("WRITTEN_WORK")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeSection === "WRITTEN_WORK"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-blue-800 border border-blue-200 hover:bg-blue-50/70"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-500" />
            <span>Written Works</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                activeSection === "WRITTEN_WORK"
                  ? "bg-blue-700 text-white"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {metrics.ww_weight}% • {wwActivities.length}
            </span>
          </button>

          {/* Button: Performance Tasks */}
          <button
            type="button"
            onClick={() => setActiveSection("PERFORMANCE_TASK")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeSection === "PERFORMANCE_TASK"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50/70"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 text-emerald-500" />
            <span>Performance Tasks</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                activeSection === "PERFORMANCE_TASK"
                  ? "bg-emerald-700 text-white"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {metrics.pt_weight}% • {ptActivities.length}
            </span>
          </button>

          {/* Button: Final Exam / Assessment */}
          <button
            type="button"
            onClick={() => setActiveSection("FINAL_EXAM")}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              activeSection === "FINAL_EXAM"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-white text-amber-800 border border-amber-200 hover:bg-amber-50/70"
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>Final Exam / Assessment</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                activeSection === "FINAL_EXAM"
                  ? "bg-amber-700 text-white"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {metrics.sa_weight}% • {feActivities.length}
            </span>
          </button>
        </div>

        {/* Informative Active Section Pill */}
        <div className="text-xs text-slate-500 font-medium">
          {activeSection === "ALL" && (
            <span>Showing all activity categories side-by-side</span>
          )}
          {activeSection === "WRITTEN_WORK" && (
            <span className="text-blue-700 font-semibold">
              Focusing on Written Works ({wwActivities.length} activities)
            </span>
          )}
          {activeSection === "PERFORMANCE_TASK" && (
            <span className="text-emerald-700 font-semibold">
              Focusing on Performance Tasks ({ptActivities.length} activities)
            </span>
          )}
          {activeSection === "FINAL_EXAM" && (
            <span className="text-amber-700 font-semibold">
              Focusing on Final Exam / Assessment ({feActivities.length} activities)
            </span>
          )}
        </div>
      </div>

      {/* Active Editing Sticky Banner */}
      {isEditing && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 bg-amber-500/10 border-b border-amber-300 text-xs text-amber-950">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-amber-500 text-white shadow-xs">
              <Pencil className="w-3.5 h-3.5" />
            </span>
            <span className="font-black">Editing Mode Active:</span>
            <span className="text-amber-900 font-medium">
              Scores, category totals, and remarks are editable directly in the grid. Grades recalculate live.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {students.some((s) => s.isModified) && (
              <span className="px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 font-black text-[11px]">
                {students.filter((s) => s.isModified).length} students modified
              </span>
            )}
            {onDiscardChanges && (
              <button
                type="button"
                onClick={onDiscardChanges}
                className="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50 transition shadow-xs text-xs"
              >
                Discard
              </button>
            )}
            {onSaveAll && (
              <button
                type="button"
                onClick={onSaveAll}
                disabled={isSavingAll || !students.some((s) => s.isModified)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 transition shadow-xs disabled:opacity-50 text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingAll ? "Saving..." : "Save All"}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty Section Helper Banner with Quick Create Button */}
      {activeSection === "WRITTEN_WORK" && wwActivities.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-blue-50/70 border-b border-blue-200 text-xs text-blue-950">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              No digital quizzes/activities found under <strong>Written Works</strong> for this semester. You can input manual scores below or create a new activity.
            </span>
          </div>
          {onOpenAddActivity ? (
            <button
              type="button"
              onClick={() => onOpenAddActivity("WRITTEN_WORK")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 transition shadow-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Written Work</span>
            </button>
          ) : subjectId ? (
            <Link
              to={`/teacher/subject/${subjectId}/activities/create?grade_type=WRITTEN_WORK`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 transition shadow-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Written Work</span>
            </Link>
          ) : null}
        </div>
      )}

      {activeSection === "PERFORMANCE_TASK" && ptActivities.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-emerald-50/70 border-b border-emerald-200 text-xs text-emerald-950">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              No digital activities found under <strong>Performance Tasks</strong> for this semester. You can input manual scores below or create a new activity.
            </span>
          </div>
          {onOpenAddActivity ? (
            <button
              type="button"
              onClick={() => onOpenAddActivity("PERFORMANCE_TASK")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700 transition shadow-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Performance Task</span>
            </button>
          ) : subjectId ? (
            <Link
              to={`/teacher/subject/${subjectId}/activities/create?grade_type=PERFORMANCE_TASK`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-700 transition shadow-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Performance Task</span>
            </Link>
          ) : null}
        </div>
      )}

      {activeSection === "FINAL_EXAM" && feActivities.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-amber-50/70 border-b border-amber-200 text-xs text-amber-950">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              No digital assessment found under <strong>Final Exam / Assessment</strong> for this semester. You can input manual scores below or create an Exam.
            </span>
          </div>
          {onOpenAddActivity ? (
            <button
              type="button"
              onClick={() => onOpenAddActivity("FINAL_EXAM")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-lg font-bold text-xs hover:bg-amber-700 transition shadow-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Final Exam</span>
            </button>
          ) : subjectId ? (
            <Link
              to={`/teacher/subject/${subjectId}/activities/create?grade_type=FINAL_EXAM`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-lg font-bold text-xs hover:bg-amber-700 transition shadow-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Final Exam</span>
            </Link>
          ) : null}
        </div>
      )}

      {/* Main Table Spreadsheet */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          {/* Top Multi-Header: Category Bands */}
          <thead>
            <tr className="border-b border-slate-200 text-slate-700 font-black tracking-wider uppercase text-[11px]">
              {/* Sticky Student Column: Always stays visible */}
              <th
                rowSpan={2}
                className="py-3 px-4 sticky left-0 bg-slate-100/95 z-20 min-w-56 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.03)]"
              >
                Student Name
              </th>

              {/* Written Works Band */}
              {showWW && (
                <th
                  colSpan={
                    wwActivities.length > 0 ? wwActivities.length + 2 : 2
                  }
                  className="py-2.5 px-3 text-center bg-blue-50 border-r border-slate-200 text-blue-950 font-black"
                >
                  Written Works ({metrics.ww_weight}%)
                </th>
              )}

              {/* Performance Tasks Band */}
              {showPT && (
                <th
                  colSpan={
                    ptActivities.length > 0 ? ptActivities.length + 2 : 2
                  }
                  className="py-2.5 px-3 text-center bg-emerald-50 border-r border-slate-200 text-emerald-950 font-black"
                >
                  Performance Tasks ({metrics.pt_weight}%)
                </th>
              )}

              {/* Final Exam Band */}
              {showFE && (
                <th
                  colSpan={
                    feActivities.length > 0 ? feActivities.length + 2 : 2
                  }
                  className="py-2.5 px-3 text-center bg-amber-50 border-r border-slate-200 text-amber-950 font-black"
                >
                  Final Exam / Assessment ({metrics.sa_weight}%)
                </th>
              )}

              {/* Final Grade: Always stays visible */}
              <th
                rowSpan={2}
                className="py-3 px-3 text-center bg-indigo-50/80 border-r border-slate-200 text-indigo-950 font-black min-w-28"
              >
                Final Grade
              </th>

              {/* Remarks: Always stays visible */}
              <th
                rowSpan={2}
                className="py-3 px-4 bg-slate-50 border-r border-slate-200 text-slate-700 font-black min-w-44"
              >
                Remarks
              </th>

              {/* Actions: Always stays visible */}
              <th
                rowSpan={2}
                className="py-3 px-3 text-right bg-slate-50 text-slate-700 font-black min-w-20"
              >
                Actions
              </th>
            </tr>

            {/* Sub-Header: Activity Columns and Category Totals */}
            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-600">
              {/* WW Activities Sub-headers */}
              {showWW && (
                <>
                  {wwActivities.map((act) => (
                    <th
                      key={`ww-${act.id}`}
                      className="py-2 px-2 text-center bg-blue-50/40 border-r border-slate-100 min-w-24 truncate"
                      title={`${act.title} (${act.total_points} pts)`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="truncate max-w-20 font-bold">{act.title}</span>
                        {isEditing && onDeleteActivity && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteActivity(act.id, act.title);
                            }}
                            className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 rounded hover:bg-rose-50 flex-shrink-0"
                            title={`Delete "${act.title}"`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="text-slate-400 font-normal">
                        {act.total_points} pts
                      </div>
                    </th>
                  ))}
                  <th className="py-2 px-2 text-center bg-blue-100/60 border-r border-slate-200 min-w-20 font-black text-blue-900">
                    Total
                  </th>
                  <th className="py-2 px-2 text-center bg-blue-100/80 border-r border-slate-200 min-w-16 font-black text-blue-900">
                    WW %
                  </th>
                </>
              )}

              {/* PT Activities Sub-headers */}
              {showPT && (
                <>
                  {ptActivities.map((act) => (
                    <th
                      key={`pt-${act.id}`}
                      className="py-2 px-2 text-center bg-emerald-50/40 border-r border-slate-100 min-w-24 truncate"
                      title={`${act.title} (${act.total_points} pts)`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="truncate max-w-20 font-bold">{act.title}</span>
                        {isEditing && onDeleteActivity && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteActivity(act.id, act.title);
                            }}
                            className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 rounded hover:bg-rose-50 flex-shrink-0"
                            title={`Delete "${act.title}"`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="text-slate-400 font-normal">
                        {act.total_points} pts
                      </div>
                    </th>
                  ))}
                  <th className="py-2 px-2 text-center bg-emerald-100/60 border-r border-slate-200 min-w-20 font-black text-emerald-900">
                    Total
                  </th>
                  <th className="py-2 px-2 text-center bg-emerald-100/80 border-r border-slate-200 min-w-16 font-black text-emerald-900">
                    PT %
                  </th>
                </>
              )}

              {/* Final Exam Activities Sub-headers */}
              {showFE && (
                <>
                  {feActivities.map((act) => (
                    <th
                      key={`fe-${act.id}`}
                      className="py-2 px-2 text-center bg-amber-50/40 border-r border-slate-100 min-w-24 truncate"
                      title={`${act.title} (${act.total_points} pts)`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="truncate max-w-20 font-bold">{act.title}</span>
                        {isEditing && onDeleteActivity && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteActivity(act.id, act.title);
                            }}
                            className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 rounded hover:bg-rose-50 flex-shrink-0"
                            title={`Delete "${act.title}"`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="text-slate-400 font-normal">
                        {act.total_points} pts
                      </div>
                    </th>
                  ))}
                  <th className="py-2 px-2 text-center bg-amber-100/60 border-r border-slate-200 min-w-20 font-black text-amber-900">
                    Total
                  </th>
                  <th className="py-2 px-2 text-center bg-amber-100/80 border-r border-slate-200 min-w-16 font-black text-amber-900">
                    Exam %
                  </th>
                </>
              )}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100">
            {students.map((row) => {
              const status = getGradeStatus(row.final_grade);
              const saving = isSavingRow(row.student_id);
              const deleting = isDeletingRow(row.grade_record_id);

              return (
                <tr
                  key={row.student_id}
                  className={`hover:bg-slate-50/75 transition-colors ${
                    row.isModified ? "bg-amber-50/30" : ""
                  }`}
                >
                  {/* Sticky Student Column */}
                  <td className="py-2.5 px-4 sticky left-0 bg-white z-10 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                    <div className="font-bold text-slate-900 truncate max-w-56">
                      {row.student_name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {row.school_id || "—"}
                    </div>
                  </td>

                  {/* WW Section Cells */}
                  {showWW && (
                    <>
                      {wwActivities.map((act) => (
                        <td
                          key={`cell-ww-${act.id}`}
                          className="py-2 px-2 text-center border-r border-slate-100 bg-blue-50/10"
                        >
                          <InlineScoreCell
                            score={row.activity_scores[act.id]}
                            maxPoints={act.total_points}
                            readOnly={!isEditing}
                            isModified={row.isModified}
                            onChange={(val) =>
                              onActivityScoreChange(
                                row.student_id,
                                act.id,
                                val
                              )
                            }
                          />
                        </td>
                      ))}

                      {/* WW Total Score */}
                      <td className="py-2 px-2 text-center border-r border-slate-200 bg-blue-50/20 font-bold text-slate-700">
                        {wwActivities.length > 0 ? (
                          <span className="text-xs font-bold">
                            {row.written_work_score ?? 0}
                            <span className="text-[10px] text-slate-400 font-normal">
                              /{row.written_work_total}
                            </span>
                          </span>
                        ) : isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min={0}
                              value={row.written_work_score ?? ""}
                              onChange={(e) =>
                                onSummaryScoreChange(
                                  row.student_id,
                                  "written_work",
                                  "score",
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value)
                                )
                              }
                              className="w-12 px-1 py-0.5 text-center text-xs bg-white border border-slate-200 rounded font-semibold"
                              placeholder="0"
                            />
                            <span className="text-slate-400">/</span>
                            <input
                              type="number"
                              min={1}
                              value={row.written_work_total}
                              onChange={(e) =>
                                onSummaryScoreChange(
                                  row.student_id,
                                  "written_work",
                                  "total",
                                  Number(e.target.value) || 100
                                )
                              }
                              className="w-12 px-1 py-0.5 text-center text-xs bg-white border border-slate-200 rounded font-semibold"
                            />
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-slate-800">
                            {row.written_work_score !== null && row.written_work_score !== undefined
                              ? row.written_work_score
                              : "—"}
                            <span className="text-[10px] text-slate-400 font-normal">
                              /{row.written_work_total}
                            </span>
                          </span>
                        )}
                      </td>

                      {/* WW Percentage */}
                      <td className="py-2 px-2 text-center border-r border-slate-200 bg-blue-100/30 font-black text-blue-900">
                        {row.written_work_pct.toFixed(1)}%
                      </td>
                    </>
                  )}

                  {/* PT Section Cells */}
                  {showPT && (
                    <>
                      {ptActivities.map((act) => (
                        <td
                          key={`cell-pt-${act.id}`}
                          className="py-2 px-2 text-center border-r border-slate-100 bg-emerald-50/10"
                        >
                          <InlineScoreCell
                            score={row.activity_scores[act.id]}
                            maxPoints={act.total_points}
                            readOnly={!isEditing}
                            isModified={row.isModified}
                            onChange={(val) =>
                              onActivityScoreChange(
                                row.student_id,
                                act.id,
                                val
                              )
                            }
                          />
                        </td>
                      ))}

                      {/* PT Total Score */}
                      <td className="py-2 px-2 text-center border-r border-slate-200 bg-emerald-50/20 font-bold text-slate-700">
                        {ptActivities.length > 0 ? (
                          <span className="text-xs font-bold">
                            {row.performance_task_score ?? 0}
                            <span className="text-[10px] text-slate-400 font-normal">
                              /{row.performance_task_total}
                            </span>
                          </span>
                        ) : isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min={0}
                              value={row.performance_task_score ?? ""}
                              onChange={(e) =>
                                onSummaryScoreChange(
                                  row.student_id,
                                  "performance_task",
                                  "score",
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value)
                                )
                              }
                              className="w-12 px-1 py-0.5 text-center text-xs bg-white border border-slate-200 rounded font-semibold"
                              placeholder="0"
                            />
                            <span className="text-slate-400">/</span>
                            <input
                              type="number"
                              min={1}
                              value={row.performance_task_total}
                              onChange={(e) =>
                                onSummaryScoreChange(
                                  row.student_id,
                                  "performance_task",
                                  "total",
                                  Number(e.target.value) || 100
                                )
                              }
                              className="w-12 px-1 py-0.5 text-center text-xs bg-white border border-slate-200 rounded font-semibold"
                            />
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-slate-800">
                            {row.performance_task_score !== null && row.performance_task_score !== undefined
                              ? row.performance_task_score
                              : "—"}
                            <span className="text-[10px] text-slate-400 font-normal">
                              /{row.performance_task_total}
                            </span>
                          </span>
                        )}
                      </td>

                      {/* PT Percentage */}
                      <td className="py-2 px-2 text-center border-r border-slate-200 bg-emerald-100/30 font-black text-emerald-900">
                        {row.performance_task_pct.toFixed(1)}%
                      </td>
                    </>
                  )}

                  {/* Final Exam Section Cells */}
                  {showFE && (
                    <>
                      {feActivities.map((act) => (
                        <td
                          key={`cell-fe-${act.id}`}
                          className="py-2 px-2 text-center border-r border-slate-100 bg-amber-50/10"
                        >
                          <InlineScoreCell
                            score={row.activity_scores[act.id]}
                            maxPoints={act.total_points}
                            readOnly={!isEditing}
                            isModified={row.isModified}
                            onChange={(val) =>
                              onActivityScoreChange(
                                row.student_id,
                                act.id,
                                val
                              )
                            }
                          />
                        </td>
                      ))}

                      {/* Final Exam Total Score */}
                      <td className="py-2 px-2 text-center border-r border-slate-200 bg-amber-50/20 font-bold text-slate-700">
                        {feActivities.length > 0 ? (
                          <span className="text-xs font-bold">
                            {row.final_exam_score ?? 0}
                            <span className="text-[10px] text-slate-400 font-normal">
                              /{row.final_exam_total}
                            </span>
                          </span>
                        ) : isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min={0}
                              value={row.final_exam_score ?? ""}
                              onChange={(e) =>
                                onSummaryScoreChange(
                                  row.student_id,
                                  "final_exam",
                                  "score",
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value)
                                )
                              }
                              className="w-12 px-1 py-0.5 text-center text-xs bg-white border border-slate-200 rounded font-semibold"
                              placeholder="0"
                            />
                            <span className="text-slate-400">/</span>
                            <input
                              type="number"
                              min={1}
                              value={row.final_exam_total}
                              onChange={(e) =>
                                onSummaryScoreChange(
                                  row.student_id,
                                  "final_exam",
                                  "total",
                                  Number(e.target.value) || 100
                                )
                              }
                              className="w-12 px-1 py-0.5 text-center text-xs bg-white border border-slate-200 rounded font-semibold"
                            />
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-slate-800">
                            {row.final_exam_score !== null && row.final_exam_score !== undefined
                              ? row.final_exam_score
                              : "—"}
                            <span className="text-[10px] text-slate-400 font-normal">
                              /{row.final_exam_total}
                            </span>
                          </span>
                        )}
                      </td>

                      {/* Final Exam Percentage */}
                      <td className="py-2 px-2 text-center border-r border-slate-200 bg-amber-100/30 font-black text-amber-900">
                        {row.final_exam_pct.toFixed(1)}%
                      </td>
                    </>
                  )}

                  {/* Final Grade: Always stays visible */}
                  <td className="py-2 px-3 text-center border-r border-slate-200 bg-indigo-50/30">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-black border ${status.colorClass}`}
                    >
                      {row.final_grade !== null &&
                      row.final_grade !== undefined
                        ? row.final_grade.toFixed(2)
                        : "—"}
                    </span>
                  </td>

                  {/* Remarks: Always stays visible */}
                  <td className="py-2 px-3 border-r border-slate-200">
                    {isEditing ? (
                      <input
                        type="text"
                        value={row.remarks || ""}
                        onChange={(e) =>
                          onRemarksChange(row.student_id, e.target.value)
                        }
                        placeholder="Add remark..."
                        className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-indigo-500 text-slate-700"
                      />
                    ) : (
                      <div className="truncate max-w-44 text-slate-700 font-medium text-xs">
                        {row.remarks ? (
                          row.remarks
                        ) : (
                          <span className="text-slate-300 italic select-none">—</span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Actions: Always stays visible */}
                  <td className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onSaveRow(row)}
                            disabled={!row.isModified || saving}
                            title={
                              row.isModified ? "Save changes" : "No unsaved changes"
                            }
                            className={`p-1.5 rounded-lg transition ${
                              row.isModified
                                ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                                : "text-slate-300 hover:text-slate-400 cursor-not-allowed"
                            } disabled:opacity-50`}
                          >
                            {saving ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Save className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {row.grade_record_id && (
                            <button
                              type="button"
                              onClick={() => onDeleteRow(row.grade_record_id)}
                              disabled={deleting}
                              title="Delete recorded grade"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="text-[10px] font-semibold px-2 py-0.5">
                          {row.grade_record_id ? (
                            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1">
                              <Check className="w-2.5 h-2.5 text-emerald-600" /> Saved
                            </span>
                          ) : (
                            <span className="text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                              Unsaved
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
