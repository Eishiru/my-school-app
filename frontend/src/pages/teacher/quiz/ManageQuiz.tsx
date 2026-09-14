'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import QuizGroupsPanel from './QuizGroupsPanel';
import QuizGroupGradingPanel from './QuizGroupGradingPanel';

import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  Clock,
  Hash,
  Layers,
  Plus,
  Save,
  X,
  Pencil,
  Trash2,
  Sparkles,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

import {
  useAddQuizQuestion,
  useDeleteQuizQuestion,
  useQuizQuestions,
  useTeacherQuiz,
  useUpdateQuizQuestion,
  useUpdateQuizStatus,
  useUpdateQuizTimes,
} from '../../../hooks/useTeacherSubjects';

import type {
  QuizChoice,
  QuestionType,
  QuizStatus,
  TeacherQuizQuestion,
} from '../../../types/teacherTypes';

type EditableQuestion = {
  question_text: string;
  question_type: QuestionType;
  points: number;
  choices: QuizChoice[];
};

function fmtDT(iso?: string | null) {
  if (!iso) return '—';

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateTimeLocal(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  const hours = String(
    date.getHours()
  ).padStart(2, '0');

  const minutes = String(
    date.getMinutes()
  ).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function statusMeta(status?: string) {
  const normalized =
    (status || '').toUpperCase();

  if (normalized === 'OPEN') {
    return {
      chip:
        'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
      dot: 'bg-emerald-500',
      label: 'OPEN',
    };
  }

  if (normalized === 'SCHEDULED') {
    return {
      chip:
        'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
      dot: 'bg-amber-500',
      label: 'SCHEDULED',
    };
  }

  if (normalized === 'CLOSED') {
    return {
      chip:
        'bg-slate-50 text-slate-600 ring-1 ring-slate-200',
      dot: 'bg-slate-400',
      label: 'CLOSED',
    };
  }

  return {
    chip:
      'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
    dot: 'bg-indigo-500',
    label: 'DRAFT',
  };
}

function SkeletonLine({
  w = 'w-full',
}: {
  w?: string;
}) {
  return (
    <div
      className={`h-3 ${w} rounded-full bg-slate-200/80 animate-pulse`}
    />
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint: string;
}) {
  return (
    <div className="manage-stat relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="p-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
              {label}
            </div>

            <div className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              {value}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              {hint}
            </div>
          </div>

          <div className="h-9 w-9 shrink-0 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700">
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalShell({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm p-4 flex items-center justify-center">
      <div className="w-full max-w-3xl max-h-[calc(100dvh-2rem)] flex flex-col rounded-3xl bg-white shadow-2xl border border-white/10 overflow-hidden">
        <div className="flex shrink-0 items-start justify-between gap-4 px-6 py-4 border-b">
          <div className="min-w-0">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              {title}
            </div>

            {subtitle ? (
              <div className="mt-1 font-black text-slate-900 truncate">
                {subtitle}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-2xl hover:bg-slate-100 text-slate-600"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 min-h-0 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

function createDefaultQuestion(groupMode = false) {
  const question = {
    question_text: '',
    question_type:
      'MULTIPLE_CHOICE' as QuestionType,
    points: 1,
    order: 0,
    choices: [
      {
        choice_text: '',
        is_correct: false,
        order: 0,
      },
      {
        choice_text: '',
        is_correct: false,
        order: 1,
      },
      {
        choice_text: '',
        is_correct: false,
        order: 2,
      },
      {
        choice_text: '',
        is_correct: false,
        order: 3,
      },
    ] as QuizChoice[],
  };
  if (groupMode) {
    question.question_type = 'SHORT_ANSWER';
    question.choices = [];
  }
  return question;
}

export default function ManageQuiz() {
  const { id } =
    useParams<{ id: string }>();

  const quizId =
    Number(id || 0);

  const navigate =
    useNavigate();

  // ---------------------------
  // React Query
  // ---------------------------

  const {
    data: quiz,
    isLoading: quizLoading,
    isError: quizError,
    error: quizErrorData,
    refetch: refetchQuiz,
  } = useTeacherQuiz(quizId);

  useEffect(() => {
    let pending = false;
    const refresh = async () => {
      if (pending || document.hidden) return;
      pending = true;
      try { await refetchQuiz(); } finally { pending = false; }
    };
    const timer = window.setInterval(() => void refresh(), 5000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [refetchQuiz]);

  const {
    data: questions = [],
    isLoading: questionsLoading,
    isError: questionsError,
    error: questionsErrorData,
    refetch: refetchQuestions,
  } = useQuizQuestions(quizId);

  const isGroupActivity = (quiz as { activity_mode?: string } | undefined)?.activity_mode === 'GROUP';
  const pageRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const measure = () => {
      const element = pageRef.current;
      if (element) element.style.setProperty('--manage-top', `${Math.max(0, element.getBoundingClientRect().top)}px`);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [quizLoading, questionsLoading, quizError, questionsError]);

  const updateTimesMutation =
    useUpdateQuizTimes();

  const updateStatusMutation =
    useUpdateQuizStatus();

  const addQuestionMutation =
    useAddQuizQuestion();

  const updateQuestionMutation =
    useUpdateQuizQuestion();

  const deleteQuestionMutation =
    useDeleteQuizQuestion();

  // ---------------------------
  // UI state
  // ---------------------------

  const [activeTab, setActiveTab] =
    useState<
      'questions' | 'settings' | 'groups' | 'group-grading'
    >('questions');

  const [
    showAddQuestion,
    setShowAddQuestion,
  ] = useState(false);

  const [
    newQuestion,
    setNewQuestion,
  ] = useState(
    createDefaultQuestion(isGroupActivity)
  );

  const [
    editingTimes,
    setEditingTimes,
  ] = useState(false);

  const [times, setTimes] =
    useState({
      open_time: '',
      close_time: '',
    });

  const [
    editingQuestion,
    setEditingQuestion,
  ] =
    useState<TeacherQuizQuestion | null>(
      null
    );

  const [
    editQuestion,
    setEditQuestion,
  ] =
    useState<EditableQuestion | null>(
      null
    );

  const [
    editingStatus,
    setEditingStatus,
  ] = useState(false);

  const [
    newStatus,
    setNewStatus,
  ] =
    useState<QuizStatus>('DRAFT');

  useEffect(() => {
    if (isGroupActivity) {
      setNewQuestion(prev => ({ ...prev, question_type: 'SHORT_ANSWER', choices: [] }));
    }
  }, [isGroupActivity]);

  // Sync server quiz -> local form fields
  useEffect(() => {
    if (!quiz || editingStatus || editingTimes) {
      return;
    }

    setNewStatus(
      quiz.status
    );

    if (
      quiz.open_time &&
      quiz.close_time
    ) {
      setTimes({
        open_time:
          formatDateTimeLocal(
            new Date(
              quiz.open_time
            )
          ),

        close_time:
          formatDateTimeLocal(
            new Date(
              quiz.close_time
            )
          ),
      });
    }
  }, [quiz, editingStatus, editingTimes]);

  // ---------------------------
  // Derived data
  // ---------------------------

  const isEditable =
    useMemo(() => {
      if (!quiz) {
        return false;
      }

      if (
        quiz.status !==
        'DRAFT'
      ) {
        return false;
      }

      if (!quiz.open_time) {
        return true;
      }

      const open =
        new Date(
          quiz.open_time
        );

      if (
        Number.isNaN(
          open.getTime()
        )
      ) {
        return true;
      }

      return (
        new Date() < open
      );
    }, [quiz]);

  const totals =
    useMemo(() => {
      const qCount =
        questions.length;

      const points =
        questions.reduce(
          (
            total,
            question
          ) =>
            total +
            (Number(
              question.points
            ) || 0),
          0
        );

      const mc =
        questions.filter(
          (
            question
          ) =>
            question.question_type ===
            'MULTIPLE_CHOICE'
        ).length;

      const tf =
        questions.filter(
          (
            question
          ) =>
            question.question_type ===
            'TRUE_FALSE'
        ).length;

      const sa =
        questions.filter(
          (
            question
          ) =>
            question.question_type ===
            'SHORT_ANSWER'
        ).length;

      return {
        qCount,
        points,
        mc,
        tf,
        sa,
      };
    }, [questions]);

  // ---------------------------
  // Mutations
  // ---------------------------

  const handleUpdateTimes =
    async () => {
      if (
        !times.open_time ||
        !times.close_time
      ) {
        alert(
          'Please enter both open and close times.'
        );
        return;
      }

      const openDate =
        new Date(
          times.open_time
        );

      const closeDate =
        new Date(
          times.close_time
        );

      if (
        Number.isNaN(
          openDate.getTime()
        ) ||
        Number.isNaN(
          closeDate.getTime()
        )
      ) {
        alert(
          'Invalid schedule date.'
        );
        return;
      }

      if (
        closeDate <=
        openDate
      ) {
        alert(
          'Close time must be after open time.'
        );
        return;
      }

      try {
        await updateTimesMutation.mutateAsync(
          {
            quizId,

            open_time:
              openDate.toISOString(),

            close_time:
              closeDate.toISOString(),
          }
        );

        setEditingTimes(
          false
        );
      } catch (error) {
        console.error(
          'Error updating times:',
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : 'Failed to update times.'
        );
      }
    };

  const handleUpdateStatus =
    async () => {
      if (newStatus === 'DRAFT' && quiz?.status !== 'DRAFT') {
        alert('Published quizzes cannot return to Draft. Choose Closed to stop access.');
        return;
      }
      try {
        await updateStatusMutation.mutateAsync(
          {
            quizId,
            status:
              newStatus,
          }
        );

        setEditingStatus(
          false
        );
      } catch (error) {
        console.error(
          'Error updating status:',
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : 'Failed to update status.'
        );
      }
    };

  const handleAddQuestion =
    async () => {
      if (
        !newQuestion.question_text.trim()
      ) {
        alert(
          'Question text is required.'
        );
        return;
      }

      if (
        newQuestion.points <=
        0
      ) {
        alert(
          'Question points must be greater than 0.'
        );
        return;
      }

      let choices =
        newQuestion.choices;

      if (
        newQuestion.question_type ===
        'MULTIPLE_CHOICE'
      ) {
        const validChoices =
          choices.filter(
            (
              choice
            ) =>
              choice.choice_text.trim()
          );

        if (
          validChoices.length <
          2
        ) {
          alert(
            'Multiple choice questions require at least two choices.'
          );
          return;
        }

        const correctCount =
          validChoices.filter(
            (
              choice
            ) =>
              choice.is_correct
          ).length;

        if (
          correctCount !== 1
        ) {
          alert(
            'Please select exactly one correct answer.'
          );
          return;
        }

        choices =
          validChoices.map(
            (
              choice,
              index
            ) => ({
              ...choice,
              order:
                index,
            })
          );
      }

      if (
        newQuestion.question_type ===
        'TRUE_FALSE'
      ) {
        const isTrueCorrect =
          newQuestion
            .choices[0]
            ?.is_correct ??
          false;

        choices = [
          {
            choice_text:
              'True',
            is_correct:
              isTrueCorrect,
            order: 0,
          },
          {
            choice_text:
              'False',
            is_correct:
              !isTrueCorrect,
            order: 1,
          },
        ];
      }

      if (
        newQuestion.question_type ===
        'SHORT_ANSWER'
      ) {
        choices = [];
      }

      try {
        await addQuestionMutation.mutateAsync(
          {
            quizId,

            question_text:
              newQuestion.question_text.trim(),

            question_type:
              newQuestion.question_type,

            points:
              newQuestion.points,

            order:
              questions.length,

            choices,
          }
        );

        setShowAddQuestion(
          false
        );

        setNewQuestion(
          createDefaultQuestion(isGroupActivity)
        );
      } catch (error) {
        console.error(
          'Error adding question:',
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : 'Failed to add question.'
        );
      }
    };

  const handleDeleteQuestion =
    async (
      questionId: number
    ) => {
      const confirmed =
        window.confirm(
          'Delete this question?'
        );

      if (!confirmed) {
        return;
      }

      try {
        await deleteQuestionMutation.mutateAsync(
          {
            quizId,
            questionId,
          }
        );
      } catch (error) {
        console.error(
          'Error deleting question:',
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : 'Failed to delete question.'
        );
      }
    };

  const startEditQuestion =
    (
      question: TeacherQuizQuestion
    ) => {
      setEditingQuestion(
        question
      );

      setEditQuestion({
        question_text:
          question.question_text,

        question_type:
          question.question_type,

        points:
          question.points,

        choices:
          question.choices
            ? question.choices.map(
                (
                  choice
                ) => ({
                  ...choice,
                })
              )
            : [],
      });
    };

  const handleUpdateQuestion =
    async () => {
      if (
        !editingQuestion ||
        !editQuestion
      ) {
        return;
      }

      if (
        !editQuestion.question_text.trim()
      ) {
        alert(
          'Question text is required.'
        );
        return;
      }

      let choices =
        editQuestion.choices ??
        [];

      if (
        editQuestion.question_type ===
        'MULTIPLE_CHOICE'
      ) {
        const correctCount =
          choices.filter(
            (
              choice
            ) =>
              choice.is_correct
          ).length;

        if (
          correctCount !== 1
        ) {
          alert(
            'Please select exactly one correct answer.'
          );
          return;
        }
      }

      if (
        editQuestion.question_type ===
        'TRUE_FALSE'
      ) {
        const trueChoice =
          choices.find(
            (
              choice
            ) =>
              choice.choice_text ===
              'True'
          ) ??
          choices[0];

        const falseChoice =
          choices.find(
            (
              choice
            ) =>
              choice.choice_text ===
              'False'
          ) ??
          choices[1];

        const isTrueCorrect =
          trueChoice?.is_correct ??
          false;

        choices = [
          {
            id:
              trueChoice?.id,
            choice_text:
              'True',
            is_correct:
              isTrueCorrect,
            order: 0,
          },
          {
            id:
              falseChoice?.id,
            choice_text:
              'False',
            is_correct:
              !isTrueCorrect,
            order: 1,
          },
        ];
      }

      if (
        editQuestion.question_type ===
        'SHORT_ANSWER'
      ) {
        choices = [];
      }

      try {
        await updateQuestionMutation.mutateAsync(
          {
            quizId,

            questionId:
              editingQuestion.id,

            question_text:
              editQuestion.question_text.trim(),

            question_type:
              editQuestion.question_type,

            points:
              editQuestion.points,

            choices,
          }
        );

        setEditingQuestion(
          null
        );

        setEditQuestion(
          null
        );
      } catch (error) {
        console.error(
          'Error updating question:',
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : 'Failed to update question.'
        );
      }
    };

  const loading =
    quizLoading ||
    questionsLoading;

  const hasError =
    quizError ||
    questionsError;

  // ---------------------------
  // Loading
  // ---------------------------

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-8">
          <div className="h-9 w-64 rounded-2xl bg-slate-200/80 animate-pulse" />

          <div className="mt-6 grid gap-4 md:grid-cols-3">
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
                  className="h-28 rounded-3xl border border-slate-200 bg-white animate-pulse"
                />
              )
            )}
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
            <SkeletonLine w="w-52" />

            <div className="mt-4 space-y-3">
              <div className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
              <div className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
              <div className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ---------------------------
  // Error
  // ---------------------------

  if (
    hasError ||
    !quiz
  ) {
    const message =
      quizErrorData instanceof
      Error
        ? quizErrorData.message
        : questionsErrorData instanceof
          Error
        ? questionsErrorData.message
        : 'Quiz not found.';

    return (
      <main className="min-h-[70vh] bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-10">
          <div className="rounded-3xl border border-rose-200 bg-white p-6">
            <div className="text-sm font-black uppercase tracking-widest text-rose-500">
              Error
            </div>

            <div className="mt-2 text-lg font-bold text-slate-900">
              {message}
            </div>

            <div className="mt-1 text-sm text-slate-500">
              Try loading the quiz
              again.
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  refetchQuiz();
                  refetchQuestions();
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-600"
              >
                Retry
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    '/teacher/activities'
                  )
                }
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft
                  size={16}
                />

                Back to Activities
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const chip =
    statusMeta(
      quiz.status
    );

  return (
    <main ref={pageRef} className="manage-quiz-page bg-slate-50">
      <style>{`
        .manage-quiz-page { width:100%; min-width:0; }
        .manage-quiz-page, .manage-quiz-page * { box-sizing:border-box; }
        .manage-quiz-page .manage-header { flex-shrink:0; }
        .manage-quiz-page .manage-header-inner { padding:12px 16px; }
        .manage-quiz-page .manage-header-inner > div:first-child { flex-wrap:wrap; }
        .manage-quiz-page .manage-header button,.manage-quiz-page .manage-header a { padding:7px 10px; font-size:12px; border-radius:10px; }
        .manage-quiz-page .manage-tabs { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
        .manage-quiz-page .manage-content { display:flex; flex-direction:column; min-height:0; gap:12px; padding:12px 16px; }
        .manage-quiz-page .manage-stats { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; flex-shrink:0; }
        .manage-quiz-page .manage-card { display:flex; flex-direction:column; min-height:0; border-radius:16px; }
        .manage-quiz-page .manage-card-heading { flex-shrink:0; padding:10px 14px; }
        .manage-quiz-page .manage-card-title { margin-top:2px; font-size:18px; }
        .manage-quiz-page .manage-card-description { margin-top:3px; font-size:12px; }
        .manage-quiz-page .manage-lock { margin-bottom:8px; padding:8px 10px; font-size:12px; }
        .manage-quiz-page .manage-lock > div:last-child { font-size:12px; }
        .manage-quiz-page .manage-body { padding:12px; min-height:0; }
        .manage-quiz-page .manage-question-row { padding:10px 12px; }
        .manage-quiz-page .manage-question-row > div { gap:10px; }
        .manage-quiz-page .manage-question-row .font-black { overflow-wrap:anywhere; }
        .manage-quiz-page .manage-settings > div { padding:14px; border-radius:12px; }
        .manage-quiz-page .manage-settings input,.manage-quiz-page .manage-settings select { padding:8px; }
        .manage-quiz-page .manage-groups-tab { height:100%; min-height:0; }
        .manage-quiz-page .manage-groups-tab[hidden] { display:none; }
        @media(min-width:768px) { .manage-quiz-page .manage-stats { grid-template-columns:repeat(4,minmax(0,1fr)); } }
        @media(min-width:1024px) and (min-height:600px) {
          .manage-quiz-page { display:flex; flex-direction:column; height:calc(100dvh - var(--manage-top,80px) - 16px); overflow:hidden; }
          .manage-quiz-page .manage-content,.manage-quiz-page .manage-card { flex:1; }
          .manage-quiz-page .manage-body { flex:1; overflow-y:auto; scrollbar-gutter:stable; }
          .manage-quiz-page .manage-body-groups { overflow:hidden; scrollbar-gutter:auto; }
        }
      `}</style>
      {/* Sticky top bar */}
      <div className="manage-header border-b border-slate-200 bg-slate-50">
        <div className="manage-header-inner">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                navigate(
                  '/teacher/activities'
                )
              }
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft
                size={16}
              />

              Back
            </button>

            <div className="min-w-0">
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                Manage Activity
              </div>

              <h1 className="truncate text-xl md:text-2xl font-black tracking-tight text-slate-900">
                {quiz.title}
              </h1>

              <div className="mt-0.5 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                {quiz.subject_name ||
                  'Subject'}{' '}
                • Quiz ID:{' '}
                {quiz.quiz_id ||
                  quiz.id}
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Link
                to={`/teacher/activities/${quizId}/item-analysis`}
                className="hidden md:inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                <BarChart3
                  size={16}
                />

                Item Analysis
              </Link>

              {isGroupActivity ? <button type="button" onClick={() => setActiveTab('group-grading')}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-indigo-600">
                <Pencil size={16} /> Group Grading
              </button> : (
              <Link
                to={`/teacher/activities/${quizId}/grading`}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-600 transition"
              >
                <Pencil
                  size={16}
                />

                Manual Grading
              </Link>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="manage-tabs">
            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  'questions'
                )
              }
              className={[
                'rounded-2xl px-4 py-2.5 text-sm font-black transition border',
                activeTab ===
                'questions'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
              ].join(
                ' '
              )}
            >
              <span className="inline-flex items-center gap-2">
                <Layers
                  size={16}
                />

                Questions
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  'settings'
                )
              }
              className={[
                'rounded-2xl px-4 py-2.5 text-sm font-black transition border',
                activeTab ===
                'settings'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
              ].join(
                ' '
              )}
            >
              <span className="inline-flex items-center gap-2">
                <CalendarClock
                  size={16}
                />

                Schedule & Status
              </span>
            </button>
            {isGroupActivity && <button type="button" onClick={() => setActiveTab('groups')}
              className={`rounded-xl border px-4 py-2 text-sm font-black ${activeTab === 'groups' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}>
              Groups
            </button>}
            {isGroupActivity && <button type="button" onClick={() => setActiveTab('group-grading')}
              className={`rounded-xl border px-4 py-2 text-sm font-black ${activeTab === 'group-grading' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}>
              Group Grading
            </button>}
          </div>
        </div>
      </div>

      <div className="manage-content">
        {/* Stats */}
        <div className="manage-stats">
          <StatCard
            icon={
              <ClipboardList
                size={18}
              />
            }
            label="Questions"
            value={
              totals.qCount
            }
            hint="Total items"
          />

          <StatCard
            icon={
              <Hash
                size={18}
              />
            }
            label="Points"
            value={
              totals.points
            }
            hint="Sum of points"
          />

          <StatCard
            icon={
              <Clock
                size={18}
              />
            }
            label="Time Limit"
            value={
              quiz.time_limit
                ? `${String(Math.floor(quiz.time_limit / 60)).padStart(2, '0')}:${String(quiz.time_limit % 60).padStart(2, '0')}`
                : '—'
            }
            hint="Per attempt"
          />

          <StatCard
            icon={
              <Sparkles
                size={18}
              />
            }
            label="Status"
            value={
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-black ${chip.chip}`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${chip.dot}`}
                />

                {chip.label}
              </span>
            }
            hint="Student visibility"
          />
        </div>

        {/* Main card */}
        <div className="manage-card border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="manage-card-heading border-b border-slate-100">
            {!isEditable && activeTab === 'questions' && (
              <div className="manage-lock rounded-xl border border-amber-200 bg-amber-50">
                <div className="font-black text-amber-900">
                  Quiz Locked
                </div>

                <div className="mt-1 text-sm text-amber-800">
                  This quiz can no
                  longer be edited
                  because it is not
                  an editable draft.
                </div>
              </div>
            )}

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Workspace
                </div>

                <div className="manage-card-title font-black tracking-tight text-slate-900">
                  {activeTab ===
                  'questions'
                    ? 'Questions'
                    : activeTab === 'groups' ? 'Student Groups' : activeTab === 'group-grading' ? 'Group Grading' : 'Schedule & Status'}
                </div>

                <div className="manage-card-description text-slate-600">
                  {activeTab ===
                  'questions'
                    ? 'Create, edit, and review quiz items.'
                    : activeTab === 'groups' ? 'Create groups and assign students from this section.' : activeTab === 'group-grading' ? 'Apply one group result to every assigned member.' : 'Control quiz visibility and open/close times.'}
                </div>
              </div>

              {activeTab ===
              'questions' ? (
                <button
                  type="button"
                  onClick={() =>
                    setShowAddQuestion(
                      true
                    )
                  }
                  disabled={
                    !isEditable
                  }
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus
                    size={16}
                  />

                  Add Question
                </button>
              ) : null}
            </div>
          </div>

          <div className={`manage-body ${(activeTab === 'groups' || activeTab === 'group-grading') ? 'manage-body-groups' : ''}`}>
            {/* Questions tab */}
            {activeTab ===
              'questions' && (
              <>
                {questions.length ===
                0 ? (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                        <AlertTriangle
                          size={18}
                        />
                      </div>

                      <div>
                        <div className="font-black text-slate-900">
                          No
                          questions
                          yet
                        </div>

                        <div className="mt-1 text-sm text-slate-600">
                          Add your
                          first
                          question
                          to start
                          building
                          the quiz.
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setShowAddQuestion(
                              true
                            )
                          }
                          disabled={
                            !isEditable
                          }
                          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-600 disabled:opacity-50"
                        >
                          <Plus
                            size={
                              16
                            }
                          />

                          Add
                          Question
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-slate-200 overflow-hidden">
                    <div className="divide-y divide-slate-100">
                      {[
                        ...questions,
                      ]
                        .sort(
                          (
                            a,
                            b
                          ) =>
                            (a.order ??
                              0) -
                            (b.order ??
                              0)
                        )
                        .map(
                          (
                            question,
                            index
                          ) => (
                            <div
                              key={
                                question.id
                              }
                              className="manage-question-row hover:bg-slate-50 transition"
                            >
                              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <div className="text-sm font-black text-slate-500">
                                      #
                                      {index +
                                        1}
                                    </div>

                                    <div className="font-black text-slate-900">
                                      {
                                        question.question_text
                                      }
                                    </div>
                                  </div>

                                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                    <span className="rounded-full bg-slate-100 text-slate-700 px-3 py-1 font-black">
                                      {question.question_type.replace(
                                        /_/g,
                                        ' '
                                      )}
                                    </span>

                                    <span className="rounded-full bg-slate-100 text-slate-700 px-3 py-1 font-black">
                                      {
                                        question.points
                                      }{' '}
                                      pt
                                      {Number(
                                        question.points
                                      ) ===
                                      1
                                        ? ''
                                        : 's'}
                                    </span>
                                  </div>

                                  {question
                                    .choices
                                    ?.length ? (
                                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                      {[
                                        ...question.choices,
                                      ]
                                        .sort(
                                          (
                                            a,
                                            b
                                          ) =>
                                            (a.order ??
                                              0) -
                                            (b.order ??
                                              0)
                                        )
                                        .map(
                                          (
                                            choice
                                          ) => (
                                            <div
                                              key={
                                                choice.id ??
                                                `${choice.choice_text}-${choice.order}`
                                              }
                                              className={[
                                                'rounded-2xl border px-3 py-2 text-sm',
                                                choice.is_correct
                                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                                  : 'border-slate-300 bg-white text-slate-700',
                                              ].join(
                                                ' '
                                              )}
                                            >
                                              <div className="flex items-center gap-2">
                                                {choice.is_correct ? (
                                                  <CheckCircle2
                                                    size={
                                                      16
                                                    }
                                                    className="text-emerald-600"
                                                  />
                                                ) : (
                                                  <span className="h-4 w-4 rounded-full border border-slate-300" />
                                                )}

                                                <span className="font-semibold">
                                                  {
                                                    choice.choice_text
                                                  }
                                                </span>

                                                {choice.is_correct && (
                                                  <span className="ml-auto text-xs font-bold uppercase tracking-wide text-emerald-700">
                                                    Correct
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          )
                                        )}
                                    </div>
                                  ) : (
                                    <div className="mt-3 text-sm text-slate-500">
                                      No
                                      choices
                                      (manual
                                      grading
                                      /
                                      short
                                      answer).
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      startEditQuestion(
                                        question
                                      )
                                    }
                                    disabled={
                                      !isEditable
                                    }
                                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                  >
                                    <Pencil
                                      size={
                                        16
                                      }
                                    />

                                    Edit
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteQuestion(
                                        question.id
                                      )
                                    }
                                    disabled={
                                      !isEditable ||
                                      (deleteQuestionMutation.isPending &&
                                        deleteQuestionMutation.variables?.questionId ===
                                          question.id)
                                    }
                                    className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-black text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                                  >
                                    <Trash2
                                      size={
                                        16
                                      }
                                    />

                                    {deleteQuestionMutation.isPending &&
                                    deleteQuestionMutation.variables?.questionId ===
                                      question.id
                                      ? 'Deleting…'
                                      : 'Delete'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        )}
                    </div>
                  </div>
                )}
              </>
            )}

            {isGroupActivity && <div hidden={activeTab !== 'groups'} className="manage-groups-tab">
              <QuizGroupsPanel key={quizId} quizId={quizId} />
            </div>}

            {isGroupActivity && <div hidden={activeTab !== 'group-grading'} className="manage-groups-tab">
              <QuizGroupGradingPanel key={quizId} quizId={quizId} active={activeTab === 'group-grading'} />
            </div>}

            {/* Settings tab */}
            {activeTab ===
              'settings' && (
              <div className="manage-settings grid gap-3 md:grid-cols-2">
                {/* Status */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6">
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Status
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-black ${chip.chip}`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${chip.dot}`}
                      />

                      {
                        chip.label
                      }
                    </span>

                    {!editingStatus ? (
                      <button
                        type="button"
                        onClick={() => {
                          setNewStatus(quiz.status);
                          setEditingStatus(true);
                        }}
                        className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Pencil
                          size={
                            16
                          }
                        />

                        Change
                      </button>
                    ) : null}
                  </div>

                  {!editingStatus ? (
                    <div className="mt-3 text-sm text-slate-600">
                      Drafts stay hidden until published. Choose Scheduled to publish;
                      the opening and closing times then control the status automatically.
                      Closed locks the quiz immediately.
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      <select
                        value={
                          newStatus
                        }
                        onChange={(
                          e
                        ) =>
                          setNewStatus(
                            e.target
                              .value as QuizStatus
                          )
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="DRAFT" disabled={quiz.status !== "DRAFT"}>
                          Draft
                          (Hidden
                          from
                          students)
                        </option>

                        <option value="SCHEDULED">
                          Scheduled
                          (Visible
                          to
                          students)
                        </option>

                        <option value="OPEN">
                          Open (Respects scheduled times)
                        </option>

                        <option value="CLOSED">
                          Closed
                          (Force
                          closed)
                        </option>
                      </select>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={
                            handleUpdateStatus
                          }
                          disabled={
                            updateStatusMutation.isPending
                          }
                          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-600 disabled:opacity-60"
                        >
                          <Save
                            size={
                              16
                            }
                          />

                          {updateStatusMutation.isPending
                            ? 'Saving…'
                            : 'Save'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingStatus(
                              false
                            );

                            setNewStatus(
                              quiz.status
                            );
                          }}
                          disabled={
                            updateStatusMutation.isPending
                          }
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
                        >
                          <X
                            size={
                              16
                            }
                          />

                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Schedule */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6">
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Schedule
                  </div>

                  {!editingTimes ? (
                    <div className="mt-3 space-y-2 text-sm text-slate-700">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500">
                          Open
                        </span>

                        <span className="font-bold">
                          {fmtDT(
                            quiz.open_time
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500">
                          Close
                        </span>

                        <span className="font-bold">
                          {fmtDT(
                            quiz.close_time
                          )}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setEditingTimes(
                            true
                          )
                        }
                        disabled={
                          !isEditable
                        }
                        className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <Pencil
                          size={
                            16
                          }
                        />

                        Change
                        Times
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                          Open
                          Time
                        </label>

                        <input
                          type="datetime-local"
                          value={
                            times.open_time
                          }
                          onChange={(
                            e
                          ) =>
                            setTimes(
                              (
                                prev
                              ) => ({
                                ...prev,
                                open_time:
                                  e
                                    .target
                                    .value,
                              })
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                          Close
                          Time
                        </label>

                        <input
                          type="datetime-local"
                          value={
                            times.close_time
                          }
                          onChange={(
                            e
                          ) =>
                            setTimes(
                              (
                                prev
                              ) => ({
                                ...prev,
                                close_time:
                                  e
                                    .target
                                    .value,
                              })
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={
                            handleUpdateTimes
                          }
                          disabled={
                            updateTimesMutation.isPending
                          }
                          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-600 disabled:opacity-60"
                        >
                          <Save
                            size={
                              16
                            }
                          />

                          {updateTimesMutation.isPending
                            ? 'Saving…'
                            : 'Save'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingTimes(
                              false
                            );

                            if (
                              quiz.open_time &&
                              quiz.close_time
                            ) {
                              setTimes(
                                {
                                  open_time:
                                    formatDateTimeLocal(
                                      new Date(
                                        quiz.open_time
                                      )
                                    ),

                                  close_time:
                                    formatDateTimeLocal(
                                      new Date(
                                        quiz.close_time
                                      )
                                    ),
                                }
                              );
                            }
                          }}
                          disabled={
                            updateTimesMutation.isPending
                          }
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
                        >
                          <X
                            size={
                              16
                            }
                          />

                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Question Modal */}
      {showAddQuestion && (
        <ModalShell
          title="Add Question"
          subtitle="Create a new item for this quiz"
          onClose={() =>
            setShowAddQuestion(
              false
            )
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Question Type
              </label>

              <select
                disabled={isGroupActivity}
                value={
                  newQuestion.question_type
                }
                onChange={(
                  e
                ) => {
                  const nextType =
                    e
                      .target
                      .value as QuestionType;

                  setNewQuestion(
                    (
                      prev
                    ) => ({
                      ...prev,

                      question_type:
                        nextType,

                      choices:
                        nextType ===
                        'MULTIPLE_CHOICE'
                          ? createDefaultQuestion(isGroupActivity)
                              .choices
                          : nextType ===
                            'TRUE_FALSE'
                          ? [
                              {
                                choice_text:
                                  'True',
                                is_correct:
                                  true,
                                order:
                                  0,
                              },
                              {
                                choice_text:
                                  'False',
                                is_correct:
                                  false,
                                order:
                                  1,
                              },
                            ]
                          : [],
                    })
                  );
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {!isGroupActivity && <>
                <option value="MULTIPLE_CHOICE">
                  Multiple
                  Choice
                </option>

                <option value="TRUE_FALSE">
                  True /
                  False
                </option>

                </>}
                <option value="SHORT_ANSWER">
                  Identification
                  /
                  Short
                  Answer
                </option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Question Text
              </label>

              <textarea
                value={
                  newQuestion.question_text
                }
                onChange={(
                  e
                ) =>
                  setNewQuestion(
                    (
                      prev
                    ) => ({
                      ...prev,

                      question_text:
                        e
                          .target
                          .value,
                    })
                  )
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                rows={4}
                placeholder="Enter your question…"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Points
                </label>

                <input
                  type="number"
                  value={
                    newQuestion.points
                  }
                  onChange={(
                    e
                  ) =>
                    setNewQuestion(
                      (
                        prev
                      ) => ({
                        ...prev,

                        points:
                          Number(
                            e
                              .target
                              .value
                          ),
                      })
                    )
                  }
                  min={
                    0.5
                  }
                  step={
                    0.5
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-black text-slate-900">
                  Heads up
                </div>

                <div className="mt-1 text-sm text-slate-600">
                  Short
                  answer
                  items
                  require
                  manual
                  grading
                  after
                  submission.
                </div>
              </div>
            </div>

            {newQuestion.question_type ===
              'MULTIPLE_CHOICE' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-slate-900">
                      Choices
                    </div>

                    <div className="text-xs text-slate-500">
                      Mark
                      exactly
                      one
                      correct
                      answer.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setNewQuestion(
                        (
                          prev
                        ) => ({
                          ...prev,

                          choices:
                            [
                              ...prev.choices,
                              {
                                choice_text:
                                  '',
                                is_correct:
                                  false,
                                order:
                                  prev
                                    .choices
                                    .length,
                              },
                            ],
                        })
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
                  >
                    <Plus
                      size={
                        16
                      }
                    />

                    Add
                    Choice
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  {newQuestion.choices.map(
                    (
                      choice,
                      index
                    ) => (
                      <div
                        key={
                          index
                        }
                        className="flex flex-col md:flex-row md:items-center gap-2"
                      >
                        <input
                          type="text"
                          value={
                            choice.choice_text
                          }
                          onChange={(
                            e
                          ) => {
                            const next =
                              newQuestion.choices.map(
                                (
                                  item,
                                  choiceIndex
                                ) =>
                                  choiceIndex ===
                                  index
                                    ? {
                                        ...item,

                                        choice_text:
                                          e
                                            .target
                                            .value,
                                      }
                                    : item
                              );

                            setNewQuestion(
                              (
                                prev
                              ) => ({
                                ...prev,

                                choices:
                                  next,
                              })
                            );
                          }}
                          className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder={`Choice ${
                            index +
                            1
                          }`}
                        />

                        <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-700">
                          <input
                            type="radio"
                            name="new_correct"
                            checked={
                              choice.is_correct
                            }
                            onChange={() =>
                              setNewQuestion(
                                (
                                  prev
                                ) => ({
                                  ...prev,

                                  choices:
                                    prev.choices.map(
                                      (
                                        item,
                                        choiceIndex
                                      ) => ({
                                        ...item,

                                        is_correct:
                                          choiceIndex ===
                                          index,
                                      })
                                    ),
                                })
                              )
                            }
                          />

                          Correct
                        </label>

                        {newQuestion
                          .choices
                          .length >
                        2 ? (
                          <button
                            type="button"
                            onClick={() =>
                              setNewQuestion(
                                (
                                  prev
                                ) => ({
                                  ...prev,

                                  choices:
                                    prev.choices
                                      .filter(
                                        (
                                          _,
                                          choiceIndex
                                        ) =>
                                          choiceIndex !==
                                          index
                                      )
                                      .map(
                                        (
                                          item,
                                          choiceIndex
                                        ) => ({
                                          ...item,

                                          order:
                                            choiceIndex,
                                        })
                                      ),
                                })
                              )
                            }
                            className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-black text-rose-700 hover:bg-rose-100"
                          >
                            <X
                              size={
                                16
                              }
                            />
                          </button>
                        ) : null}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {newQuestion.question_type ===
              'TRUE_FALSE' && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-black text-slate-900">
                  Correct
                  Answer
                </div>

                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setNewQuestion(
                        (
                          prev
                        ) => ({
                          ...prev,

                          choices:
                            [
                              {
                                choice_text:
                                  'True',
                                is_correct:
                                  true,
                                order:
                                  0,
                              },
                              {
                                choice_text:
                                  'False',
                                is_correct:
                                  false,
                                order:
                                  1,
                              },
                            ],
                        })
                      )
                    }
                    className={[
                      'flex-1 rounded-2xl px-4 py-3 text-sm font-black border transition',
                      newQuestion
                        .choices[0]
                        ?.is_correct
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
                    ].join(
                      ' '
                    )}
                  >
                    True
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setNewQuestion(
                        (
                          prev
                        ) => ({
                          ...prev,

                          choices:
                            [
                              {
                                choice_text:
                                  'True',
                                is_correct:
                                  false,
                                order:
                                  0,
                              },
                              {
                                choice_text:
                                  'False',
                                is_correct:
                                  true,
                                order:
                                  1,
                              },
                            ],
                        })
                      )
                    }
                    className={[
                      'flex-1 rounded-2xl px-4 py-3 text-sm font-black border transition',
                      newQuestion
                        .choices[1]
                        ?.is_correct
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
                    ].join(
                      ' '
                    )}
                  >
                    False
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={
                  handleAddQuestion
                }
                disabled={
                  addQuestionMutation.isPending
                }
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-600 disabled:opacity-60"
              >
                <Plus
                  size={16}
                />

                {addQuestionMutation.isPending
                  ? 'Adding…'
                  : 'Add Question'}
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowAddQuestion(
                    false
                  )
                }
                disabled={
                  addQuestionMutation.isPending
                }
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                <X
                  size={16}
                />

                Cancel
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Edit Question Modal */}
      {editingQuestion &&
        editQuestion && (
          <ModalShell
            title="Edit Question"
            subtitle={`Question #${
              (editingQuestion.order ??
                0) +
              1
            }`}
            onClose={() => {
              setEditingQuestion(
                null
              );

              setEditQuestion(
                null
              );
            }}
          >
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-black text-slate-900">
                  Question
                  Type
                </div>

                <div className="mt-1 text-sm text-slate-700">
                  {editQuestion.question_type.replace(
                    /_/g,
                    ' '
                  )}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  Question
                  type
                  cannot
                  be
                  changed.
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Question
                  Text
                </label>

                <textarea
                  value={
                    editQuestion.question_text
                  }
                  onChange={(
                    e
                  ) =>
                    setEditQuestion(
                      (
                        prev
                      ) =>
                        prev
                          ? {
                              ...prev,

                              question_text:
                                e
                                  .target
                                  .value,
                            }
                          : prev
                    )
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Points
                </label>

                <input
                  type="number"
                  value={
                    editQuestion.points
                  }
                  onChange={(
                    e
                  ) =>
                    setEditQuestion(
                      (
                        prev
                      ) =>
                        prev
                          ? {
                              ...prev,

                              points:
                                Number(
                                  e
                                    .target
                                    .value
                                ),
                            }
                          : prev
                    )
                  }
                  min={
                    0.5
                  }
                  step={
                    0.5
                  }
                  className="w-full md:w-52 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {editQuestion.question_type ===
                'MULTIPLE_CHOICE' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-black text-slate-900">
                    Choices
                  </div>

                  <div className="mt-3 space-y-2">
                    {editQuestion.choices.map(
                      (
                        choice,
                        index
                      ) => (
                        <div
                          key={
                            choice.id ??
                            index
                          }
                          className="flex flex-col md:flex-row md:items-center gap-2"
                        >
                          <input
                            type="text"
                            value={
                              choice.choice_text
                            }
                            onChange={(
                              e
                            ) =>
                              setEditQuestion(
                                (
                                  prev
                                ) => {
                                  if (
                                    !prev
                                  ) {
                                    return prev;
                                  }

                                  const choices =
                                    prev.choices.map(
                                      (
                                        item,
                                        choiceIndex
                                      ) =>
                                        choiceIndex ===
                                        index
                                          ? {
                                              ...item,

                                              choice_text:
                                                e
                                                  .target
                                                  .value,
                                            }
                                          : item
                                    );

                                  return {
                                    ...prev,
                                    choices,
                                  };
                                }
                              )
                            }
                            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                          />

                          <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-700">
                            <input
                              type="radio"
                              name="edit_correct"
                              checked={
                                choice.is_correct
                              }
                              onChange={() =>
                                setEditQuestion(
                                  (
                                    prev
                                  ) => {
                                    if (
                                      !prev
                                    ) {
                                      return prev;
                                    }

                                    return {
                                      ...prev,

                                      choices:
                                        prev.choices.map(
                                          (
                                            item,
                                            choiceIndex
                                          ) => ({
                                            ...item,

                                            is_correct:
                                              choiceIndex ===
                                              index,
                                          })
                                        ),
                                    };
                                  }
                                )
                              }
                            />

                            Correct
                          </label>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {editQuestion.question_type ===
                'TRUE_FALSE' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-black text-slate-900">
                    Correct
                    Answer
                  </div>

                  <div className="mt-3 flex gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setEditQuestion(
                          (
                            prev
                          ) => {
                            if (
                              !prev
                            ) {
                              return prev;
                            }

                            const current =
                              prev.choices;

                            const trueChoice =
                              current[0] ??
                              {};

                            const falseChoice =
                              current[1] ??
                              {};

                            return {
                              ...prev,

                              choices:
                                [
                                  {
                                    ...trueChoice,

                                    choice_text:
                                      'True',
                                    is_correct:
                                      true,
                                    order:
                                      0,
                                  },
                                  {
                                    ...falseChoice,

                                    choice_text:
                                      'False',
                                    is_correct:
                                      false,
                                    order:
                                      1,
                                  },
                                ],
                            };
                          }
                        )
                      }
                      className={[
                        'flex-1 rounded-2xl px-4 py-3 text-sm font-black border transition',
                        editQuestion
                          .choices[0]
                          ?.is_correct
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
                      ].join(
                        ' '
                      )}
                    >
                      True
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setEditQuestion(
                          (
                            prev
                          ) => {
                            if (
                              !prev
                            ) {
                              return prev;
                            }

                            const current =
                              prev.choices;

                            const trueChoice =
                              current[0] ??
                              {};

                            const falseChoice =
                              current[1] ??
                              {};

                            return {
                              ...prev,

                              choices:
                                [
                                  {
                                    ...trueChoice,

                                    choice_text:
                                      'True',
                                    is_correct:
                                      false,
                                    order:
                                      0,
                                  },
                                  {
                                    ...falseChoice,

                                    choice_text:
                                      'False',
                                    is_correct:
                                      true,
                                    order:
                                      1,
                                  },
                                ],
                            };
                          }
                        )
                      }
                      className={[
                        'flex-1 rounded-2xl px-4 py-3 text-sm font-black border transition',
                        editQuestion
                          .choices[1]
                          ?.is_correct
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
                      ].join(
                        ' '
                      )}
                    >
                      False
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={
                    handleUpdateQuestion
                  }
                  disabled={
                    updateQuestionMutation.isPending
                  }
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-600 disabled:opacity-60"
                >
                  <Save
                    size={
                      16
                    }
                  />

                  {updateQuestionMutation.isPending
                    ? 'Saving…'
                    : 'Save Changes'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingQuestion(
                      null
                    );

                    setEditQuestion(
                      null
                    );
                  }}
                  disabled={
                    updateQuestionMutation.isPending
                  }
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
                >
                  <X
                    size={
                      16
                    }
                  />

                  Cancel
                </button>
              </div>
            </div>
          </ModalShell>
        )}
    </main>
  );
}