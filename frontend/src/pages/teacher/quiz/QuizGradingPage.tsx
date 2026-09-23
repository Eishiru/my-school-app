'use client';

import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  ArrowLeft,
  Users,
  ClipboardCheck,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Save,
  Edit3,
  X,
  CalendarClock,
  Clock,
} from 'lucide-react';

import {
  useGradeQuizAnswer,
  useQuizStudentSubmissions,
  useTeacherQuiz,
} from '../../../hooks/useTeacherSubjects';

import type {
  StudentAnswer,
  StudentSubmission,
} from '../../../types/teacherTypes';

function SkeletonLine({ w = 'w-full' }: { w?: string }) {
  return (
    <div
      className={`h-3 ${w} rounded-full bg-slate-200/80 animate-pulse`}
    />
  );
}

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function StatCard({
  icon,
  label,
  value,
  hint,
  accent = "bg-indigo-50 text-indigo-600 border-indigo-100",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-indigo-200 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
            {label}
          </span>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 font-mono">
            {value}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">{hint}</p>
        </div>
        <div className={`p-2.5 rounded-xl border ${accent}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function formatDT(
  iso?: string | null
) {
  if (!iso) return '—';

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString(
    undefined,
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  );
}

function clampNum(
  value: number,
  min: number,
  max: number
) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

function statusChip(
  status: string
) {
  const normalized =
    (status || '').toUpperCase();

  if (normalized === 'GRADED') {
    return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  }

  if (normalized === 'SUBMITTED') {
    return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
  }

  return 'bg-slate-50 text-slate-600 ring-1 ring-slate-200';
}

function answerPerfMeta(
  answer: StudentAnswer
) {
  if (answer.is_correct === true) {
    return {
      icon: (
        <CheckCircle2
          size={16}
          className="text-emerald-600"
        />
      ),
      label: 'Correct',
      chip:
        'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    };
  }

  if (answer.is_correct === false) {
    return {
      icon: (
        <XCircle
          size={16}
          className="text-rose-600"
        />
      ),
      label: 'Incorrect',
      chip:
        'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
    };
  }

  if (answer.manually_graded) {
    return {
      icon: (
        <CheckCircle2
          size={16}
          className="text-emerald-600"
        />
      ),
      label: 'Graded',
      chip:
        'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    };
  }

  return {
    icon: (
      <AlertTriangle
        size={16}
        className="text-amber-600"
      />
    ),
    label: 'Needs grading',
    chip:
      'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  };
}

export default function QuizGradingPage() {
  const { id } =
    useParams<{ id: string }>();

  const quizId =
    Number(id || 0);

  const navigate =
    useNavigate();

  const [
    selectedAttemptId,
    setSelectedAttemptId,
  ] =
    useState<number | null>(
      null
    );

  const {
    data: quiz,
    isLoading: quizLoading,
    isError: quizError,
    error: quizErrorData,
    refetch: refetchQuiz,
  } =
    useTeacherQuiz(quizId);

  const {
    data: submissions = [],
    isLoading:
      submissionsLoading,
    isError:
      submissionsError,
    error:
      submissionsErrorData,
    refetch:
      refetchSubmissions,
  } =
    useQuizStudentSubmissions(
      quizId
    );

  const gradeAnswer =
    useGradeQuizAnswer();

  const selectedStudent =
    useMemo(() => {
      if (!submissions.length) {
        return null;
      }

      if (
        selectedAttemptId !==
        null
      ) {
        const found =
          submissions.find(
            (
              submission
            ) =>
              submission.attempt_id ===
              selectedAttemptId
          );

        if (found) {
          return found;
        }
      }

      return submissions[0];
    }, [
      submissions,
      selectedAttemptId,
    ]);

  const stats =
    useMemo(() => {
      const total =
        submissions.length;

      const graded =
        submissions.filter(
          (
            submission
          ) =>
            (
              submission.status ||
              ''
            ).toUpperCase() ===
            'GRADED'
        ).length;

      const pending =
        total - graded;

      return {
        total,
        graded,
        pending,
      };
    }, [submissions]);

  const handleGradeAnswer =
    async (
      answerId: number,
      points: number,
      feedback: string
    ) => {
      await gradeAnswer.mutateAsync({
        quizId,
        answerId,
        points,
        feedback,
      });
    };

  const loading =
    quizLoading ||
    submissionsLoading;

  const hasError =
    quizError ||
    submissionsError;

  if (!quizId) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
          Invalid quiz ID.
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-40 rounded-2xl bg-white border border-slate-200 shadow-sm" />

            <div className="flex-1">
              <div className="h-8 w-72 rounded-2xl bg-slate-200/80 animate-pulse" />

              <div className="mt-2 h-3 w-52 rounded-full bg-slate-200/80 animate-pulse" />
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {Array.from({
              length: 3,
            }).map(
              (
                _,
                index
              ) => (
                <div
                  key={
                    index
                  }
                  className="rounded-3xl border border-slate-200 bg-white p-6"
                >
                  <SkeletonLine w="w-40" />

                  <div className="mt-5">
                    <SkeletonLine w="w-24" />
                  </div>

                  <div className="mt-3">
                    <SkeletonLine w="w-44" />
                  </div>
                </div>
              )
            )}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-4">
            <div className="lg:col-span-1 rounded-3xl border border-slate-200 bg-white p-6">
              <SkeletonLine w="w-32" />

              <div className="mt-4 space-y-3">
                <div className="h-14 rounded-2xl bg-slate-100 animate-pulse" />
                <div className="h-14 rounded-2xl bg-slate-100 animate-pulse" />
                <div className="h-14 rounded-2xl bg-slate-100 animate-pulse" />
              </div>
            </div>

            <div className="lg:col-span-3 rounded-3xl border border-slate-200 bg-white p-6">
              <SkeletonLine w="w-48" />

              <div className="mt-4 space-y-3">
                <div className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
                <div className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (hasError) {
    const errorMessage =
      quizErrorData instanceof
      Error
        ? quizErrorData.message
        : submissionsErrorData instanceof
          Error
        ? submissionsErrorData.message
        : 'Failed to load quiz grading data.';

    return (
      <main className="min-h-[70vh] bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-10">
          <button
            type="button"
            onClick={() =>
              navigate(-1)
            }
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft
              size={16}
            />
            Back
          </button>

          <div className="mt-6 rounded-3xl border border-rose-200 bg-white p-6">
            <div className="text-sm font-black uppercase tracking-widest text-rose-500">
              Error
            </div>

            <div className="mt-2 text-lg font-bold text-slate-900">
              {
                errorMessage
              }
            </div>

            <div className="mt-1 text-sm text-slate-500">
              Try refreshing the
              page.
            </div>

            <button
              type="button"
              onClick={() => {
                refetchQuiz();
                refetchSubmissions();
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-600"
            >
              <ClipboardCheck
                size={16}
              />

              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50/50 pb-12">
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white shadow-xs">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                navigate(-1)
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft
                size={14}
              />
              <span>Back</span>
            </button>

            <div className="min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Manual Grading
              </span>

              <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">
                {quiz?.title ??
                  'Quiz'}
              </h1>

              <div className="mt-0.5 text-xs text-slate-500 font-medium">
                Total Points:{' '}
                {quiz?.total_points ??
                  '—'}{' '}
                • Submissions:{' '}
                {
                  submissions.length
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={
              <Users
                size={18}
              />
            }
            label="Submissions"
            value={
              stats.total
            }
            hint="Total attempts"
            accent="bg-indigo-50 text-indigo-600 border-indigo-100"
          />

          <StatCard
            icon={
              <CheckCircle2
                size={18}
              />
            }
            label="Graded"
            value={
              stats.graded
            }
            hint="Marked as graded"
            accent="bg-emerald-50 text-emerald-600 border-emerald-100"
          />

          <StatCard
            icon={
              <AlertTriangle
                size={18}
              />
            }
            label="Pending"
            value={
              stats.pending
            }
            hint="Needs review"
            accent="bg-amber-50 text-amber-600 border-amber-100"
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Student List */}
          <aside className="lg:col-span-1">
            <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/40">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Students
                </span>

                <div className="mt-0.5 text-sm font-bold text-slate-900">
                  Select Submission
                </div>
              </div>

              <div className="max-h-[70vh] overflow-auto p-3 space-y-2">
                {submissions.length ===
                0 ? (
                  <div className="rounded-lg border border-slate-200/80 bg-slate-50 p-4 text-xs text-slate-500 text-center">
                    No submissions yet.
                  </div>
                ) : (
                  submissions.map(
                    (
                      submission
                    ) => {
                      const active =
                        selectedStudent?.attempt_id ===
                        submission.attempt_id;

                      return (
                        <button
                          key={
                            submission.attempt_id
                          }
                          type="button"
                          onClick={() =>
                            setSelectedAttemptId(
                              submission.attempt_id
                            )
                          }
                          className={[
                            'w-full text-left rounded-xl border p-3.5 transition-all shadow-2xs',
                            active
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                              : 'bg-white border-slate-200/80 hover:bg-slate-50 text-slate-900',
                          ].join(
                            ' '
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-bold text-sm truncate">
                                {
                                  submission.student_name
                                }
                              </div>

                              <div
                                className={`mt-0.5 text-xs ${
                                  active
                                    ? 'text-white/85'
                                    : 'text-slate-500'
                                }`}
                              >
                                Score:{' '}
                                {(
                                  submission.score ??
                                  0
                                ).toFixed(
                                  1
                                )}{' '}
                                /{' '}
                                {quiz?.total_points ??
                                  '—'}
                              </div>
                            </div>

                            <span
                              className={[
                                'shrink-0 inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold',
                                active
                                  ? 'bg-white/20 text-white'
                                  : statusChip(
                                      submission.status
                                    ),
                              ].join(
                                ' '
                              )}
                            >
                              {(
                                submission.status ||
                                '—'
                              ).toUpperCase()}
                            </span>
                          </div>

                          <div
                            className={`mt-2 flex flex-col gap-1 text-[11px] ${
                              active
                                ? 'text-white/80'
                                : 'text-slate-500'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <CalendarClock
                                size={12}
                              />
                              <span>
                                {formatDT(
                                  submission.submitted_at
                                )}
                              </span>
                            </div>

                            {submission.time_spent !== undefined && submission.time_spent !== null && (
                              <div className="flex items-center gap-1.5">
                                <Clock
                                  size={12}
                                />
                                <span>
                                  Time: {formatDuration(submission.time_spent)}
                                </span>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    }
                  )
                )}
              </div>
            </div>
          </aside>

          {/* Grading Panel */}
          <section className="lg:col-span-3">
            {!selectedStudent ? (
              <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs p-8 text-center">
                <div className="mx-auto w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2.5">
                  <Users size={18} />
                </div>
                <div className="text-sm font-bold text-slate-900">
                  Select a student
                </div>
                <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
                  Choose a submission from the list on the left to review and grade responses.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
                {/* Selected Student Header */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/40">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Selected Student
                      </span>

                      <h2 className="text-xl font-bold tracking-tight text-slate-900">
                        {selectedStudent.student_name}
                      </h2>

                      <div className="text-xs text-slate-500">
                        {selectedStudent.student_email}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2.5 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarClock size={13} className="text-slate-400" />
                          <span>Submitted: {formatDT(selectedStudent.submitted_at)}</span>
                        </span>

                        {selectedStudent.time_spent !== undefined && selectedStudent.time_spent !== null && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                            <Clock size={12} className="text-slate-400" />
                            <span>Time: {formatDuration(selectedStudent.time_spent)}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-2 text-right shadow-2xs">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Total Score
                        </div>

                        <div className="mt-0.5 text-xl font-bold font-mono text-slate-900">
                          {(selectedStudent.score ?? 0).toFixed(1)}{' '}
                          <span className="text-xs font-semibold text-slate-400">
                            / {quiz?.total_points ?? '—'}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${statusChip(
                          selectedStudent.status
                        )}`}
                      >
                        {(selectedStudent.status || '—').toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Answers */}
                <div className="p-6 space-y-4">
                  {selectedStudent.answers.map(
                    (
                      answer,
                      index
                    ) => (
                      <AnswerGradingCard
                        key={
                          answer.id
                        }
                        answer={
                          answer
                        }
                        index={
                          index
                        }
                        onGrade={
                          handleGradeAnswer
                        }
                        saving={
                          gradeAnswer.isPending
                        }
                      />
                    )
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

interface AnswerGradingCardProps {
  answer: StudentAnswer;
  index: number;
  onGrade: (
    answerId: number,
    points: number,
    feedback: string
  ) => Promise<void>;
  saving: boolean;
}

function AnswerGradingCard({
  answer,
  index,
  onGrade,
  saving,
}: AnswerGradingCardProps) {
  const [points, setPoints] =
    useState(
      String(
        answer.points_earned ??
          0
      )
    );

  const [
    feedback,
    setFeedback,
  ] =
    useState(
      answer.teacher_feedback ||
        ''
    );

  const [
    isEditing,
    setIsEditing,
  ] =
    useState(
      !answer.manually_graded
    );

  const meta =
    useMemo(
      () =>
        answerPerfMeta(
          answer
        ),
      [answer]
    );

  const pointsNum =
    useMemo(() => {
      const number =
        parseFloat(
          points
        );

      if (
        !Number.isFinite(
          number
        )
      ) {
        return 0;
      }

      return number;
    }, [points]);

  const maxPoints =
    answer.question_points ??
    0;

  const overMax =
    pointsNum >
    maxPoints;

  const canSave =
    !saving &&
    !overMax &&
    pointsNum >= 0;

  const resetToSaved =
    () => {
      setPoints(
        String(
          answer.points_earned ??
            0
        )
      );

      setFeedback(
        answer.teacher_feedback ||
          ''
      );
    };

  const handleSubmit =
    async () => {
      const safePoints =
        clampNum(
          pointsNum,
          0,
          maxPoints
        );

      try {
        await onGrade(
          answer.id,
          safePoints,
          feedback
        );

        setIsEditing(
          false
        );
      } catch (error) {
        console.error(
          'Failed to save grade:',
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : 'Failed to save grade.'
        );
      }
    };

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
      {/* Question Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/40">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-semibold ${meta.chip}`}
              >
                {meta.icon}
                {meta.label}
              </span>

              <span className="text-xs font-semibold text-slate-500">
                Question {index + 1}
              </span>

              <span className="text-xs text-slate-400">
                • {answer.question_points} pt{answer.question_points !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="mt-1.5 text-sm font-semibold text-slate-900">
              {answer.question_text}
            </div>
          </div>

          {!isEditing && (
            <div className="flex items-center gap-2 shrink-0">
              <div className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-1.5 shadow-2xs text-right">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Points
                </div>

                <div className="text-base font-bold font-mono text-slate-900">
                  {answer.points_earned}{' '}
                  <span className="text-xs font-semibold text-slate-400">
                    / {answer.question_points}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsEditing(
                    true
                  )
                }
                disabled={
                  saving
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-60 transition-colors"
              >
                <Edit3
                  size={14}
                />
                <span>Edit</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Student Answer */}
      <div className="p-4 sm:p-5 bg-slate-50/50 border-b border-slate-100">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Student Answer
        </div>

        {answer.text_answer ? (
          <div className="mt-2 rounded-lg border border-slate-200/80 bg-white p-3.5 text-xs text-slate-800 whitespace-pre-wrap shadow-2xs">
            {answer.text_answer}
          </div>
        ) : null}

        {answer.choices && answer.choices.length > 0 ? (
          <div className="mt-3 space-y-2">
            {[...answer.choices]
              .sort((a, b) => a.order - b.order)
              .map((choice) => {
                const isSelected = choice.id === answer.selected_choice;
                const isCorrect = choice.id === answer.correct_choice;

                let style = 'border-slate-200/80 bg-white';
                if (isCorrect) {
                  style = 'border-emerald-300 bg-emerald-50/60 text-emerald-950';
                }
                if (isSelected && !isCorrect) {
                  style = 'border-rose-300 bg-rose-50/60 text-rose-950';
                }

                return (
                  <div
                    key={choice.id}
                    className={`rounded-lg border p-2.5 text-xs ${style}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">
                        {choice.choice_text}
                      </span>

                      <div className="flex items-center gap-2 text-[11px] font-semibold">
                        {isSelected && (
                          <span className="text-indigo-600">
                            Student Answer
                          </span>
                        )}
                        {isCorrect && (
                          <span className="text-emerald-600 font-bold">
                            Correct Answer
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : null}

        {answer.answer_file_url ? (
          <div className="mt-3">
            <a
              href={answer.answer_file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
            >
              <Paperclip size={14} />
              <span>View uploaded file</span>
            </a>
          </div>
        ) : null}

        {!answer.text_answer &&
        !answer.selected_choice &&
        !answer.answer_file_url ? (
          <div className="mt-2 rounded-lg border border-slate-200/80 bg-white p-3 text-xs text-slate-500">
            No answer content.
          </div>
        ) : null}
      </div>

      {/* Grading */}
      <div className="p-4 sm:p-5">
        {!isEditing && answer.manually_graded ? (
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Teacher Feedback
              </div>

              {answer.graded_at ? (
                <div className="text-xs text-slate-400">
                  Graded {formatDT(answer.graded_at)}
                  {answer.graded_by_name ? ` • ${answer.graded_by_name}` : ''}
                </div>
              ) : null}
            </div>

            {answer.teacher_feedback ? (
              <div className="mt-2 rounded-lg border border-slate-200/80 bg-slate-50/50 p-3 text-xs text-slate-700 whitespace-pre-wrap">
                {answer.teacher_feedback}
              </div>
            ) : (
              <div className="mt-1 text-xs text-slate-400">
                No feedback provided.
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-12">
            <div className="md:col-span-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Points Earned (max {answer.question_points})
              </div>

              <div className="mt-1.5">
                <input
                  type="number"
                  min={0}
                  max={answer.question_points}
                  step="0.5"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  className={[
                    'w-full rounded-lg border px-3 py-2 text-xs font-semibold outline-none transition-all shadow-2xs',
                    overMax
                      ? 'border-rose-300 bg-rose-50 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-slate-200/80 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
                  ].join(' ')}
                  disabled={saving}
                />

                <div className="mt-1 text-[11px] text-slate-500">
                  {overMax ? (
                    <span className="text-rose-600 font-semibold">
                      Points cannot exceed max.
                    </span>
                  ) : (
                    <span>Use 0.5 steps if needed.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="md:col-span-8">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Feedback (optional)
              </div>

              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                className="mt-1.5 w-full rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs transition-all"
                placeholder="Write feedback to the student..."
                disabled={saving}
              />
            </div>

            <div className="md:col-span-12 flex flex-wrap items-center justify-end gap-2 pt-1">
              {answer.manually_graded ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    resetToSaved();
                  }}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs disabled:opacity-60 transition-colors"
                >
                  <X size={14} />
                  <span>Cancel</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs disabled:opacity-60 transition-colors"
                >
                  <X size={14} />
                  <span>Close</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSave}
                className={[
                  'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors',
                  canSave
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-slate-300 cursor-not-allowed',
                ].join(' ')}
              >
                <Save size={14} />
                <span>{saving ? 'Saving…' : 'Save Grade'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}