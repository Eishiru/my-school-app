import React, { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Users, FileText, TrendingUp, BookOpen, type LucideIcon, ArrowRight, Clock } from "lucide-react";
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: Quizzes */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                Quizzes
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Showing {Math.min(quizzes.length, 5)} of {quizzes.length} quizzes
              </p>

              <Link
                to={`/teacher/subject/${subjectId}/activities`}
                className="text-xs font-bold text-indigo-600 hover:underline"
              >
                View Activities
              </Link>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm divide-y divide-slate-100">
              {quizzesLoading ? (
                <div className="p-6 text-slate-500">
                  Loading quizzes...
                </div>
              ) : quizzesError ? (
                <div className="p-6 text-rose-600">
                  Failed to load quizzes.
                </div>
              ) : quizzes.length === 0 ? (
                <div className="p-6 text-slate-600">
                  No quizzes yet for this subject offering.
                </div>
              ) : (
                quizzes.map((quiz) => {
                  const due = quiz.close_time
                    ? formatDateShort(
                        quiz.close_time
                      )
                    : formatDateShort(
                        quiz.open_time
                      );

                  return (
                    <Link
                      key={quiz.id}
                      to={`/teacher/activities/${quiz.id}`}
                      className="block"
                    >
                      <div className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors group">
                        <div className="flex items-center gap-5">
                          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-all">
                            <FileText size={20} />
                          </div>

                          <div>
                            <h4 className="font-bold text-slate-800 text-base">
                              {quiz.title}
                            </h4>

                            <p className="text-xs font-medium text-slate-400">
                              {quiz.open_time
                                ? `Starts ${formatDateShort(
                                    quiz.open_time
                                  )}`
                                : "No schedule"}{" "}
                              •{" "}
                              {quiz.close_time
                                ? `Ends ${formatDateShort(
                                    quiz.close_time
                                  )}`
                                : "No end date"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-bold text-slate-300 uppercase">
                              Due
                            </p>

                            <p className="text-xs font-bold text-slate-600">
                              {due}
                            </p>
                          </div>

                          <StatusPill
                            status={quiz.status}
                          />
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: Recent Grades */}
          
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Recent Quiz Grades
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Latest student submissions
                  </p>
                </div>

                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold">
                  {Math.min(recent.length, 5)} submissions
                </span>
              </div>

              {/* Content */}
              <div className="min-h-[180px]">

                {recentLoading ? (
                  <div className="p-8 flex flex-col items-center justify-center text-center">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
                    <p className="text-sm text-slate-500">
                      Loading recent grades...
                    </p>
                  </div>
                ) : recentError ? (
                  <div className="p-8 text-center">
                    <p className="text-sm font-medium text-rose-600">
                      Failed to load recent quiz grades.
                    </p>
                  </div>
                ) : recent.length === 0 ? (
                  <div className="p-8 flex flex-col items-center justify-center text-center">
                    <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center mb-3">
                      <FileText className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">
                      No quiz submissions yet
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Student quiz results will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {recent.slice(0, 5).map((grade, idx) => (
                      <div
                        key={idx}
                        className="px-5 py-4 hover:bg-slate-50/70 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-4">

                          {/* Student Information */}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              {grade.student}
                            </p>

                            <p className="text-xs text-slate-500 mt-1 truncate">
                              {grade.quiz}
                            </p>
                          </div>

                          {/* Grade Information */}
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-extrabold text-slate-900 tabular-nums">
                              {grade.score}/{grade.total}
                            </p>

                            <span className="inline-flex mt-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-bold tabular-nums">
                              {Number(grade.percent).toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        {/* Submission Date */}
                        {grade.submitted_at && (
                          <div className="flex items-center gap-1.5 mt-3">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <p className="text-[11px] text-slate-400">
                              Submitted:{" "}
                              {new Date(grade.submitted_at).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/40">
                <Link
                  to={`/teacher/subject/${subjectId}/analytics`}
                  className="w-full py-3 px-4 bg-slate-900 text-white text-[11px] font-extrabold uppercase tracking-[0.15em] rounded-xl hover:bg-indigo-600 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  Detailed Analytics
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

            </div>
          </div>
          
        </div>
      </main>
    </section>
  );
}