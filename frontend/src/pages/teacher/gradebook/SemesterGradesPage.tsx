import { useMemo, useState } from "react";
import {
  BookOpen,
  Search,
  ChevronRight,
  RefreshCw,
  Calendar,
  GraduationCap,
  X,
  Layers,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useTeacherSubjects } from "../../../hooks/useTeacherSubjects";
import { useActiveAcademicTerm } from "../../../hooks/useAdminData";

function prettyGrade(g?: string) {
  return g ? g.replaceAll("_", " ") : "—";
}

export default function SemesterGradesPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const {
    data: subjects = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useTeacherSubjects();

  const { data: activeTerm } = useActiveAcademicTerm();

  const filteredSubjects = useMemo(() => {
    const needle = q.trim().toLowerCase();

    if (!needle) {
      return subjects;
    }

    return subjects.filter((subject) => {
      const haystack = `
        ${subject.name}
        ${prettyGrade(subject.grade)}
        ${subject.section ?? ""}
        ${subject.room_number ?? ""}
      `.toLowerCase();

      return haystack.includes(needle);
    });
  }, [subjects, q]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {/* <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100/80">
              <GraduationCap size={12} />
              <span>Gradebook</span>
            </div>

            {activeTerm?.school_year && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <Calendar size={11} className="text-emerald-600" />
                <span>
                  Active: A.Y. {activeTerm.school_year.name} • {activeTerm.active_semester?.name_display || activeTerm.active_semester?.name || "Semester 1"}
                </span>
              </div>
            )}
          </div> */}

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Semester Gradebooks
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Select a subject offering to record, edit, and review semester grade matrices.
          </p>
        </div>

        {/* <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-lg border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 shadow-xs transition-colors"
        >
          <RefreshCw
            size={14}
            className={isFetching ? "animate-spin text-indigo-600" : "text-slate-400"}
          />
          <span>{isFetching ? "Refreshing data…" : "Refresh"}</span>
        </button> */}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            size={15}
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search subjects by title, grade, or section..."
            className="w-full rounded-lg border border-slate-200/80 bg-white py-2 pl-9 pr-9 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Layers size={14} className="text-slate-400" />
          <span>
            {filteredSubjects.length} of {subjects.length} subjects shown
          </span>
        </div>
      </div>

      {/* Subject Offerings Grid */}
      <div>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-40 rounded-xl border border-slate-200/80 bg-white p-5 animate-pulse flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="h-5 w-3/4 rounded bg-slate-200" />
                  <div className="h-3 w-1/2 rounded bg-slate-100" />
                </div>
                <div className="h-4 w-1/3 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-6 text-center max-w-xl mx-auto">
            <h2 className="text-sm font-semibold text-rose-800">
              Unable to load subjects
            </h2>
            <p className="mt-1 text-xs text-rose-600">
              {error instanceof Error ? error.message : "Something went wrong."}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition-colors"
            >
              <RefreshCw size={12} />
              <span>Try again</span>
            </button>
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="rounded-xl border border-slate-200/80 bg-white p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <BookOpen size={22} />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">
              No subjects found
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              {subjects.length === 0
                ? "No subject offerings are currently assigned to your account."
                : "No subjects matched your search keyword. Try clearing the filter."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSubjects.map((subject) => {
              const hasAverage = typeof subject.average === "number";
              const isPassing = hasAverage && (subject.average as number) >= 75;

              return (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() =>
                    navigate(`/teacher/grades/semester/${subject.id}`, {
                      state: { subjectName: subject.name },
                    })
                  }
                  className="group w-full text-left rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="h-9 w-9 shrink-0 rounded-lg bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          <BookOpen size={16} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                            {subject.name}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {prettyGrade(subject.grade)} • Section {subject.section ?? "—"}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                          Class Avg
                        </span>
                        <span
                          className={`text-sm font-bold font-mono ${
                            !hasAverage
                              ? "text-slate-400"
                              : isPassing
                              ? "text-emerald-600"
                              : "text-amber-600"
                          }`}
                        >
                          {hasAverage ? `${(subject.average as number).toFixed(1)}%` : "—"}
                        </span>
                      </div>
                    </div>

                    {subject.room_number && (
                      <div className="mt-3 text-xs text-slate-400">
                        Room: <span className="font-medium text-slate-700">{subject.room_number}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 text-slate-500 font-medium">
                      <Users size={13} className="text-slate-400" />
                      {typeof subject.students === "number" ? subject.students : 0} Students
                    </span>

                    <div className="inline-flex items-center gap-1 font-semibold text-indigo-600 group-hover:text-indigo-700 transition-colors">
                      <span>Open Gradebook</span>
                      <ChevronRight
                        size={14}
                        className="group-hover:translate-x-0.5 transition-transform"
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Info panel */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs text-slate-700">
        <h3 className="font-semibold text-indigo-900 mb-1.5 flex items-center gap-2">
          <GraduationCap size={15} className="text-indigo-600" />
          <span>About the DepEd Standard Semester Grading System</span>
        </h3>
        <p className="text-slate-600 leading-relaxed">
          Written Works, Performance Tasks, and Quarterly Assessments are weighted according to DepEd guidelines and automatically compute into raw scores, transmuted grades, and semester averages. Grades entered here sync directly with the student portal and advisory SF9 report cards.
        </p>
      </div>
    </div>
  );
}