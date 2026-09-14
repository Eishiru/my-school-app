import React, { useState, useEffect } from "react";
import { X, Plus, AlertCircle, FileText, Briefcase, Award } from "lucide-react";
import type { Semester } from "../../../../../types/teacherTypes";
import type { ActivityCategory } from "../types/gradingSheetTypes";

interface AddActivityModalProps {
  isOpen: boolean;
  subjectId: number;
  currentSemester: Semester;
  defaultCategory?: ActivityCategory;
  isCreating: boolean;
  onClose: () => void;
  onSubmit: (activityData: {
    title: string;
    grade_type: ActivityCategory;
    total_points: number;
    description: string;
    semester: Semester;
  }) => Promise<void>;
}

export const AddActivityModal: React.FC<AddActivityModalProps> = ({
  isOpen,
  currentSemester,
  defaultCategory = "WRITTEN_WORK",
  isCreating,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState("");
  const [gradeType, setGradeType] = useState<ActivityCategory>(defaultCategory);
  const [totalPoints, setTotalPoints] = useState<number>(
    defaultCategory === "FINAL_EXAM" ? 100 : defaultCategory === "PERFORMANCE_TASK" ? 50 : 20
  );
  const [description, setDescription] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync default category when modal opens or prop changes
  useEffect(() => {
    if (isOpen) {
      setGradeType(defaultCategory);
      setTotalPoints(
        defaultCategory === "FINAL_EXAM" ? 100 : defaultCategory === "PERFORMANCE_TASK" ? 50 : 20
      );
      setTitle("");
      setDescription("");
      setErrorMsg(null);
    }
  }, [isOpen, defaultCategory]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMsg("Please enter an activity title.");
      return;
    }

    if (!totalPoints || totalPoints <= 0) {
      setErrorMsg("Total points must be greater than 0.");
      return;
    }

    try {
      await onSubmit({
        title: trimmedTitle,
        grade_type: gradeType,
        total_points: Number(totalPoints),
        description: description.trim(),
        semester: currentSemester,
      });
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to create activity. Please try again."
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Add Manual Activity</h2>
              <p className="text-xs text-slate-500">
                Create an activity to manually record scores in your class record.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Activity Category / Component
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setGradeType("WRITTEN_WORK");
                  if (totalPoints === 50 || totalPoints === 100) setTotalPoints(20);
                }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition ${
                  gradeType === "WRITTEN_WORK"
                    ? "bg-blue-50 border-blue-400 text-blue-900 shadow-xs ring-2 ring-blue-100"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Written Work</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setGradeType("PERFORMANCE_TASK");
                  if (totalPoints === 20 || totalPoints === 100) setTotalPoints(50);
                }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition ${
                  gradeType === "PERFORMANCE_TASK"
                    ? "bg-emerald-50 border-emerald-400 text-emerald-900 shadow-xs ring-2 ring-emerald-100"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Briefcase className="w-4 h-4 text-emerald-600" />
                <span>Performance Task</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setGradeType("FINAL_EXAM");
                  if (totalPoints === 20 || totalPoints === 50) setTotalPoints(100);
                }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition ${
                  gradeType === "FINAL_EXAM"
                    ? "bg-amber-50 border-amber-400 text-amber-900 shadow-xs ring-2 ring-amber-100"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Award className="w-4 h-4 text-amber-600" />
                <span>Final Exam</span>
              </button>
            </div>
          </div>

          {/* Activity Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Activity Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                gradeType === "WRITTEN_WORK"
                  ? "e.g. Seatwork 1: Algebra Expressions"
                  : gradeType === "PERFORMANCE_TASK"
                  ? "e.g. Group Presentation & Lab Demo"
                  : "e.g. 1st Semester Final Examination"
              }
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Total Points */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Total Points / Max Score <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                step={1}
                required
                value={totalPoints || ""}
                onChange={(e) => setTotalPoints(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm font-semibold bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Semester
              </label>
              <div className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-xl">
                {currentSemester.replace("_", " ")}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Description / Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add instructions or grading criteria notes..."
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-sm disabled:opacity-50"
            >
              {isCreating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Activity...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Activity</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
