import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  useCreateTeacherQuiz,
  useTeacherSubjects,
} from "../../../hooks/useTeacherSubjects";

import type {
  QuizStatus,
  Semester,
} from "../../../types/teacherTypes";

type QuestionKind = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";
type DraftQuestion = {
  key: string;
  question_text: string;
  question_type: QuestionKind;
  points: number;
  choices: { choice_text: string; is_correct: boolean }[];
};

function newQuestion(kind: QuestionKind = "MULTIPLE_CHOICE"): DraftQuestion {
  return {
    key: crypto.randomUUID(), question_text: "", question_type: kind, points: 1,
    choices: kind === "SHORT_ANSWER" ? [] : kind === "TRUE_FALSE"
      ? [{ choice_text: "True", is_correct: true }, { choice_text: "False", is_correct: false }]
      : Array.from({ length: 4 }, (_, i) => ({ choice_text: "", is_correct: i === 0 })),
  };
}

// SubjectOfferingSerializer returns grade (e.g. GRADE_7) and section name.
function subjectDisplayLabel(subject: {
  name: string;
  grade?: string | number | null;
  section?: string | null;
}): string {
  const rawGrade = String(subject.grade ?? "").trim();
  const gradeNumber = rawGrade.match(/^(?:grade[ _-]*)?(\d+)$/i)?.[1];
  const grade = gradeNumber ?? rawGrade;
  const section = (subject.section?.trim() ?? "").replace(/^section\s+/i, "");
  const subjectAndGrade = [subject.name, grade].filter(Boolean).join(" ");
  return section ? `${subjectAndGrade}- ${section}` : subjectAndGrade;
}

// Recalculate from the content on every edit so typing grows and deleting shrinks.
function expandQuestionText(element: HTMLTextAreaElement | null): void {
  if (!element) return;
  element.style.height = "auto";
  const borderHeight = element.offsetHeight - element.clientHeight;
  element.style.height = `${Math.max(32, element.scrollHeight + borderHeight)}px`;
}

type CreateQuizForm = {
  subject: string;

  title: string;
  description: string;
  activity_mode: "INDIVIDUAL" | "GROUP";
  grade_type: "WRITTEN_WORK" | "PERFORMANCE_TASK";

  open_time: string;
  close_time: string;

  time_limit: number;

  semester: Semester;

  passing_score: number;

  status: QuizStatus;

  show_correct_answers: boolean;
  shuffle_questions: boolean;
  allow_multiple_attempts: boolean;
};

// Preserve DRF's field errors instead of showing only "Request failed with status code 400".
function quizCreateErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: unknown } }).response;
    const data = response?.data;
    if (data && typeof data === "object" && !Array.isArray(data)) {
      const messages = Object.entries(data).map(([field, value]) => {
        const message = Array.isArray(value)
          ? value.map(String).join(" ")
          : typeof value === "string"
            ? value
            : JSON.stringify(value);
        return field === "detail" || field === "non_field_errors"
          ? message
          : `${field}: ${message}`;
      });
      if (messages.length) return messages.join("\n");
    }
  }
  return error instanceof Error ? error.message : "Failed to create activity.";
}

export default function CreateQuiz() {
  const workspaceRef = useRef<HTMLDivElement>(null);

  // Fit the available viewport below the application's existing header.
  useEffect(() => {
    const measure = () => {
      const element = workspaceRef.current;
      if (!element) return;
      const top = Math.max(0, element.getBoundingClientRect().top);
      element.style.setProperty("--quiz-top", `${top}px`);
    };
    measure();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, []);

  const { id } =
    useParams<{ id: string }>();

  const subjectIdFromRoute =
    id ? Number(id) : null;

  const navigate =
    useNavigate();

  const {
    data: subjects = [],
    isLoading:
      loadingSubjects,
    isError:
      subjectsError,
    error:
      subjectsErrorData,
    refetch:
      refetchSubjects,
  } = useTeacherSubjects();

  const createQuiz =
    useCreateTeacherQuiz();

  const [formData, setFormData] =
    useState<CreateQuizForm>({
      subject: "",

      title: "",
      description: "",
      activity_mode: "INDIVIDUAL",
      grade_type: "WRITTEN_WORK",

      open_time: "",
      close_time: "",

      time_limit: 60,

      semester:
        "SEMESTER_1",

      passing_score: 1,

      status:
        "SCHEDULED",

      show_correct_answers:
        false,

      shuffle_questions:
        false,

      allow_multiple_attempts:
        false,
    });

  const requiresSchedule = !["DRAFT", "OPEN"].includes(formData.status);

  const [timeLimitText, setTimeLimitText] = useState("01:00");

  const [questions, setQuestions] = useState<DraftQuestion[]>(() => [newQuestion()]);
  const [expandedQuestionKey, setExpandedQuestionKey] = useState<string | null>(() => questions[0]?.key ?? null);
  const totalPoints = questions.reduce((sum, q) => sum + (Number.isFinite(q.points) ? q.points : 0), 0);
  const updateQuestion = (key: string, patch: Partial<DraftQuestion>) => {
    setQuestions((items) => items.map((q) => q.key === key ? { ...q, ...patch } : q));
  };
  const moveQuestion = (index: number, delta: number) => {
    setQuestions((items) => {
      const next = [...items];
      const target = index + delta;
      if (target < 0 || target >= next.length) return items;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const cancelPath =
    useMemo(() => {
      return subjectIdFromRoute
        ? `/teacher/subject/${subjectIdFromRoute}/activities`
        : "/teacher/activities";
    }, [subjectIdFromRoute]);

  // Lock subject when this page
  // was opened inside a subject.
  useEffect(() => {
    if (
      !subjectIdFromRoute
    ) {
      return;
    }

    setFormData(
      (prev) => ({
        ...prev,

        subject: String(
          subjectIdFromRoute
        ),
      })
    );
  }, [subjectIdFromRoute]);

  const selectedSubjectName =
    useMemo(() => {
      if (
        !subjectIdFromRoute
      ) {
        return null;
      }

      const subject =
        subjects.find(
          (item) =>
            item.id ===
            subjectIdFromRoute
        );

      return (
        subject ? subjectDisplayLabel(subject) : null
      );
    }, [
      subjectIdFromRoute,
      subjects,
    ]);

  const handleSubmit =
    async (
      event: React.FormEvent
    ) => {
      event.preventDefault();
      if (createQuiz.isPending) return;
      if (!questions.length) { alert("Add at least one question."); return; }
      for (const [index, question] of questions.entries()) {
        const prefix = `Question ${index + 1}: `;
        if (!question.question_text.trim()) { setExpandedQuestionKey(question.key); alert(prefix + "Enter the question text."); return; }
        if (!Number.isFinite(question.points) || question.points <= 0) { setExpandedQuestionKey(question.key); alert(prefix + "Enter points greater than zero."); return; }
        if (question.question_type !== "SHORT_ANSWER") {
          if (question.choices.length < 2 || question.choices.some((c) => !c.choice_text.trim())) {
            setExpandedQuestionKey(question.key);
            alert(prefix + "Fill in every choice, or remove unused choices."); return;
          }
          if (question.choices.filter((c) => c.is_correct).length !== 1) {
            setExpandedQuestionKey(question.key);
            alert(prefix + "Select one correct answer."); return;
          }
        }
      }

      const subjectOfferingId =
        subjectIdFromRoute ??
        Number(
          formData.subject
        );

      if (
        !subjectOfferingId
      ) {
        alert(
          "Please select a subject."
        );
        return;
      }

      if (
        !formData.title.trim()
      ) {
        alert(
          "Quiz title is required."
        );
        return;
      }

      const openDate = requiresSchedule ? new Date(formData.open_time) : null;
      const closeDate = requiresSchedule ? new Date(formData.close_time) : null;
      if (requiresSchedule) {
        if (!formData.open_time || !formData.close_time) {
          alert("Open and close times are required for this status.");
          return;
        }
        if (!openDate || !closeDate || Number.isNaN(openDate.getTime()) || Number.isNaN(closeDate.getTime())) {
          alert("Invalid quiz schedule.");
          return;
        }
        if (closeDate <= openDate) {
          alert("Close time must be after open time.");
          return;
        }
      }

      if (
        formData.time_limit <=
        0
      ) {
        alert(
          "Enter a time limit greater than 00:00 in HH:MM format."
        );
        return;
      }

      if (
        totalPoints <=
        0
      ) {
        alert(
          "Total points must be greater than 0."
        );
        return;
      }

      if (
        formData.passing_score <
          0 ||
        formData.passing_score >
          totalPoints
      ) {
        alert(
          "Passing score must be between 0 and total points."
        );
        return;
      }

      try {
        const result =
          await createQuiz.mutateAsync(
            {
              ...{ activity_mode: formData.activity_mode, grade_type: formData.grade_type, questions: questions.map((question, order) => ({
                question_text: question.question_text.trim(),
                question_type: formData.activity_mode === "GROUP" ? "SHORT_ANSWER" : question.question_type,
                points: question.points,
                order,
                choices: (formData.activity_mode === "GROUP" ? [] : question.choices).map((choice, choiceOrder) => ({
                  choice_text: choice.choice_text.trim(), is_correct: choice.is_correct, order: choiceOrder,
                })),
              })) },
              SubjectOffering:
                subjectOfferingId,

              title:
                formData.title.trim(),

              description:
                formData.description.trim(),

              open_time:
                openDate?.toISOString() ?? null,

              close_time:
                closeDate?.toISOString() ?? null,

              time_limit:
                formData.time_limit,

              semester:
                formData.semester,

              total_points:
                totalPoints,

              passing_score:
                formData.passing_score,

              status:
                formData.status,

              show_correct_answers:
                formData.show_correct_answers,

              shuffle_questions:
                formData.shuffle_questions,

              allow_multiple_attempts:
                formData.allow_multiple_attempts,
            }
          );

        if (result.id) {
          navigate(
            `/teacher/activities/${result.id}`
          );

          return;
        }

        navigate(
          cancelPath
        );
      } catch (error) {
        console.error(
          "Error creating quiz:",
          error
        );

        alert(
          quizCreateErrorMessage(error)
        );
      }
    };

  return (
    <div ref={workspaceRef} className="quiz-workspace">
      <style>{`
        .quiz-workspace { width: 100%; max-width: 1600px; margin: 0 auto; padding: 16px; color: #334155; }
        .quiz-workspace, .quiz-workspace * { box-sizing: border-box; }
        .quiz-workspace .quiz-heading { flex: 0 0 auto; margin-bottom: 8px; }
        .quiz-workspace .quiz-heading h1 { font-size: 24px; line-height: 1.2; margin-top: 4px; }
        .quiz-workspace .quiz-heading p { margin-top: 4px; }
        .quiz-workspace .quiz-form { display: flex; flex-direction: column; min-height: 0; flex: 1; gap: 12px; }
        .quiz-workspace .quiz-panels { display: grid; gap: 16px; min-height: 0; flex: 1; }
        .quiz-workspace .quiz-settings,
        .quiz-workspace .quiz-questions { min-width: 0; min-height: 0; margin: 0; padding: 0; border: 1px solid #e2e8f0; border-radius: 16px; background: white; overflow: hidden; }
        .quiz-workspace .quiz-panel-heading { flex-shrink: 0; padding: 9px 12px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
        .quiz-workspace .quiz-settings-body,
        .quiz-workspace .quiz-question-list { padding: 16px; min-height: 0; }
        .quiz-workspace .quiz-settings-body { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-content: start; gap: 8px 10px; padding: 10px 12px; }
        .quiz-workspace .quiz-settings-body > * { min-width: 0; grid-column: 1 / -1; }
        .quiz-workspace .quiz-settings-body > * + * { margin-top: 0; }
        .quiz-workspace .quiz-settings-body .quiz-subject-field,
        .quiz-workspace .quiz-settings-body .quiz-title-field,
        .quiz-workspace .quiz-settings-body .quiz-description-field,
        .quiz-workspace .quiz-settings-body .quiz-status-field { grid-column: auto; }
        .quiz-workspace .quiz-settings-body .quiz-times { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .quiz-workspace .quiz-settings-body .quiz-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 10px; padding: 8px 10px; }
        .quiz-workspace .quiz-options label { gap: 6px; margin: 0; align-items: center; }
        .quiz-workspace .quiz-options label:first-child { grid-column: 1 / -1; }
        .quiz-workspace .quiz-options span { font-size: 12px; line-height: 1.4; }
        .quiz-workspace .quiz-subject-field .quiz-locked-subject { padding: 6px 8px; font-size: 13px; line-height: 20px; border-radius: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .quiz-workspace .quiz-question-list > * + * { margin-top: 6px; }
        .quiz-workspace .quiz-settings-body input:not([type=checkbox]),
        .quiz-workspace .quiz-settings-body select,
        .quiz-workspace .quiz-settings-body textarea { min-width: 0; width: 100%; padding: 5px 8px; border-radius: 8px; font-size: 13px; line-height: 18px; }
        .quiz-workspace .quiz-settings-body label { margin-bottom: 4px; font-size: 12px; line-height: 16px; }
        .quiz-workspace .quiz-settings-body .grid { gap: 8px; }
        .quiz-workspace .quiz-settings-body .grid > div { min-width: 0; }
        .quiz-workspace .quiz-settings-body .quiz-grading { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .quiz-workspace .quiz-settings-body .quiz-grading > div:last-child { grid-column: auto; }
        .quiz-workspace .quiz-question-list section { padding: 8px 10px; border-radius: 10px; }
        .quiz-workspace .quiz-question-list section > * + * { margin-top: 6px; }
        .quiz-workspace .quiz-question-list section .grid { gap: 8px; }
        .quiz-workspace .quiz-question-list section label,
        .quiz-workspace .quiz-question-list section p,
        .quiz-workspace .quiz-question-list section button { font-size: 12px; line-height: 1.4; }
        .quiz-workspace .quiz-question-list section h3 { font-size: 13px; }
        .quiz-workspace .quiz-question-list section label > input,
        .quiz-workspace .quiz-question-list section label > select,
        .quiz-workspace .quiz-question-list section label > textarea { margin-top: 4px; }
        .quiz-workspace .quiz-question-list .quiz-choices { display: grid; grid-template-columns: minmax(0, 1fr); gap: 6px 12px; }
        .quiz-workspace .quiz-question-list .quiz-choices > * { margin: 0; min-width: 0; }
        .quiz-workspace .quiz-question-list .quiz-choices > div { gap: 6px; }
        .quiz-workspace .quiz-question-list .quiz-choices > p,
        .quiz-workspace .quiz-question-list .quiz-choices > button { grid-column: 1 / -1; text-align: left; }
        @media (min-width: 640px) {
          .quiz-workspace .quiz-question-list .quiz-choices { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        .quiz-workspace .quiz-question-list input:not([type=radio]),
        .quiz-workspace .quiz-question-list select,
        .quiz-workspace .quiz-question-list textarea { padding: 4px 7px; font-size: 13px; line-height: 1.4; border-radius: 6px; }
        .quiz-workspace .quiz-card-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; }
        .quiz-workspace .quiz-card-toolbar h3 { margin-right: 2px; white-space: nowrap; }
        .quiz-workspace .quiz-card-toolbar .quiz-kind { flex: 1; min-width: 125px; max-width: 190px; }
        .quiz-workspace .quiz-card-toolbar .quiz-points { display: flex; align-items: center; gap: 4px; }
        .quiz-workspace .quiz-card-toolbar .quiz-points input { width: 58px; }
        .quiz-workspace .quiz-question-list .quiz-card-toolbar label > input,
        .quiz-workspace .quiz-question-list .quiz-card-toolbar label > select,
        .quiz-workspace .quiz-question-list .quiz-prompt textarea { margin-top: 0; }
        .quiz-workspace .quiz-card-actions { margin-left: auto; align-items: center; gap: 4px; }
        .quiz-workspace .quiz-card-actions button { min-width: 26px; min-height: 26px; padding: 3px 5px; border-radius: 5px; background: #f8fafc; }
        .quiz-workspace .quiz-question-list .quiz-choices { gap: 4px 10px; }
        .quiz-workspace .quiz-question-list .quiz-remove-choice { width: 24px; min-height: 26px; flex-shrink: 0; font-size: 17px; }
        .quiz-workspace .quiz-prompt textarea { display: block; min-height: 32px; resize: vertical; overflow-y: auto; }
        .quiz-workspace .quiz-question-list .quiz-question-card { padding: 0; overflow: hidden; }
        .quiz-workspace .quiz-question-list .quiz-question-card > * + * { margin-top: 0; }
        .quiz-workspace .quiz-question-list .quiz-question-summary { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 42px; padding: 9px 12px; text-align: left; background: #fff; }
        .quiz-workspace .quiz-question-summary:hover { background: #f8fafc; }
        .quiz-workspace .quiz-question-summary:focus-visible { outline: 2px solid #6366f1; outline-offset: -2px; }
        .quiz-workspace .quiz-question-number { flex-shrink: 0; color: #4f46e5; font-weight: 800; }
        .quiz-workspace .quiz-question-preview { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-weight: 600; }
        .quiz-workspace .quiz-question-score { flex-shrink: 0; color: #64748b; font-size: 11px; }
        .quiz-workspace .quiz-question-editor { padding: 10px 12px; border-top: 1px solid #e2e8f0; }
        .quiz-workspace .quiz-question-editor > * + * { margin-top: 6px; }
        .quiz-workspace .quiz-settings-body .quiz-activity-classification { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .quiz-workspace .quiz-settings-body .quiz-activity-classification label { min-width: 0; margin-bottom: 0; }
        .quiz-workspace .quiz-description-field textarea { display: block; min-height: 32px; overflow-y: auto; }
        .quiz-workspace textarea { resize: vertical; }
        .quiz-workspace input[type=checkbox], .quiz-workspace input[type=radio] { accent-color: #4f46e5; }
        .quiz-workspace .quiz-actions { flex-shrink: 0; display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 10px; padding: 12px 16px; border: 1px solid #e2e8f0; border-radius: 14px; background: white; }
        .quiz-workspace .quiz-actions button { padding: 10px 20px; border-radius: 10px; font-size: 14px; }
        .quiz-workspace .quiz-summary { margin-right: auto; font-size: 13px; font-weight: 700; }
        @media (min-width: 1024px) {
          .quiz-workspace { display: flex; flex-direction: column; height: calc(100dvh - var(--quiz-top, 80px) - 16px); min-height: min-content; overflow: visible; }
          .quiz-workspace .quiz-panels { grid-template-columns: minmax(360px, 1fr) minmax(0, 1.2fr); min-height: min-content; overflow: visible; }
          .quiz-workspace .quiz-settings, .quiz-workspace .quiz-questions { display: flex; flex-direction: column; }
          .quiz-workspace .quiz-form { min-height: min-content; }
          .quiz-workspace .quiz-settings { min-height: min-content; overflow: visible; }
          .quiz-workspace .quiz-settings .quiz-panel-heading { border-radius: 16px 16px 0 0; }
          .quiz-workspace .quiz-settings-body { flex: 0 0 auto; overflow: visible; scrollbar-gutter: auto; }
          .quiz-workspace .quiz-question-list { flex: 1; overflow-y: auto; scrollbar-gutter: stable; overscroll-behavior: contain; }

        }
        @media (max-width: 639px) {
          .quiz-workspace { padding: 10px; }
          .quiz-workspace .quiz-summary { width: 100%; }
          .quiz-workspace .quiz-settings-body .quiz-subject-field,
          .quiz-workspace .quiz-settings-body .quiz-title-field,
          .quiz-workspace .quiz-settings-body .quiz-description-field,
          .quiz-workspace .quiz-settings-body .quiz-status-field { grid-column: 1 / -1; }
          .quiz-workspace .quiz-settings-body .quiz-times,
          .quiz-workspace .quiz-settings-body .quiz-grading,
          .quiz-workspace .quiz-settings-body .quiz-options,
          .quiz-workspace .quiz-settings-body .quiz-activity-classification { grid-template-columns: minmax(0, 1fr); }
          .quiz-workspace .quiz-actions button { flex: 1; }
        }
      `}</style>
      <div className="quiz-heading">
        <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
          Teacher
        </div>

        <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">
          Create New Activity
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Create activity for one
          of your subjects.
        </p>
      </div>

      <form
        onSubmit={
          handleSubmit
        }
        className="quiz-form"
      >
        <div className="quiz-panels">
        <section className="quiz-settings" aria-labelledby="quiz-settings-title">
          <div className="quiz-panel-heading">
            <h2 id="quiz-settings-title" className="font-black text-slate-900">Quiz settings</h2>
            <p className="text-xs text-slate-500">Details, schedule and grading</p>
          </div>
          <div className="quiz-settings-body">
        {/* Subject */}
        <div className="quiz-subject-field">
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Subject *
          </label>

          {subjectIdFromRoute ? (
            <div>
              <div title={selectedSubjectName ?? "Subject fixed for this activity"} className="quiz-locked-subject w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">
                {selectedSubjectName ??
                  (loadingSubjects
                    ? "Loading subject..."
                    : `Subject #${subjectIdFromRoute}`)}
              </div>


            </div>
          ) : subjectsError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <div className="text-sm font-bold text-rose-700">
                Unable to load
                subjects.
              </div>

              <div className="mt-1 text-xs text-rose-600">
                {subjectsErrorData instanceof
                Error
                  ? subjectsErrorData.message
                  : "Something went wrong."}
              </div>

              <button
                type="button"
                onClick={() =>
                  refetchSubjects()
                }
                className="mt-3 text-sm font-bold text-rose-700 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <select
              required
              value={
                formData.subject
              }
              onChange={(
                event
              ) =>
                setFormData(
                  (
                    prev
                  ) => ({
                    ...prev,

                    subject:
                      event
                        .target
                        .value,
                  })
                )
              }
              disabled={
                loadingSubjects
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
            >
              <option value="">
                {loadingSubjects
                  ? "Loading subjects..."
                  : "Select Subject"}
              </option>

              {subjects.map(
                (
                  subject
                ) => (
                  <option
                    key={
                      subject.id
                    }
                    value={
                      subject.id
                    }
                  >
                    {
                      subjectDisplayLabel(subject)
                    }
                  </option>
                )
              )}
            </select>
          )}
        </div>

        {/* Title */}
        <div className="quiz-title-field">
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Quiz Title *
          </label>

          <input
            type="text"
            required
            value={
              formData.title
            }
            onChange={(
              event
            ) =>
              setFormData(
                (
                  prev
                ) => ({
                  ...prev,

                  title:
                    event
                      .target
                      .value,
                })
              )
            }
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. Midterm Exam - Algebra"
          />
        </div>

        {/* Description */}
        <div className="quiz-description-field">
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Description
          </label>

          <textarea
            ref={expandQuestionText}
            onInput={(event) => expandQuestionText(event.currentTarget)}
            value={
              formData.description
            }
            onChange={(
              event
            ) =>
              setFormData(
                (
                  prev
                ) => ({
                  ...prev,

                  description:
                    event
                      .target
                      .value,
                })
              )
            }
            rows={1}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Quiz instructions or description"
          />
        </div>

        {/* Status */}
        <div className="quiz-status-field">
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Status
          </label>

          <select
            title="Scheduled uses dates. Open starts immediately until manually closed. Draft stays unpublished."
            value={
              formData.status
            }
            onChange={(
              event
            ) =>
              setFormData(
                (
                  prev
                ) => ({
                  ...prev,

                  status:
                    event
                      .target
                      .value as QuizStatus,
                })
              )
            }
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="DRAFT">
              Draft
              (Not visible to
              students)
            </option>

            <option value="SCHEDULED">
              Scheduled
              (Visible to
              students)
            </option>

            <option value="OPEN">
              Open
              (Available now)
            </option>

            <option value="CLOSED">
              Closed
            </option>
          </select>


        </div>

        <div className="quiz-activity-classification grid gap-2">
          <label className="block text-sm font-bold text-slate-700">
            Activity mode
            <select
              required
              value={formData.activity_mode}
              onChange={(event) => {
                const mode = event.target.value as CreateQuizForm["activity_mode"];
                setFormData((prev) => ({ ...prev, activity_mode: mode }));
                if (mode === "GROUP") {
                  setQuestions((items) => items.map((question) => ({
                    ...question,
                    question_type: "SHORT_ANSWER",
                    choices: [],
                  })));
                }
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="INDIVIDUAL">Individual</option>
              <option value="GROUP">By Group</option>
            </select>
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Grading category
            <select
              required
              value={formData.grade_type}
              onChange={(event) => setFormData((prev) => ({
                ...prev, grade_type: event.target.value as CreateQuizForm["grade_type"],
              }))}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="WRITTEN_WORK">Written Works</option>
              <option value="PERFORMANCE_TASK">Performance Task</option>
            </select>
          </label>
        </div>

        {/* Only scheduled/closed activities need date controls. */}
        {requiresSchedule && (
        <div className="quiz-times grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Open Time *
            </label>

            <input
              type="datetime-local"
              required
              value={
                formData.open_time
              }
              onChange={(
                event
              ) =>
                setFormData(
                  (
                    prev
                  ) => ({
                    ...prev,

                    open_time:
                      event
                        .target
                        .value,
                  })
                )
              }
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Close Time *
            </label>

            <input
              type="datetime-local"
              required
              value={
                formData.close_time
              }
              onChange={(
                event
              ) =>
                setFormData(
                  (
                    prev
                  ) => ({
                    ...prev,

                    close_time:
                      event
                        .target
                        .value,
                  })
                )
              }
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        )}

        {/* Settings */}
        <div className="quiz-grading grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="quiz-time-limit" className="block text-sm font-bold text-slate-700 mb-2">
              Limit (HH:MM)
            </label>

            <input
              id="quiz-time-limit"
              type="text"
              required
              pattern="[0-9]{2}:[0-5][0-9]"
              maxLength={5}
              placeholder="HH:MM"
              title="Enter a duration in HH:MM, for example 01:30 for 1 hour 30 minutes."
              value={timeLimitText}
              onChange={(event) => {
                const value = event.target.value;
                setTimeLimitText(value);
                const match = value.match(/^([0-9]{2}):([0-5][0-9])$/);
                setFormData((prev) => ({
                  ...prev,
                  time_limit: match ? Number(match[1]) * 60 + Number(match[2]) : 0,
                }));
              }}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Semester */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Semester
            </label>

            <select
              value={
                formData.semester
              }
              onChange={(
                event
              ) =>
                setFormData(
                  (
                    prev
                  ) => ({
                    ...prev,

                    semester:
                      event
                        .target
                        .value as Semester,
                  })
                )
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
            >
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

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Pass (points)
            </label>

            <input
              type="number"
              min={0}
              max={
                totalPoints
              }
              value={
                formData.passing_score
              }
              onChange={(
                event
              ) =>
                setFormData(
                  (
                    prev
                  ) => ({
                    ...prev,

                    passing_score:
                      Number(
                        event
                          .target
                          .value
                      ),
                  })
                )
              }
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="quiz-options rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={
                formData.show_correct_answers
              }
              onChange={(
                event
              ) =>
                setFormData(
                  (
                    prev
                  ) => ({
                    ...prev,

                    show_correct_answers:
                      event
                        .target
                        .checked,
                  })
                )
              }
            />

            <span className="text-sm font-medium text-slate-700">
              Show correct
              answers after
              submission
            </span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={
                formData.shuffle_questions
              }
              onChange={(
                event
              ) =>
                setFormData(
                  (
                    prev
                  ) => ({
                    ...prev,

                    shuffle_questions:
                      event
                        .target
                        .checked,
                  })
                )
              }
            />

            <span className="text-sm font-medium text-slate-700">
              Shuffle
              questions
            </span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={
                formData.allow_multiple_attempts
              }
              onChange={(
                event
              ) =>
                setFormData(
                  (
                    prev
                  ) => ({
                    ...prev,

                    allow_multiple_attempts:
                      event
                        .target
                        .checked,
                  })
                )
              }
            />

            <span className="text-sm font-medium text-slate-700">
              Allow multiple
              attempts
            </span>
          </label>
        </div>

          </div>
        </section>
        <fieldset disabled={createQuiz.isPending} className="quiz-questions" aria-labelledby="quiz-questions-title">
          <div className="quiz-panel-heading flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="quiz-questions-title" className="font-black text-slate-900">Questions</h2>
              <p className="text-sm text-slate-500">{questions.length} questions · {totalPoints} total points</p>
            </div>
            <button type="button" onClick={() => {
                const question = newQuestion(formData.activity_mode === "GROUP" ? "SHORT_ANSWER" : "MULTIPLE_CHOICE");
                setQuestions((items) => [...items, question]);
                setExpandedQuestionKey(question.key);
              }}
              className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white">+ Add question</button>
          </div>
          <div className="quiz-question-list">
          {questions.map((question, index) => (
            <section key={question.key} className="quiz-question-card rounded-2xl border border-slate-200 bg-white">
              <button
                type="button"
                className="quiz-question-summary"
                aria-expanded={expandedQuestionKey === question.key}
                aria-controls={`question-editor-${question.key}`}
                onClick={() => setExpandedQuestionKey((current) => current === question.key ? null : question.key)}
              >
                <span className="quiz-question-number">Q{index + 1}</span>
                <span className="quiz-question-preview">{question.question_text.trim() || "Untitled question"}</span>
                <span className="quiz-question-score">{question.points} pts</span>
                <span aria-hidden="true">{expandedQuestionKey === question.key ? "−" : "+"}</span>
              </button>
              <div id={`question-editor-${question.key}`} hidden={expandedQuestionKey !== question.key}>
              {expandedQuestionKey === question.key && (
              <div className="quiz-question-editor">
              <div className="quiz-card-toolbar">
                <h3 className="font-black text-slate-800">Q{index + 1}</h3>
                <label className="quiz-kind text-sm font-bold"><span className="sr-only">Question type</span>
                  <select value={question.question_type} disabled={formData.activity_mode === "GROUP"} onChange={(event) => {
                    const kind = event.target.value as QuestionKind;
                    updateQuestion(question.key, { question_type: kind, choices: newQuestion(kind).choices });
                  }} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3">
                    {formData.activity_mode !== "GROUP" && (
                      <>
                        <option value="MULTIPLE_CHOICE">Multiple choice</option>
                        <option value="TRUE_FALSE">True / False</option>
                      </>
                    )}
                    <option value="SHORT_ANSWER">Short answer</option>
                  </select>
                </label>
                <label className="quiz-points text-sm font-bold"><span>Pts</span>
                  <input type="number" min="0.01" step="any" required value={question.points}
                    onChange={(event) => updateQuestion(question.key, { points: Number(event.target.value) })}
                    className="mt-2 w-full rounded-xl border border-slate-200 p-3" />
                </label>
                <div className="quiz-card-actions flex text-sm font-bold">
                  <button type="button" disabled={index === 0} onClick={() => moveQuestion(index, -1)} className="disabled:opacity-30" aria-label={`Move question ${index + 1} up`} title="Move question up">↑</button>
                  <button type="button" disabled={index === questions.length - 1} onClick={() => moveQuestion(index, 1)} className="disabled:opacity-30" aria-label={`Move question ${index + 1} down`} title="Move question down">↓</button>
                  <button type="button" className="text-red-600" onClick={() => {
                    if (!question.question_text.trim() || window.confirm("Remove this question?")) {
                      setQuestions((items) => items.filter((q) => q.key !== question.key));
                    }
                  }}>Remove</button>
                </div>
              </div>
              <label className="quiz-prompt block text-sm font-bold"><span className="sr-only">Question text</span>
                <textarea required rows={1} value={question.question_text} placeholder="Enter your question"
                  id={`question-text-${question.key}`}
                  ref={expandQuestionText}
                  onInput={(event) => expandQuestionText(event.currentTarget)}
                  onChange={(event) => updateQuestion(question.key, { question_text: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 p-3" />
              </label>
              {question.question_type === "SHORT_ANSWER" ? (
                <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Short answers are graded manually after submission.</p>
              ) : (
                <div className="quiz-choices">
                  <p className="text-sm font-bold text-slate-600">Select the correct answer</p>
                  {question.choices.map((choice, choiceIndex) => (
                    <div key={choiceIndex} className="flex items-center gap-3">
                      <input type="radio" name={`correct-${question.key}`} checked={choice.is_correct}
                        aria-label={`Choice ${choiceIndex + 1} is correct for question ${index + 1}`}
                        onChange={() => updateQuestion(question.key, { choices: question.choices.map((c, ci) => ({ ...c, is_correct: ci === choiceIndex })) })} />
                      <input type="text" required readOnly={question.question_type === "TRUE_FALSE"}
                        aria-label={`Question ${index + 1}, choice ${choiceIndex + 1}`} value={choice.choice_text}
                        placeholder={`Choice ${choiceIndex + 1}`} className="min-w-0 flex-1 rounded-xl border border-slate-200 p-3"
                        onChange={(event) => updateQuestion(question.key, { choices: question.choices.map((c, ci) => ci === choiceIndex ? { ...c, choice_text: event.target.value } : c) })} />
                      {question.question_type === "MULTIPLE_CHOICE" && (
                        <button type="button" disabled={question.choices.length <= 2} className="quiz-remove-choice text-sm text-red-600 disabled:opacity-30" aria-label={`Remove choice ${choiceIndex + 1}`} title="Remove choice"
                          onClick={() => updateQuestion(question.key, { choices: question.choices.filter((_, ci) => ci !== choiceIndex) })}>×</button>
                      )}
                    </div>
                  ))}
                  {question.question_type === "MULTIPLE_CHOICE" && (
                    <button type="button" className="text-sm font-bold text-indigo-600"
                      onClick={() => updateQuestion(question.key, { choices: [...question.choices, { choice_text: "", is_correct: false }] })}>+ Add choice</button>
                  )}
                </div>
              )}
              </div>
              )}
              </div>
            </section>
          ))}
          {!questions.length && <p className="text-sm text-slate-500">Add a question to get started.</p>}
          </div>
        </fieldset>
        </div>

        {/* Actions */}
        <div className="quiz-actions">
          <span className="quiz-summary" aria-live="polite">{questions.length} questions · {totalPoints} total points</span>
          <button
            type="submit"
            disabled={
              createQuiz.isPending
            }
            className="px-6 py-3 rounded-2xl bg-indigo-600 text-white font-black hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createQuiz.isPending
              ? "Creating..."
              : "Create Activity"}
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(
                cancelPath
              )
            }
            disabled={
              createQuiz.isPending
            }
            className="px-6 py-3 rounded-2xl border border-slate-200 bg-white text-slate-700 font-black hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}