import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Sparkles, Search, CheckCircle2, AlertTriangle, ArrowRight, BookOpen } from "lucide-react";

import {
  useTeacherSubjectGrades,
} from "../../../hooks/useTeacherSubjects";

import type {
  Semester,
} from "../../../types/teacherTypes";

function semesterLabel(
  semester: Semester
) {
  switch (semester) {
    case "SEMESTER_1":
      return "1st Semester";

    case "SEMESTER_2":
      return "2nd Semester";

    case "SEMESTER_3":
      return "3rd Semester";

    default:
      return semester;
  }
}

export default function SubjectGradesTab() {
  const { id } =
    useParams<{ id: string }>();

  const subjectId = Number(id || 0);

  const [selectedSemester, setSelectedSemester] =
    useState<Semester | "ALL">("SEMESTER_1");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: grades = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useTeacherSubjectGrades(subjectId);

  const termGrades = useMemo(() => {
    if (selectedSemester === "ALL") {
      return grades;
    }

    return grades.filter(
      (grade) => grade.semester === selectedSemester
    );
  }, [grades, selectedSemester]);

  const filteredGrades = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return termGrades;
    return termGrades.filter((g) =>
      (g.student_name || "").toLowerCase().includes(q)
    );
  }, [termGrades, searchQuery]);

  const termStats = useMemo(() => {
    const validGrades = termGrades.filter(
      (g) => typeof g.final_grade === "number" && !Number.isNaN(g.final_grade)
    );
    const avg =
      validGrades.length > 0
        ? validGrades.reduce((sum, g) => sum + (g.final_grade || 0), 0) /
          validGrades.length
        : null;
    const passing = validGrades.filter((g) => (g.final_grade || 0) >= 75).length;
    const atRisk = validGrades.filter((g) => (g.final_grade || 0) < 75).length;

    return {
      total: termGrades.length,
      graded: validGrades.length,
      average: avg !== null ? avg.toFixed(1) : "—",
      passing,
      atRisk,
    };
  }, [termGrades]);

  const pageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const fit = () => {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const top = Math.max(0, page.getBoundingClientRect().top);
      const bottomPadding = page.parentElement
        ? parseFloat(getComputedStyle(page.parentElement).paddingBottom) || 0 : 0;
      page.style.setProperty('--grades-tab-height', `${Math.max(0, viewportHeight - top - bottomPadding - 12)}px`);
    };
    fit();
    const observer = new ResizeObserver(fit);
    // Observe the surrounding subject page as its header/tabs can change height.
    let parent = page.parentElement;
    while (parent && parent !== document.body) {
      observer.observe(parent);
      parent = parent.parentElement;
    }
    window.addEventListener('resize', fit);
    window.visualViewport?.addEventListener('resize', fit);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', fit);
      window.visualViewport?.removeEventListener('resize', fit);
    };
  }, [subjectId, isLoading, isError]);

  if (!subjectId) {
    return (
      <div className="p-6 text-rose-600">
        Invalid subject ID.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        Loading grades…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6">
        <div className="font-bold text-rose-700">
          Failed to load grades.
        </div>

        <p className="mt-1 text-sm text-rose-600">
          {error instanceof Error
            ? error.message
            : "Something went wrong."}
        </p>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="mt-4 text-sm font-bold text-rose-700 hover:underline disabled:opacity-50"
        >
          {isFetching
            ? "Retrying..."
            : "Try again"}
        </button>
      </div>
    );
  }

  return (
    <div ref={pageRef} className="subject-grades-tab">
      <style>{`
        .subject-grades-tab { min-width: 0; display: flex; flex-direction: column; gap: 12px; }
        .subject-grades-tab .grades-toolbar { flex-shrink: 0; gap: 10px; }
        .subject-grades-tab .grades-toolbar select { padding: 8px 12px; max-width: 100%; }
        .subject-grades-tab .grades-panel { min-width: 0; border-radius: 12px; }
        .subject-grades-tab .grades-scroll { overflow: auto; overscroll-behavior: contain; scrollbar-gutter: stable; }
        .subject-grades-tab table { width: 100%; min-width: 600px; border-collapse: separate; border-spacing: 0; font-size: 13px; }
        .subject-grades-tab th { position: sticky; top: 0; z-index: 1; background: #f8fafc; padding: 10px 12px; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
        .subject-grades-tab td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; }
        .subject-grades-tab th:first-child { width: 30%; }
        .subject-grades-tab td:first-child { overflow-wrap: anywhere; }
        .subject-grades-tab td:not(:first-child) { white-space: nowrap; }
        .subject-grades-tab tbody tr:last-child td { border-bottom: 0; }
        .subject-grades-tab .grades-scroll:focus-visible { outline: 2px solid #6366f1; outline-offset: -2px; }
        @media (min-width: 1024px) and (min-height: 600px) {
          .subject-grades-tab { height: var(--grades-tab-height, 60dvh); min-height: 0; overflow: hidden; }
          .subject-grades-tab .grades-panel { flex: 1; min-height: 0; display: flex; flex-direction: column; }
          .subject-grades-tab .grades-scroll { flex: 1; min-height: 0; }
        }
      `}</style>
      {/* Header & Term Classifier */}
      <div className="grades-toolbar flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Quarterly / Term Grades
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {selectedSemester === "ALL"
              ? "Showing consolidated records across all terms"
              : `Showing ${semesterLabel(selectedSemester as Semester)} classlist and grades`}
          </p>
        </div>

        {/* Term Classifier Pill Bar & Gradebook Link */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setSelectedSemester("SEMESTER_1")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedSemester === "SEMESTER_1"
                  ? "bg-white text-indigo-700 shadow-xs border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              1st Term
            </button>
            <button
              type="button"
              onClick={() => setSelectedSemester("SEMESTER_2")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedSemester === "SEMESTER_2"
                  ? "bg-white text-indigo-700 shadow-xs border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              2nd Term
            </button>
            <button
              type="button"
              onClick={() => setSelectedSemester("SEMESTER_3")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedSemester === "SEMESTER_3"
                  ? "bg-white text-indigo-700 shadow-xs border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              3rd Term
            </button>
            <button
              type="button"
              onClick={() => setSelectedSemester("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedSemester === "ALL"
                  ? "bg-white text-indigo-700 shadow-xs border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Terms
            </button>
          </div>

          <Link
            to={`/teacher/grades/semester/${subjectId}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-indigo-600 transition shadow-2xs"
          >
            <BookOpen size={13} />
            <span>Open Gradebook Sheet</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* Term Summary Cards & Search */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Students Enrolled
          </p>
          <p className="text-xl font-black text-slate-900 mt-0.5">{termStats.total}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{termStats.graded} with recorded grades</p>
        </div>

        <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 shadow-2xs">
          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
            Term Average
          </p>
          <p className="text-xl font-black text-indigo-950 mt-0.5 font-mono">{termStats.average}%</p>
          <p className="text-[10px] text-indigo-600 mt-0.5">Mean transmuted score</p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 shadow-2xs">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
            Passing (≥ 75%)
          </p>
          <p className="text-xl font-black text-emerald-700 mt-0.5">{termStats.passing}</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Satisfactory academic progress</p>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 shadow-2xs">
          <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
            At-Risk (&lt; 75%)
          </p>
          <p className="text-xl font-black text-rose-700 mt-0.5">{termStats.atRisk}</p>
          <p className="text-[10px] text-rose-600 mt-0.5">Requires remediation</p>
        </div>
      </div>

      {/* Search Input Filter */}
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3.5 py-2 shadow-2xs">
        <Search size={15} className="text-slate-400 shrink-0" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search students in ${selectedSemester === "ALL" ? "all terms" : semesterLabel(selectedSemester as Semester)}...`}
          className="w-full bg-transparent outline-none text-xs text-slate-700 font-medium"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="text-xs text-slate-400 hover:text-slate-600 font-bold"
          >
            Clear
          </button>
        )}
      </div>

      {/* Grades Table */}
      <div className="grades-panel bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredGrades.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            {searchQuery
              ? `No student matching "${searchQuery}" found in this term.`
              : `No recorded grades for ${selectedSemester === "ALL" ? "any term" : semesterLabel(selectedSemester as Semester)} yet. Open the Gradebook Sheet to record scores.`}
          </div>
        ) : (
          <div className="grades-scroll" tabIndex={0} role="region" aria-label="Student grades">
            <table className="w-full text-xs">
              <thead className="bg-slate-50/90 border-b border-slate-200">
                <tr className="text-left text-slate-500">
                  <th scope="col" className="px-4 py-3 font-bold text-slate-700">
                    Student Name
                  </th>

                  {selectedSemester === "ALL" && (
                    <th scope="col" className="px-4 py-3 font-bold text-slate-700">
                      Term
                    </th>
                  )}

                  <th scope="col" className="px-4 py-3 font-bold text-slate-700">
                    Written Work Total
                  </th>

                  <th scope="col" className="px-4 py-3 font-bold text-slate-700">
                    Transmuted Grade
                  </th>

                  <th scope="col" className="px-4 py-3 font-bold text-slate-700">
                    Status / Remarks
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredGrades.map((grade) => {
                  const numGrade = Number(grade.final_grade);
                  const isRecorded = grade.final_grade !== null && !Number.isNaN(numGrade);
                  const isPassing = isRecorded && numGrade >= 75;

                  return (
                    <tr key={grade.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {grade.student_name}
                      </td>

                      {selectedSemester === "ALL" && (
                        <td className="px-4 py-3 text-slate-600">
                          {semesterLabel(grade.semester)}
                        </td>
                      )}

                      <td className="px-4 py-3 text-slate-600 font-mono">
                        {grade.written_work_score !== null && grade.written_work_score !== undefined
                          ? `${grade.written_work_score} / ${grade.written_work_total || 100}`
                          : "—"}
                      </td>

                      <td className="px-4 py-3">
                        {isRecorded ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-xs ${
                              isPassing
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-rose-50 text-rose-800 border border-rose-200"
                            }`}
                          >
                            {numGrade.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-mono italic">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {isRecorded ? (
                          <span
                            className={`inline-flex items-center gap-1 font-semibold text-xs ${
                              isPassing ? "text-emerald-700" : "text-rose-700"
                            }`}
                          >
                            {isPassing ? (
                              <CheckCircle2 size={12} className="text-emerald-600" />
                            ) : (
                              <AlertTriangle size={12} className="text-rose-600" />
                            )}
                            {grade.remarks || (isPassing ? "Passed" : "Needs Intervention")}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Unrecorded</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}