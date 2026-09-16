import React, { useMemo, useState } from "react";
import {
  BarChart3,
  Award,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  User,
} from "lucide-react";
import { useStudentSemesterGrades } from "../../../hooks/useStudentSemesterGrades";
import type { StudentSemesterGradeRow } from "../../../types/studentTypes";

function safeNum(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function safeAverage(nums: Array<number | null | undefined>): number | null {
  const valid = nums.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function formatGrade(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function statusBadge(grade: number | null) {
  if (grade === null) {
    return {
      label: "Pending",
      cls: "bg-slate-100 text-slate-600 border-slate-200",
    };
  }
  if (grade >= 75) {
    return {
      label: "Passed",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }
  return {
    label: "Failed",
    cls: "bg-rose-50 text-rose-700 border-rose-200",
  };
}

export default function StudentSemesterGrades() {
  const {
    data: grades = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useStudentSemesterGrades();

  const [selectedTab, setSelectedTab] = useState<"ALL" | "SEM1" | "SEM2" | "SEM3">("ALL");

  // Calculate semester metrics
  const metrics = useMemo(() => {
    const sem1Grades = grades.map((g) => safeNum(g.semester_1 ?? g.sem1));
    const sem2Grades = grades.map((g) => safeNum(g.semester_2 ?? g.sem2));
    const sem3Grades = grades.map((g) => safeNum(g.semester_3 ?? g.sem3));
    const finalGrades = grades.map((g) => {
      const explicitFinal = safeNum(g.final);
      if (explicitFinal !== null) return explicitFinal;
      const s1 = safeNum(g.semester_1 ?? g.sem1);
      const s2 = safeNum(g.semester_2 ?? g.sem2);
      const s3 = safeNum(g.semester_3 ?? g.sem3);
      return safeAverage([s1, s2, s3]);
    });

    const sem1Avg = safeAverage(sem1Grades);
    const sem2Avg = safeAverage(sem2Grades);
    const sem3Avg = safeAverage(sem3Grades);
    const overallAvg = safeAverage(finalGrades);

    return {
      sem1Avg,
      sem2Avg,
      sem3Avg,
      overallAvg,
      totalSubjects: grades.length,
    };
  }, [grades]);

  if (isLoading) {
    return (
      <main className="min-h-[70vh] bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="h-10 w-10 mx-auto rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
          <p className="mt-4 text-slate-600 font-bold">Loading your report card...</p>
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="min-h-[70vh] bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl border border-rose-200 p-8 max-w-md text-center shadow-sm">
          <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
          <h2 className="mt-3 text-xl font-black text-slate-900">Failed to Load Grades</h2>
          <p className="mt-2 text-sm text-slate-500">
            {error instanceof Error ? error.message : "Unable to retrieve your report card."}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto px-4 sm:px-6 py-6 sm:py-8  space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-flex px-2.5 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-lg">
              Official Report Card
            </span>
            <h1 className="mt-2 text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              Academic Report Card
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Overview of your grades across the 3 semesters of the current academic year.
            </p>
          </div>
        </header>

        {/* 4 Semestral Summary Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Semester 1 Card */}
          <button
            type="button"
            onClick={() => setSelectedTab(selectedTab === "SEM1" ? "ALL" : "SEM1")}
            className={`p-5 rounded-2xl border text-left transition-all ${
              selectedTab === "SEM1"
                ? "bg-white border-indigo-500 ring-2 ring-indigo-200 shadow-sm"
                : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-black uppercase tracking-widest">Semester 1</span>
              <BarChart3 size={18} className={selectedTab === "SEM1" ? "text-indigo-600" : ""} />
            </div>
            <div className="mt-3 text-2xl font-black text-slate-900">
              {metrics.sem1Avg !== null ? `${metrics.sem1Avg.toFixed(1)}%` : "—"}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusBadge(metrics.sem1Avg).cls}`}>
                {statusBadge(metrics.sem1Avg).label}
              </span>
            </div>
          </button>

          {/* Semester 2 Card */}
          <button
            type="button"
            onClick={() => setSelectedTab(selectedTab === "SEM2" ? "ALL" : "SEM2")}
            className={`p-5 rounded-2xl border text-left transition-all ${
              selectedTab === "SEM2"
                ? "bg-white border-indigo-500 ring-2 ring-indigo-200 shadow-sm"
                : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-black uppercase tracking-widest">Semester 2</span>
              <BarChart3 size={18} className={selectedTab === "SEM2" ? "text-indigo-600" : ""} />
            </div>
            <div className="mt-3 text-2xl font-black text-slate-900">
              {metrics.sem2Avg !== null ? `${metrics.sem2Avg.toFixed(1)}%` : "—"}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusBadge(metrics.sem2Avg).cls}`}>
                {statusBadge(metrics.sem2Avg).label}
              </span>
            </div>
          </button>

          {/* Semester 3 Card */}
          <button
            type="button"
            onClick={() => setSelectedTab(selectedTab === "SEM3" ? "ALL" : "SEM3")}
            className={`p-5 rounded-2xl border text-left transition-all ${
              selectedTab === "SEM3"
                ? "bg-white border-indigo-500 ring-2 ring-indigo-200 shadow-sm"
                : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-black uppercase tracking-widest">Semester 3</span>
              <BarChart3 size={18} className={selectedTab === "SEM3" ? "text-indigo-600" : ""} />
            </div>
            <div className="mt-3 text-2xl font-black text-slate-900">
              {metrics.sem3Avg !== null ? `${metrics.sem3Avg.toFixed(1)}%` : "—"}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusBadge(metrics.sem3Avg).cls}`}>
                {statusBadge(metrics.sem3Avg).label}
              </span>
            </div>
          </button>

          {/* Overall General Average Card */}
          <button
            type="button"
            onClick={() => setSelectedTab("ALL")}
            className={`p-5 rounded-2xl border text-left transition-all ${
              selectedTab === "ALL"
                ? "bg-white border-indigo-500 ring-2 ring-indigo-200 shadow-sm"
                : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-black uppercase tracking-widest">General Average</span>
              <Award size={18} className="text-amber-500" />
            </div>
            <div className="mt-3 text-2xl font-black text-slate-900">
              {metrics.overallAvg !== null ? `${metrics.overallAvg.toFixed(1)}%` : "—"}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusBadge(metrics.overallAvg).cls}`}>
                {statusBadge(metrics.overallAvg).label}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">• {metrics.totalSubjects} Subjects</span>
            </div>
          </button>
        </section>

        {/* Filter View Selector */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">
            View:
          </span>
          {[
            { key: "ALL", label: "All Semesters & Final" },
            { key: "SEM1", label: "Semester 1" },
            { key: "SEM2", label: "Semester 2" },
            { key: "SEM3", label: "Semester 3" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedTab(tab.key as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                selectedTab === tab.key
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Report Card Table Section */}
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 md:p-6 border-b border-slate-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-indigo-600" />
              <h2 className="text-base font-black text-slate-900">Learning Progress & Achievement</h2>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {grades.length} Enrolled Subject{grades.length === 1 ? "" : "s"}
            </span>
          </div>

          {grades.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                <BarChart3 size={24} />
              </div>
              <h3 className="mt-4 font-black text-slate-900">No Grades Recorded Yet</h3>
              <p className="mt-1 text-sm text-slate-500">
                Your subject grades will be displayed here once your teachers record them for the semester.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-[11px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <th className="py-4 px-6">Learning Area (Subject)</th>
                    <th className="py-4 px-4">Instructor</th>
                    {(selectedTab === "ALL" || selectedTab === "SEM1") && (
                      <th className="py-4 px-4 text-center">Sem 1</th>
                    )}
                    {(selectedTab === "ALL" || selectedTab === "SEM2") && (
                      <th className="py-4 px-4 text-center">Sem 2</th>
                    )}
                    {(selectedTab === "ALL" || selectedTab === "SEM3") && (
                      <th className="py-4 px-4 text-center">Sem 3</th>
                    )}
                    {selectedTab === "ALL" && (
                      <th className="py-4 px-4 text-center">Final Grade</th>
                    )}
                    <th className="py-4 px-6 text-right">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {grades.map((row) => {
                    const s1 = safeNum(row.semester_1 ?? row.sem1);
                    const s2 = safeNum(row.semester_2 ?? row.sem2);
                    const s3 = safeNum(row.semester_3 ?? row.sem3);
                    const finalGrade = safeNum(row.final) ?? safeAverage([s1, s2, s3]);
                    const currentGrade =
                      selectedTab === "SEM1"
                        ? s1
                        : selectedTab === "SEM2"
                        ? s2
                        : selectedTab === "SEM3"
                        ? s3
                        : finalGrade;
                    const status = statusBadge(currentGrade);

                    return (
                      <tr key={row.subject_offering_id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-900">
                          {row.subject}
                        </td>
                        <td className="py-4 px-4 text-xs font-semibold text-slate-500">
                          {row.teacher_name ? (
                            <span className="inline-flex items-center gap-1.5">
                              <User size={13} className="text-slate-400" />
                              {row.teacher_name}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        {(selectedTab === "ALL" || selectedTab === "SEM1") && (
                          <td className="py-4 px-4 text-center font-bold text-slate-800">
                            {formatGrade(s1)}
                          </td>
                        )}
                        {(selectedTab === "ALL" || selectedTab === "SEM2") && (
                          <td className="py-4 px-4 text-center font-bold text-slate-800">
                            {formatGrade(s2)}
                          </td>
                        )}
                        {(selectedTab === "ALL" || selectedTab === "SEM3") && (
                          <td className="py-4 px-4 text-center font-bold text-slate-800">
                            {formatGrade(s3)}
                          </td>
                        )}
                        {selectedTab === "ALL" && (
                          <td className="py-4 px-4 text-center font-black text-slate-950 text-base">
                            {formatGrade(finalGrade)}
                          </td>
                        )}
                        <td className="py-4 px-6 text-right">
                          <span className={`inline-flex px-2.5 py-1 text-[11px] font-black uppercase tracking-wider rounded-lg border ${status.cls}`}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {selectedTab === "ALL" && metrics.overallAvg !== null && (
                  <tfoot>
                    <tr className="bg-slate-50/80 font-black border-t-2 border-slate-200">
                      <td colSpan={5} className="py-4 px-6 text-right text-xs uppercase tracking-wider text-slate-600">
                        General Average:
                      </td>
                      <td className="py-4 px-4 text-center text-lg text-indigo-700">
                        {metrics.overallAvg.toFixed(1)}%
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className={`inline-flex px-3 py-1 text-xs font-black uppercase tracking-wider rounded-lg border ${statusBadge(metrics.overallAvg).cls}`}>
                          {statusBadge(metrics.overallAvg).label}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
