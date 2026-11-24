import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  FileText,
  TrendingUp,
  BookOpen,
  type LucideIcon,
  ArrowRight,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {useRecentQuizGrades, useTeacherSubject, useTeacherSubjectQuizzes} from "../../../hooks/useTeacherSubjects";

import type { QuizStatus } from "../../../types/teacherTypes";

// ---------------- Types ----------------

type StatCardProps = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  colorClass:
    | "stat-green"
    | "stat-red"
    | "stat-purple"
    | "stat-orange"
    | "stat-blue";
};

// ---------------- Helpers ----------------

function formatDateShort(
  iso: string | null | undefined
) {
  if (!iso) return "—";

  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) {
    return "—";
  }

  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
  });
}

// ---------------- UI ----------------

const SubjectStatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  colorClass,
}) => {
  const colorMap = {
    "stat-green": "bg-emerald-100 text-emerald-600",
    "stat-red": "bg-rose-100 text-rose-600",
    "stat-purple": "bg-purple-100 text-purple-600",
    "stat-orange": "bg-amber-100 text-amber-600",
    "stat-blue": "bg-blue-100 text-blue-600",
  };

  return (
    <div className="flex items-center p-4 bg-white rounded-xl shadow-md border border-gray-100">
      <div
        className={`p-3 rounded-full mr-4 ${colorMap[colorClass]}`}
      >
        <Icon size={24} />
      </div>

      <div>
        <p className="text-3xl font-bold text-gray-900">
          {value}
        </p>

        <h3 className="text-sm font-medium text-gray-500 mt-1">
          {title}
        </h3>
      </div>
    </div>
  );
};

function StatusPill({
  status,
}: {
  status: QuizStatus;
}) {
  const cls =
    status === "OPEN"
      ? "bg-emerald-50 border-emerald-100 text-emerald-600"
      : status === "CLOSED"
      ? "bg-rose-50 border-rose-100 text-rose-700"
      : status === "SCHEDULED"
      ? "bg-amber-50 border-amber-100 text-amber-600"
      : "bg-slate-50 border-slate-200 text-slate-500";

  return (
    <span
      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${cls}`}
    >
      {status}
    </span>
  );
}

// ---------------- Component ----------------

export default function SubjectPage() {
  const { id } = useParams<{ id: string }>();

  const subjectId = Number(id || 0);

  const {
    data: offering,
    isLoading: subjectLoading,
    isError: subjectError,
    error: subjectErrorData,
  } = useTeacherSubject(subjectId);

  const {
    data: quizzes = [],
    isLoading: quizzesLoading,
    isError: quizzesError,
  } = useTeacherSubjectQuizzes(subjectId);

  const {
    data: recent = [],
    isLoading: recentLoading,
    isError: recentError,
  } = useRecentQuizGrades(subjectId);

  const computed = useMemo(() => {
    const totalStudents =
      offering?.students ?? 0;

    const openQuizzes = quizzes.filter(
      (quiz) => quiz.status === "OPEN"
    ).length;

    const closedQuizzes = quizzes.filter(
      (quiz) => quiz.status === "CLOSED"
    ).length;

    return {
      totalStudents,
      openQuizzes,
      closedQuizzes,
    };
  }, [offering, quizzes]);

  // ---------------- Pagination ----------------
  const [quizPage, setQuizPage] = useState(1);
  const QUIZZES_PER_PAGE = 5;
  const totalQuizPages = Math.max(1, Math.ceil(quizzes.length / QUIZZES_PER_PAGE));
  const paginatedQuizzes = useMemo(() => {
    const start = (quizPage - 1) * QUIZZES_PER_PAGE;
    return quizzes.slice(start, start + QUIZZES_PER_PAGE);
  }, [quizzes, quizPage]);

  const [recentPage, setRecentPage] = useState(1);
  const RECENT_PER_PAGE = 5;
  const totalRecentPages = Math.max(1, Math.ceil(recent.length / RECENT_PER_PAGE));
  const paginatedRecent = useMemo(() => {
    const start = (recentPage - 1) * RECENT_PER_PAGE;
    return recent.slice(start, start + RECENT_PER_PAGE);
  }, [recent, recentPage]);

  // ---------------- Invalid ID ----------------

  if (!subjectId) {
    return (
      <div className="p-10 text-center bg-gray-50 min-h-screen">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-3">
          Invalid Subject
        </h1>

        <p className="text-gray-600 mb-6">
          The subject ID is invalid.
        </p>

        <Link
          to="/teacher/subject"
          className="inline-flex items-center px-4 py-2 text-white bg-blue-600 rounded-md"
        >
          <ArrowLeft
            size={16}
            className="mr-2"
          />

          Back to Subject List
        </Link>
      </div>
    );
  }

  // ---------------- Main subject loading ----------------

  if (subjectLoading) {
    return (
      <div className="p-10 text-center bg-gray-50 min-h-screen">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-3">
          Loading Subject...
        </h1>

        <p className="text-gray-600">
          Fetching subject information.
        </p>
      </div>
    );
  }

  // ---------------- Main subject error ----------------

  if (subjectError || !offering) {
    return (
      <div className="p-10 text-center bg-gray-50 min-h-screen">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-3">
          Cannot Load Subject
        </h1>

        <p className="text-gray-600 mb-6">
          {subjectErrorData instanceof Error
            ? subjectErrorData.message
            : "Subject not found."}
        </p>

        <Link
          to="/teacher/subject"
          className="inline-flex items-center px-4 py-2 text-white bg-blue-600 rounded-md"
        >
          <ArrowLeft
            size={16}
            className="mr-2"
          />

          Back to Subject List
        </Link>
      </div>
    );
  }

  // ---------------- Main UI ----------------

  return (
    <section className="flex flex-col bg-slate-50/30 min-h-screen p-2 font-sans">
      <main className="mx-auto space-y-8 w-full max-w-screen">
        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <SubjectStatCard
            title="Avg. Performance"
            value={
              offering.average != null
                ? `${Number(
                    offering.average
                  ).toFixed(1)}%`
                : "—"
            }
            icon={TrendingUp}
            colorClass={
              typeof offering.average === "number" &&
              offering.average < 85
                ? "stat-red"
                : "stat-green"
            }
          />

          <SubjectStatCard
            title="Total Students"
            value={computed.totalStudents}
            icon={Users}
            colorClass="stat-purple"
          />

          <SubjectStatCard
            title="Open Quizzes"
            value={computed.openQuizzes}
            icon={FileText}
            colorClass="stat-orange"
          />

          <SubjectStatCard
            title="Closed Quizzes"
            value={computed.closedQuizzes}
            icon={BookOpen}
            colorClass="stat-blue"
          />
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Quizzes List (Paginated) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Assigned Quizzes & Activities
                </h2>
                <p className="text-xs text-slate-500">
                  {quizzes.length} total activity items
                </p>
              </div>

              <Link
                to={`/teacher/subject/${subjectId}/activities`}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Manage All →
              </Link>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              {quizzesLoading ? (
                <div className="p-6 text-xs text-slate-500">
                  Loading quizzes...
                </div>
              ) : quizzesError ? (
                <div className="p-6 text-xs text-rose-600">
                  Failed to load quizzes.
                </div>
              ) : quizzes.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No quizzes created yet for this subject offering.
                </div>
              ) : (
                <>
                  <div className="divide-y divide-slate-100">
                    {paginatedQuizzes.map((quiz) => {
                      const due = quiz.close_time
                        ? formatDateShort(quiz.close_time)
                        : formatDateShort(quiz.open_time);

                      return (
                        <Link
                          key={quiz.id}
                          to={`/teacher/activities/${quiz.id}`}
                          className="block hover:bg-slate-50/80 transition-colors"
                        >
                          <div className="flex items-center justify-between p-4 gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-9 w-9 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 shrink-0">
                                <FileText size={17} />
                              </div>

                              <div className="min-w-0">
                                <h4 className="font-semibold text-slate-900 text-xs truncate">
                                  {quiz.title}
                                </h4>
                                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                                  {quiz.open_time ? `Opens: ${formatDateShort(quiz.open_time)}` : "No open date"}{" "}
                                  • {quiz.close_time ? `Closes: ${formatDateShort(quiz.close_time)}` : "No deadline"}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right hidden sm:block">
                                <p className="text-[10px] text-slate-400 uppercase font-semibold">
                                  Due
                                </p>
                                <p className="text-xs font-semibold text-slate-700">
                                  {due}
                                </p>
                              </div>
                              <StatusPill status={quiz.status} />
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Quizzes Pagination Controls */}
                  {totalQuizPages > 1 && (
                    <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
                      <span>
                        Page <strong className="text-slate-800">{quizPage}</strong> of {totalQuizPages}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setQuizPage((p) => Math.max(1, p - 1))}
                          disabled={quizPage === 1}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white text-xs font-medium hover:bg-slate-100 disabled:opacity-40 transition-colors"
                        >
                          <ChevronLeft size={13} />
                          Prev
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuizPage((p) => Math.min(totalQuizPages, p + 1))}
                          disabled={quizPage === totalQuizPages}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white text-xs font-medium hover:bg-slate-100 disabled:opacity-40 transition-colors"
                        >
                          Next
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* RIGHT: Recent Quiz Grades (Professional Dashboard Table with Pagination) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Recent Submissions
                </h2>
                <p className="text-xs text-slate-500">
                  {recent.length} recorded submissions
                </p>
              </div>

              <Link
                to={`/teacher/subject/${subjectId}/analytics`}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Analytics →
              </Link>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              {recentLoading ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading submissions...
                </div>
              ) : recentError ? (
                <div className="p-6 text-center text-xs text-rose-600">
                  Failed to load recent submissions.
                </div>
              ) : recent.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No student quiz submissions recorded yet.
                </div>
              ) : (
                <>
                  <div className="divide-y divide-slate-100">
                    {paginatedRecent.map((grade, idx) => {
                      const pctNum = Number(grade.percent || 0);
                      const isPassing = pctNum >= 75;

                      return (
                        <div
                          key={idx}
                          className="px-4 py-3 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-900 truncate">
                              {grade.student}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {grade.quiz}
                            </p>
                            {grade.submitted_at && (
                              <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                <Clock size={10} />
                                {new Date(grade.submitted_at).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            )}
                          </div>

                          <div className="shrink-0 text-right">
                            <span className="font-mono font-bold text-slate-900 text-xs block">
                              {grade.score} / {grade.total}
                            </span>
                            <span
                              className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                isPassing
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {pctNum.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Recent Grades Pagination Controls */}
                  {totalRecentPages > 1 && (
                    <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
                      <span>
                        Page <strong className="text-slate-800">{recentPage}</strong> of {totalRecentPages}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setRecentPage((p) => Math.max(1, p - 1))}
                          disabled={recentPage === 1}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white text-xs font-medium hover:bg-slate-100 disabled:opacity-40 transition-colors"
                        >
                          <ChevronLeft size={13} />
                          Prev
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecentPage((p) => Math.min(totalRecentPages, p + 1))}
                          disabled={recentPage === totalRecentPages}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white text-xs font-medium hover:bg-slate-100 disabled:opacity-40 transition-colors"
                        >
                          Next
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </section>
  );
}