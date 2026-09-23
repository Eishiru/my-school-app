import React, { useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Plus,
  ArrowRight,
  Sparkles,
  Info,
  Clock,
  Layers,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  useAcademicYears,
  useActiveAcademicTerm,
  useCreateAcademicYear,
  useActivateAcademicYear,
  useActivateSemester,
  SchoolYearData,
} from "../../../hooks/useAdminData";

export const AcademicSetupPage: React.FC = () => {
  const { data: schoolYears, isLoading: loadingYears } = useAcademicYears();
  const { data: activeTerm, isLoading: loadingActiveTerm } = useActiveAcademicTerm();

  const createYearMutation = useCreateAcademicYear();
  const activateYearMutation = useActivateAcademicYear();
  const activateSemesterMutation = useActivateSemester();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newYearName, setNewYearName] = useState("");
  const [modalError, setModalError] = useState("");

  const activeSY = activeTerm?.school_year;
  const activeSem = activeTerm?.active_semester;

  const handleOpenAddModal = () => {
    // Suggest next year based on existing
    if (schoolYears && schoolYears.length > 0) {
      const latestName = schoolYears[0].name; // e.g. "2026-2027"
      const match = latestName.match(/(\d{4})-(\d{4})/);
      if (match) {
        const nextStart = parseInt(match[2], 10);
        const nextEnd = nextStart + 1;
        setNewYearName(`${nextStart}-${nextEnd}`);
      } else {
        setNewYearName("");
      }
    } else {
      setNewYearName("2026-2027");
    }
    setModalError("");
    setIsAddModalOpen(true);
  };

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newYearName.trim();
    if (!trimmed) {
      setModalError("Please enter a valid School Year name.");
      return;
    }

    try {
      await createYearMutation.mutateAsync(trimmed);
      setIsAddModalOpen(false);
      setNewYearName("");
    } catch (err: any) {
      setModalError(err.message || "Failed to create School Year.");
    }
  };

  const handleActivateYear = async (year: SchoolYearData) => {
    if (year.is_active) return;
    if (
      !window.confirm(
        `Are you sure you want to set "${year.name}" as the active School Year?`
      )
    ) {
      return;
    }
    try {
      await activateYearMutation.mutateAsync(year.id);
    } catch (err: any) {
      alert(err.message || "Failed to activate School Year.");
    }
  };

  const handleSwitchSemester = async (semesterName: string) => {
    if (!activeSY) {
      alert("Please activate a School Year first.");
      return;
    }
    if (activeSem?.name === semesterName) return;

    try {
      await activateSemesterMutation.mutateAsync({
        schoolYearId: activeSY.id,
        semesterNameOrId: semesterName,
      });
    } catch (err: any) {
      alert(err.message || "Failed to activate semester.");
    }
  };

  const terms = [
    { key: "SEM1", label: "Semester 1", desc: "Preliminary grading period" },
    { key: "SEM2", label: "Semester 2", desc: "Midterm grading period" },
    { key: "SEM3", label: "Semester 3", desc: "Final / Culminating period" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Academic Setup
          </h1>
          <p className="text-sm text-slate-500">
            Manage institutional school years and advance active semesters across all portals.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        >
          <Plus size={16} />
          New School Year
        </button>
      </div>

      {/* Active Academic Period Banner */}
      <div className="overflow-hidden rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 p-6 shadow-xs">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-2.5 py-0.5 text-xs font-semibold text-white shadow-xs">
                <Sparkles size={12} />
                Live Active Term
              </span>
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <Clock size={12} /> Real-time System Sync
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
                {activeSY ? `A.Y. ${activeSY.name}` : "No Active School Year"}
              </h2>
              <span className="text-lg font-bold text-indigo-600">
                • {activeSem ? activeSem.name_display : "No Active Term"}
              </span>
            </div>

            <p className="text-xs text-slate-600 max-w-xl">
              The active period determines the default semester filter for gradebooks, quizzes,
              submissions, and official SF9 report card generation across student, teacher, and admin portals.
            </p>
          </div>

          {/* Quick Term Switcher */}
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white/90 p-3 shadow-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Quick Term Switcher
            </span>
            <div className="grid grid-cols-3 gap-2">
              {terms.map((t) => {
                const isActive = activeSem?.name === t.key;
                const isPending =
                  activateSemesterMutation.isPending &&
                  activateSemesterMutation.variables?.semesterNameOrId === t.key;

                return (
                  <button
                    key={t.key}
                    type="button"
                    disabled={isActive || !activeSY || activateSemesterMutation.isPending}
                    onClick={() => handleSwitchSemester(t.key)}
                    className={`group relative flex flex-col items-center justify-center rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-600 ring-offset-1"
                        : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300 disabled:opacity-50"
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {isPending ? (
                        <Loader2 size={12} className="animate-spin text-slate-500" />
                      ) : isActive ? (
                        <CheckCircle2 size={12} className="text-emerald-300" />
                      ) : null}
                      <span className="font-semibold">{t.label}</span>
                    </div>
                    <span
                      className={`text-[10px] ${
                        isActive ? "text-indigo-100" : "text-slate-400"
                      }`}
                    >
                      {isActive ? "Active Now" : "Set Active"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* School Years Registry Card */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs">
        <div className="border-b border-slate-200/80 bg-slate-50/60 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-slate-500" />
            <h2 className="text-base font-bold text-slate-900">
              School Years & Terms Registry
            </h2>
          </div>
          <span className="text-xs font-medium text-slate-500">
            Total Records: {schoolYears?.length || 0}
          </span>
        </div>

        {loadingYears ? (
          <div className="p-8 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin text-indigo-600" />
            Loading academic records...
          </div>
        ) : !schoolYears || schoolYears.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No school years found. Click "New School Year" above to get started.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {schoolYears.map((sy) => {
              const isCurrentActive = sy.is_active;

              return (
                <div
                  key={sy.id}
                  className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between transition-colors ${
                    isCurrentActive ? "bg-indigo-50/30" : "hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-4">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                        isCurrentActive
                          ? "border-indigo-200 bg-indigo-100 text-indigo-700"
                          : "border-slate-200 bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Calendar size={20} />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base font-bold text-slate-900 font-mono">
                          {sy.name}
                        </span>
                        {isCurrentActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active Year
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                            Inactive
                          </span>
                        )}
                      </div>

                      {/* Semesters list */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {sy.semesters?.map((sem) => {
                          const isSemActive = sem.is_active && isCurrentActive;
                          return (
                            <span
                              key={sem.id}
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border ${
                                isSemActive
                                  ? "border-indigo-200 bg-indigo-50 text-indigo-700 font-semibold"
                                  : "border-slate-200 bg-white text-slate-600"
                              }`}
                            >
                              {isSemActive && (
                                <span className="h-1 w-1 rounded-full bg-indigo-600" />
                              )}
                              {sem.name_display || sem.name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {isCurrentActive ? (
                      <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 size={14} /> Current Active Year
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={activateYearMutation.isPending}
                        onClick={() => handleActivateYear(sy)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50"
                      >
                        Set as Active Year
                        <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Information Tip Box */}
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
        <Info size={16} className="text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-800">
            How Academic Setup Works
          </p>
          <p>
            When a new School Year is created, 3 Semesters (Semester 1, Semester 2, and Semester 3) are
            automatically registered. Only one school year and one semester can be active simultaneously.
            Activating a semester immediately directs live quarterly/semester grades and report cards to that term.
          </p>
        </div>
      </div>

      {/* Add School Year Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Add New School Year
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateYear} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  School Year Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2027-2028"
                  value={newYearName}
                  onChange={(e) => {
                    setNewYearName(e.target.value);
                    setModalError("");
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <p className="text-[11px] text-slate-500">
                  Standard format: YYYY-YYYY (e.g. 2026-2027, 2027-2028).
                </p>
              </div>

              {modalError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">
                  Auto-Generated Semesters:
                </p>
                <p>
                  Semester 1, Semester 2, and Semester 3 will be created automatically for this School Year.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createYearMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {createYearMutation.isPending ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create School Year"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicSetupPage;
