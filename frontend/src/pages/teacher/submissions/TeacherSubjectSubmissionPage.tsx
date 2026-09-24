import {
  useMemo,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  useQueryClient,
} from "@tanstack/react-query";

import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Users,
  ArrowLeft,
} from "lucide-react";

import {
  useTeacherSubjectSubmissionDetail,
} from "../../../hooks/useTeacherSubjects";

import {
  getQuizStudentSubmissions,
} from "../../../api/teacherApi";

import type {
  StudentSubmission,
} from "../../../types/teacherTypes";

/* ==============================
   Helpers
============================== */

/**
 * One row per student.
 *
 * If a student has multiple attempts:
 * 1. Keep the highest score.
 * 2. If tied, keep the most recent.
 */
function uniqueByStudentHighestScore(
  rows: StudentSubmission[]
) {
  const map =
    new Map<
      number,
      StudentSubmission
    >();

  for (const row of rows) {
    const previous =
      map.get(
        row.student_id
      );

    if (!previous) {
      map.set(
        row.student_id,
        row
      );

      continue;
    }

    const previousScore =
      Number.isFinite(
        previous.score
      )
        ? previous.score
        : 0;

    const currentScore =
      Number.isFinite(
        row.score
      )
        ? row.score
        : 0;

    if (
      currentScore >
      previousScore
    ) {
      map.set(
        row.student_id,
        row
      );

      continue;
    }

    if (
      currentScore ===
      previousScore
    ) {
      const previousTime =
        new Date(
          previous.submitted_at
        ).getTime();

      const currentTime =
        new Date(
          row.submitted_at
        ).getTime();

      if (
        currentTime >
        previousTime
      ) {
        map.set(
          row.student_id,
          row
        );
      }
    }
  }

  return Array.from(
    map.values()
  ).sort(
    (
      first,
      second
    ) => {
      const firstScore =
        Number.isFinite(
          first.score
        )
          ? first.score
          : 0;

      const secondScore =
        Number.isFinite(
          second.score
        )
          ? second.score
          : 0;

      if (
        secondScore !==
        firstScore
      ) {
        return (
          secondScore -
          firstScore
        );
      }

      return (
        new Date(
          second.submitted_at
        ).getTime() -
        new Date(
          first.submitted_at
        ).getTime()
      );
    }
  );
}

function formatDateTime(
  value?: string | null
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleString();
}

/* ==============================
   Component
============================== */

export default function TeacherSubjectSubmissionsPage() {
  const {
    subjectOfferingId,
  } =
    useParams<{
      subjectOfferingId:
        string;
    }>();

  const subjectId =
    Number(
      subjectOfferingId ||
        0
    );

  const queryClient =
    useQueryClient();

  /*
   * Main subject detail
   */
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } =
    useTeacherSubjectSubmissionDetail(
      subjectId
    );

  /*
   * UI state only
   */
  const [
    openQuizId,
    setOpenQuizId,
  ] =
    useState<number | null>(
      null
    );

  /*
   * Per-quiz submission data
   *
   * We keep only the result map
   * here because quizzes are
   * loaded lazily when expanded.
   *
   * React Query still owns the
   * network/cache behavior.
   */
  const [
    quizSubmissions,
    setQuizSubmissions,
  ] =
    useState<
      Record<
        number,
        StudentSubmission[]
      >
    >({});

  const [
    loadingQuizId,
    setLoadingQuizId,
  ] =
    useState<number | null>(
      null
    );

  const [
    quizErrors,
    setQuizErrors,
  ] =
    useState<
      Record<
        number,
        string
      >
    >({});

  /*
   * Lazy-load quiz submissions
   * using React Query's cache.
   */
  async function loadQuizSubmissions(
    quizId: number
  ) {
    /*
     * Already loaded in local view.
     */
    if (
      quizSubmissions[
        quizId
      ]
    ) {
      return;
    }

    setLoadingQuizId(
      quizId
    );

    setQuizErrors(
      (
        previous
      ) => {
        const next = {
          ...previous,
        };

        delete next[
          quizId
        ];

        return next;
      }
    );

    try {
      const submissions =
        await queryClient.fetchQuery(
          {
            queryKey: [
              "teacher",
              "quizzes",
              quizId,
              "submissions",
            ],

            queryFn: () =>
              getQuizStudentSubmissions(
                quizId
              ),

            staleTime:
              2 *
              60 *
              1000,
          }
        );

      setQuizSubmissions(
        (
          previous
        ) => ({
          ...previous,

          [quizId]:
            submissions,
        })
      );
    } catch (error) {
      console.error(
        "Failed to load quiz submissions:",
        error
      );

      setQuizErrors(
        (
          previous
        ) => ({
          ...previous,

          [quizId]:
            error instanceof
            Error
              ? error.message
              : "Failed to load submitted students.",
        })
      );
    } finally {
      setLoadingQuizId(
        (
          current
        ) =>
          current ===
          quizId
            ? null
            : current
      );
    }
  }

  async function toggleQuiz(
    quizId: number
  ) {
    if (
      openQuizId ===
      quizId
    ) {
      setOpenQuizId(
        null
      );

      return;
    }

    setOpenQuizId(
      quizId
    );

    await loadQuizSubmissions(
      quizId
    );
  }

  /*
   * Invalid route
   */
  if (
    !Number.isFinite(
      subjectId
    ) ||
    subjectId <= 0
  ) {
    return (
      <ErrorState
        message="Invalid or missing subject offering."
      />
    );
  }

  if (isLoading) {
    return (
      <LoadingState />
    );
  }

  if (isError) {
    return (
      <ErrorState
        message={
          error instanceof
          Error
            ? error.message
            : "Failed to load subject submissions."
        }
        onRetry={() =>
          refetch()
        }
      />
    );
  }

  if (!data) {
    return (
      <ErrorState
        message="No submission data available."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <Link
            to="/teacher/submissions"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shrink-0 mb-3"
          >
            <ArrowLeft size={13} />
            <span>Back to Submissions</span>
          </Link>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {data.subject}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            <span className="font-semibold text-slate-800">
              {data.totals.unique_students}
            </span>
            {" / "}
            <span className="font-semibold text-slate-800">
              {data.total_students}
            </span>{" "}
            students attempted •{" "}
            <span className="font-semibold text-indigo-600">
              {data.totals.submission_rate}% rate
            </span>{" "}
            • {data.totals.attempts} total attempt
            {data.totals.attempts === 1 ? "" : "s"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex self-start items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 shadow-xs transition-colors"
        >
          <RefreshCw
            size={13}
            className={isFetching ? "animate-spin text-indigo-600" : "text-slate-400"}
          />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Unique Students"
          value={data.totals.unique_students}
          description={`Out of ${data.total_students} enrolled`}
        />

        <SummaryCard
          label="Total Attempts"
          value={data.totals.attempts}
          description="Submitted quiz attempts"
        />

        <SummaryCard
          label="Quizzes"
          value={data.quizzes.length}
          description="Quizzes in this subject"
        />
      </div>

      {/* Quizzes */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-sm font-semibold text-slate-900">
            Quiz Submission Breakdown
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Expand a quiz to view students. Multiple attempts are reduced to the student's highest score.
          </p>
        </div>


          {data.quizzes.length ===
          0 ? (

            <div className="p-8 text-center text-sm text-slate-500">
              No quizzes yet.
            </div>

          ) : (

            <div className="divide-y divide-slate-100">

              {data.quizzes.map(
                (
                  quiz
                ) => {

                  const isOpen =
                    openQuizId ===
                    quiz.quiz_id;

                  const raw =
                    quizSubmissions[
                      quiz.quiz_id
                    ] || [];

                  const submissions =
                    uniqueByStudentHighestScore(
                      raw
                    );

                  const isQuizLoading =
                    loadingQuizId ===
                    quiz.quiz_id;

                  const quizError =
                    quizErrors[
                      quiz.quiz_id
                    ];

                  return (

                    <div
                      key={
                        quiz.quiz_id
                      }
                    >

                      {/* Quiz row */}

                      <button
                        type="button"
                        onClick={() =>
                          toggleQuiz(
                            quiz.quiz_id
                          )
                        }
                        className="w-full text-left px-6 py-5 hover:bg-slate-50 transition"
                      >

                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

                          <div className="min-w-0">

                            <div className="font-black text-slate-900 truncate">
                              {
                                quiz.title
                              }
                            </div>

                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">

                              <span>
                                Status:{" "}
                                <strong className="text-slate-700">
                                  {
                                    quiz.status
                                  }
                                </strong>
                              </span>

                              {quiz.open_time && (
                                <span>
                                  Open:{" "}
                                  {
                                    formatDateTime(
                                      quiz.open_time
                                    )
                                  }
                                </span>
                              )}

                              {quiz.close_time && (
                                <span>
                                  Close:{" "}
                                  {
                                    formatDateTime(
                                      quiz.close_time
                                    )
                                  }
                                </span>
                              )}

                            </div>

                          </div>

                          <div className="flex items-center gap-5 shrink-0">

                            <div className="text-right">

                              <div className="text-sm font-black text-slate-900">
                                {
                                  quiz.attempts
                                }{" "}
                                attempt
                                {quiz.attempts ===
                                1
                                  ? ""
                                  : "s"}
                              </div>

                              <div className="text-xs text-slate-500">
                                {
                                  quiz.unique_students
                                }{" "}
                                unique student
                                {quiz.unique_students ===
                                1
                                  ? ""
                                  : "s"}
                              </div>

                            </div>

                            <div className="h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500">

                              {isOpen ? (
                                <ChevronUp
                                  size={
                                    17
                                  }
                                />
                              ) : (
                                <ChevronDown
                                  size={
                                    17
                                  }
                                />
                              )}

                            </div>

                          </div>

                        </div>

                      </button>

                      {/* Expanded */}

                      {isOpen && (

                        <div className="border-t border-slate-100 bg-slate-50 px-6 py-5">

                          {isQuizLoading ? (

                            <div className="text-sm text-slate-500">
                              Loading
                              students...
                            </div>

                          ) : quizError ? (

                            <div className="flex items-center gap-2 text-sm text-rose-600">
                              <AlertCircle
                                size={
                                  16
                                }
                              />

                              {
                                quizError
                              }
                            </div>

                          ) : submissions.length ===
                            0 ? (

                            <div className="text-sm text-slate-500">
                              No
                              submissions
                              yet.
                            </div>

                          ) : (

                            <QuizStudents
                              quizId={
                                quiz.quiz_id
                              }
                              submissions={
                                submissions
                              }
                            />

                          )}

                        </div>

                      )}

                    </div>

                  );
                }
              )}

            </div>

          )}

      </div>
    </div>
  );
}

/* ==============================
   Student List
============================== */

function QuizStudents({
  quizId,
  submissions,
}: {
  quizId: number;
  submissions:
    StudentSubmission[];
}) {
  return (
    <div className="space-y-3">

      <div className="flex items-center justify-between gap-3">

        <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-700">

          <Users
            size={
              15
            }
          />

          Submitted Students (
          {
            submissions.length
          }
          )

        </div>

        <Link
          to={`/teacher/activities/${quizId}/grading`}
          className="text-xs font-black text-indigo-600 hover:underline"
        >
          Open grading →
        </Link>

      </div>

      <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">

        {submissions.map(
          (
            submission
          ) => (

          <div
            key={
              submission.attempt_id
            }
            className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >

            <div className="min-w-0">

              <div className="font-black text-slate-900 truncate">
                {
                  submission.student_name
                }
              </div>

              <div className="text-xs text-slate-500 truncate">
                {
                  submission.student_email
                }
              </div>

              <div className="mt-1 text-xs text-slate-400">
                Best attempt
                submitted:{" "}
                {
                  formatDateTime(
                    submission.submitted_at
                  )
                }
              </div>

            </div>

            <div className="flex items-center gap-5 shrink-0">

              <div className="text-right">

                <div className="text-lg font-black text-slate-900">
                  {Number(
                    submission.score ??
                      0
                  ).toFixed(
                    1
                  )}
                </div>

                <div className="text-xs text-slate-500">
                  {
                    submission.status
                  }
                </div>

              </div>

              <Link
                to={`/teacher/activities/${quizId}/grading`}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-indigo-600 hover:bg-indigo-50"
              >
                Grade
              </Link>

            </div>

          </div>

          )
        )}

      </div>

    </div>
  );
}

/* ==============================
   Summary Card
============================== */

function SummaryCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm hover:border-indigo-200 transition-all">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
        {label}
      </div>

      <div className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 font-mono">
        {value}
      </div>

      <div className="mt-0.5 text-xs text-slate-400">
        {description}
      </div>
    </div>
  );
}

/* ==============================
   States
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

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-8 text-center max-w-xl mx-auto">
      <AlertCircle size={24} className="mx-auto text-rose-500" />

      <div className="mt-2 font-semibold text-sm text-slate-900">
        {message}
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors shadow-xs"
        >
          Try Again
        </button>
      )}
    </div>
  );
}