import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Download,
  RefreshCw,
  Users,
  ClipboardList,
  BookOpen,
  Layers,
  AlertCircle,
  ChevronRight,
  BarChart3,
} from "lucide-react";

import { useTeacherSubmissionsSummary } from "../../../hooks/useTeacherSubjects";
import type { SubmissionSubjectRow } from "../../../types/teacherTypes";

type ViewType = "BY_SUBJECT" | "TOTALS";

function safePct(numerator: number, denominator: number) {
  if (!denominator || denominator <= 0) {
    return 0;
  }
  return Math.round((numerator / denominator) * 100);
}

function escapeCsvValue(value: unknown) {
  const stringValue = String(value ?? "");
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

export default function TeacherSubmissionsPage() {
  const [view, setView] = useState<ViewType>("BY_SUBJECT");

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useTeacherSubmissionsSummary();

  const totals = data?.totals ?? null;
  const rows = data?.by_subject ?? [];

  const subjectRows = useMemo(() => {
    return rows.map((row) => {
      const attempted = row.unique_students ?? 0;
      const total = row.total_students ?? 0;

      return {
        ...row,
        attempted,
        total,
        percentage: safePct(attempted, total),
      };
    });
  }, [rows]);

  function downloadSubjectTotalsCsv() {
    const headers = [
      "subject_offering_id",
      "subject",
      "attempted_students",
      "total_students",
      "submission_rate_pct",
      "submitted_attempts",
    ];

    const lines = subjectRows.map((row) => {
      const values = [
        row.subject_offering_id,
        row.subject,
        row.attempted,
        row.total,
        row.percentage,
        row.submitted_attempts ?? 0,
      ];

      return values.map(escapeCsvValue).join(",");
    });

    const csv = [headers.join(","), ...lines].join("\n");
    downloadCsv("submissions_by_subject_totals.csv", csv);
  }

  function downloadOverallTotalsCsv() {
    if (!totals) return;

    const headers = [
      "overall_attempts",
      "overall_unique_students",
      "overall_quizzes",
      "overall_subject_offerings",
    ];

    const values = [
      totals.overall_attempts,
      totals.overall_unique_students,
      totals.overall_quizzes,
      totals.overall_subject_offerings,
    ];

    const csv = [headers.join(","), values.map(escapeCsvValue).join(",")].join("\n");
    downloadCsv("submissions_overall_totals.csv", csv);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Student Submissions
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review quiz participation, student attempts, and submission activity across your subjects.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={downloadSubjectTotalsCsv}
            disabled={subjectRows.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 shadow-xs transition-colors"
          >
            <Download size={13} className="text-slate-500" />
            <span>Subject CSV</span>
          </button>

          <button
            type="button"
            onClick={downloadOverallTotalsCsv}
            disabled={!totals}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 shadow-xs transition-colors"
          >
            <Download size={13} className="text-slate-500" />
            <span>Overall CSV</span>
          </button>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="inline-flex p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 w-fit">
        <button
          type="button"
          onClick={() => setView("BY_SUBJECT")}
          className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            view === "BY_SUBJECT"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          By Subject
        </button>

        <button
          type="button"
          onClick={() => setView("TOTALS")}
          className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            view === "TOTALS"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          Overall Totals
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-8 text-center max-w-xl mx-auto">
          <AlertCircle size={24} className="mx-auto text-rose-500" />
          <h2 className="mt-2 text-sm font-semibold text-rose-900">
            Failed to load submissions
          </h2>
          <p className="mt-1 text-xs text-rose-600">
            {error instanceof Error ? error.message : "Something went wrong."}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors shadow-xs"
          >
            <RefreshCw size={12} />
            <span>Try Again</span>
          </button>
        </div>
      ) : (
        <>
          {view === "TOTALS" && <OverallTotals totals={totals} />}
          {view === "BY_SUBJECT" && <SubjectSubmissionList rows={subjectRows} />}
        </>
      )}
    </div>
  );
}

/* ==============================
   Overall Totals
============================== */

function OverallTotals({
  totals,
}: {
  totals: {
    overall_attempts: number;
    overall_unique_students: number;
    overall_quizzes: number;
    overall_subject_offerings: number;
  } | null;
}) {
  if (!totals) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-8 text-center text-xs text-slate-500">
        No overall submission data available.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        icon={<ClipboardList size={18} />}
        title="Total Attempts"
        value={totals.overall_attempts}
        hint="Submitted quiz attempts"
        accent="bg-indigo-50 text-indigo-600 border-indigo-100/80"
      />

      <StatCard
        icon={<Users size={18} />}
        title="Unique Students"
        value={totals.overall_unique_students}
        hint="Students who participated"
        accent="bg-emerald-50 text-emerald-600 border-emerald-100/80"
      />

      <StatCard
        icon={<BookOpen size={18} />}
        title="Total Quizzes"
        value={totals.overall_quizzes}
        hint="Quizzes with activity"
        accent="bg-amber-50 text-amber-600 border-amber-100/80"
      />

      <StatCard
        icon={<Layers size={18} />}
        title="Subject Offerings"
        value={totals.overall_subject_offerings}
        hint="Subjects represented"
        accent="bg-purple-50 text-purple-600 border-purple-100/80"
      />
    </div>
  );
}

/* ==============================
   Subject List
============================== */

type DisplaySubjectRow = SubmissionSubjectRow & {
  attempted: number;
  total: number;
  percentage: number;
};

function SubjectSubmissionList({ rows }: { rows: DisplaySubjectRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-12 text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
          <BarChart3 size={22} />
        </div>
        <h3 className="text-sm font-semibold text-slate-800">No submissions yet</h3>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          No student submissions have been recorded for your assigned subjects yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Subject Participation & Attempts
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Participation is computed from unique students who completed at least one quiz attempt.
          </p>
        </div>
        <div className="text-xs font-medium text-slate-500">
          {rows.length} {rows.length === 1 ? "offering" : "offerings"}
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {rows.map((row) => (
          <div
            key={row.subject_offering_id}
            className="p-5 hover:bg-slate-50/75 transition-colors"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              {/* Subject info */}
              <div className="md:w-80 min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 truncate">
                  {row.subject}
                </h3>

                <div className="mt-1 text-xs text-slate-500 flex items-center gap-2">
                  <span>
                    Attempted:{" "}
                    <strong className="font-semibold text-slate-800">
                      {row.attempted}
                    </strong>{" "}
                    / {row.total} students
                  </span>
                  <span>•</span>
                  <span
                    className={`font-semibold ${
                      row.percentage >= 80
                        ? "text-emerald-600"
                        : row.percentage >= 50
                        ? "text-indigo-600"
                        : "text-amber-600"
                    }`}
                  >
                    {row.percentage}% rate
                  </span>
                </div>

                <div className="mt-0.5 text-xs text-slate-400">
                  {row.submitted_attempts ?? 0} total attempt
                  {row.submitted_attempts === 1 ? "" : "s"}
                </div>

                <Link
                  to={`/teacher/submissions/${row.subject_offering_id}`}
                  className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  <span>View per-quiz breakdown</span>
                  <ChevronRight size={13} />
                </Link>
              </div>

              {/* Progress bar */}
              <div className="flex-1 max-w-md">
                <div className="flex justify-between items-center mb-1.5 text-xs">
                  <span className="font-medium text-slate-500">Student Turnout</span>
                  <span className="font-bold font-mono text-slate-700">
                    {row.percentage}%
                  </span>
                </div>

                <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      row.percentage >= 80
                        ? "bg-emerald-500"
                        : row.percentage >= 50
                        ? "bg-indigo-600"
                        : "bg-amber-500"
                    }`}
                    style={{
                      width: `${Math.min(100, Math.max(0, row.percentage))}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ==============================
   Stat Card
============================== */

function StatCard({
  icon,
  title,
  value,
  hint,
  accent = "bg-indigo-50 text-indigo-600 border-indigo-100/80",
}: {
  icon: React.ReactNode;
  title: string;
  value: number | string;
  hint: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm hover:border-indigo-200 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
            {title}
          </span>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 font-mono">
            {value}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">{hint}</p>
        </div>
        <div className={`p-2.5 rounded-xl border ${accent}`}>{icon}</div>
      </div>
    </div>
  );
}

/* ==============================
   Loading
============================== */

function LoadingState() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-24 rounded-xl border border-slate-200/80 bg-white animate-pulse"
        />
      ))}
    </div>
  );
}