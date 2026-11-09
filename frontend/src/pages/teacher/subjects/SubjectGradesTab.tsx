import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

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
    useState<Semester | "ALL">("ALL");

  const {
    data: grades = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useTeacherSubjectGrades(subjectId);

  const filteredGrades = useMemo(() => {
    if (selectedSemester === "ALL") {
      return grades;
    }

    return grades.filter(
      (grade) =>
        grade.semester === selectedSemester
    );
  }, [grades, selectedSemester]);

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
      {/* Header */}
      <div className="grades-toolbar flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">
            Grades
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            View student grades by semester.
          </p>
        </div>

        {/* Semester Filter */}
        <select
          aria-label="Filter grades by semester"
          value={selectedSemester}
          onChange={(e) =>
            setSelectedSemester(
              e.target.value as
                | Semester
                | "ALL"
            )
          }
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="ALL">
            All Semesters
          </option>

          <option value="SEMESTER_1">
            1st Semester
          </option>

          <option value="SEMESTER_2">
            2nd Semester
          </option>

          <option value="SEMESTER_3">
            3rd Semester
          </option>
        </select>
      </div>

      {/* Grades Table */}
      <div className="grades-panel bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {filteredGrades.length === 0 ? (
          <div className="p-8 text-center text-slate-600">
            No semester grades yet.
          </div>
        ) : (
          <div className="grades-scroll" tabIndex={0} role="region" aria-label="Student grades">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-slate-500">
                  <th scope="col" className="px-5 py-3">
                    Student
                  </th>

                  <th scope="col" className="px-5 py-3">
                    Semester
                  </th>

                  <th scope="col" className="px-5 py-3">
                    Written Work
                  </th>

                  <th scope="col" className="px-5 py-3">
                    Final Grade
                  </th>

                  <th scope="col" className="px-5 py-3">
                    Remarks
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredGrades.map(
                  (grade) => (
                    <tr
                      key={grade.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 font-semibold text-slate-800">
                        {
                          grade.student_name
                        }
                      </td>

                      <td className="px-5 py-4">
                        {semesterLabel(
                          grade.semester
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {
                          grade.written_work_score
                        }
                        /
                        {
                          grade.written_work_total
                        }
                      </td>

                      <td className="px-5 py-4 font-black text-slate-900">
                        {grade.final_grade ??
                          "—"}
                      </td>

                      <td className="px-5 py-4">
                        {grade.remarks ??
                          "—"}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}