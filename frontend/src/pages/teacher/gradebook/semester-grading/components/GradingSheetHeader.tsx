import React from "react";
import { ArrowLeft, Search, RefreshCw, SlidersHorizontal, Save, Pencil, Plus, Check } from "lucide-react";
import type { Semester } from "../../../../../types/teacherTypes";

interface GradingSheetHeaderProps {
  subjectName?: string;
  section?: string;
  gradeLevel?: string;
  roomNumber?: string;
  currentSemester: Semester;
  semesterOptions: { label: string; value: Semester }[];
  searchQuery: string;
  isFetching: boolean;
  modifiedCount: number;
  isEditing: boolean;
  isSavingAll?: boolean;
  onBack: () => void;
  onSemesterChange: (semester: Semester) => void;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
  onOpenWeightsModal: () => void;
  onToggleEdit: () => void;
  onOpenAddActivity: () => void;
  onSaveAll?: () => void;
}

export const GradingSheetHeader: React.FC<GradingSheetHeaderProps> = ({
  subjectName = "Subject Grading Sheet",
  section,
  gradeLevel,
  roomNumber,
  currentSemester,
  semesterOptions,
  searchQuery,
  isFetching,
  modifiedCount,
  isEditing,
  isSavingAll = false,
  onBack,
  onSemesterChange,
  onSearchChange,
  onRefresh,
  onOpenWeightsModal,
  onToggleEdit,
  onOpenAddActivity,
  onSaveAll,
}) => {
  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        {/* Left: Back button and Subject metadata */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 transition"
            title="Return to Subjects"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                {subjectName}
              </h1>
              {section && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Section {section}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <span>Class Record & Activities Grading Sheet</span>
              {gradeLevel && (
                <>
                  <span>•</span>
                  <span>{gradeLevel.replace("_", " ")}</span>
                </>
              )}
              {roomNumber && (
                <>
                  <span>•</span>
                  <span>Room {roomNumber}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right: Semester selector pills */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          {semesterOptions.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onSemesterChange(item.value)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                currentSemester === item.value
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Control & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search student name or ID..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Add Activity Button */}
          <button
            type="button"
            onClick={onOpenAddActivity}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Activity</span>
          </button>

          {/* Global Edit Button */}
          <button
            type="button"
            onClick={onToggleEdit}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl shadow-xs transition ${
              isEditing
                ? "bg-slate-900 text-white hover:bg-slate-800 ring-2 ring-slate-900/20"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            {isEditing ? (
              <>
                <Check className="w-4 h-4" />
                <span>Exit Edit Mode</span>
              </>
            ) : (
              <>
                <Pencil className="w-4 h-4" />
                <span>Edit Grades</span>
              </>
            )}
          </button>

          {/* Save All Button (when modified and in edit mode) */}
          {modifiedCount > 0 && onSaveAll && (
            <button
              type="button"
              onClick={onSaveAll}
              disabled={isSavingAll}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition animate-pulse disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSavingAll
                  ? "Saving..."
                  : `Save All (${modifiedCount} unsaved)`}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={isFetching}
            className="p-2.5 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw
              className={`w-4 h-4 ${isFetching ? "animate-spin text-indigo-600" : ""}`}
            />
          </button>

          <button
            type="button"
            onClick={onOpenWeightsModal}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition"
          >
            <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
            <span>Grading Weights</span>
          </button>
        </div>
      </div>
    </div>
  );
};
