import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
  useSearchParams,
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

type CreateQuizForm = {
  subject: string;

  title: string;
  description: string;

  open_time: string;
  close_time: string;

  time_limit: number;

  semester: Semester;

  passing_score: number;

  status: QuizStatus;

  grade_type: "WRITTEN_WORK" | "PERFORMANCE_TASK" | "FINAL_EXAM";

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

  const [searchParams] = useSearchParams();
  const urlGradeType = searchParams.get("grade_type");
  const initialGradeType = (
    urlGradeType === "PERFORMANCE_TASK" ||
    urlGradeType === "FINAL_EXAM" ||
    urlGradeType === "WRITTEN_WORK"
      ? urlGradeType
      : "WRITTEN_WORK"
  ) as "WRITTEN_WORK" | "PERFORMANCE_TASK" | "FINAL_EXAM";

  const [formData, setFormData] =
    useState<CreateQuizForm>({
      subject: "",

      title: "",
      description: "",

      open_time: "",
      close_time: "",

      time_limit: 60,

      semester:
        "SEMESTER_1",

      passing_score: 1,

      status:
        "SCHEDULED",

      grade_type: initialGradeType,

      show_correct_answers:
        false,

      shuffle_questions:
        false,

      allow_multiple_attempts:
        false,
    });

  const [questions, setQuestions] = useState<DraftQuestion[]>(() => [newQuestion()]);
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
        subject?.name ??
        null
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
        if (!question.question_text.trim()) { alert(prefix + "Enter the question text."); return; }
        if (!Number.isFinite(question.points) || question.points <= 0) { alert(prefix + "Enter points greater than zero."); return; }
        if (question.question_type !== "SHORT_ANSWER") {
          if (question.choices.length < 2 || question.choices.some((c) => !c.choice_text.trim())) {
            alert(prefix + "Fill in every choice, or remove unused choices."); return;
          }
          if (question.choices.filter((c) => c.is_correct).length !== 1) {
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

      if (
        !formData.open_time ||
        !formData.close_time
      ) {
        alert(
          "Open and close times are required."
        );
        return;
      }

      const openDate =
        new Date(
          formData.open_time
        );

      const closeDate =
        new Date(
          formData.close_time
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
          "Invalid quiz schedule."
        );
        return;
      }

      if (
        closeDate <=
        openDate
      ) {
        alert(
          "Close time must be after open time."
        );
        return;
      }

      if (
        formData.time_limit <=
        0
      ) {
        alert(
          "Time limit must be greater than 0."
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
              ...{ questions: questions.map((question, order) => ({
                question_text: question.question_text.trim(),
                question_type: question.question_type,
                points: question.points,
                order,
                choices: question.choices.map((choice, choiceOrder) => ({
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
                openDate.toISOString(),

              close_time:
                closeDate.toISOString(),

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

              grade_type:
                formData.grade_type,

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
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
          Teacher
        </div>

        <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">
          Create New Activity
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Create a quiz for one
          of your subject
          offerings.
        </p>
      </div>

      <form
        onSubmit={
          handleSubmit
        }
        className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6"
      >
        {/* Subject */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Subject *
          </label>

          {subjectIdFromRoute ? (
            <div>
              <div className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">
                {selectedSubjectName ??
                  (loadingSubjects
                    ? "Loading subject..."
                    : `Subject #${subjectIdFromRoute}`)}
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Subject is fixed
                because you are
                creating this
                activity inside a
                subject.
              </p>
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
                      subject.name
                    }
                  </option>
                )
              )}
            </select>
          )}
        </div>

        {/* Title */}
        <div>
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
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Description
          </label>

          <textarea
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
            rows={3}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Quiz instructions or description"
          />
        </div>

        {/* Times */}
        <div className="grid gap-4 md:grid-cols-2">
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

        {/* Settings */}
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Time Limit
              (minutes)
            </label>

            <input
              type="number"
              min={1}
              value={
                formData.time_limit
              }
              onChange={(
                event
              ) =>
                setFormData(
                  (
                    prev
                  ) => ({
                    ...prev,

                    time_limit:
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

          {/* Activity Category / Grade Type */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Grading Category
            </label>

            <select
              value={formData.grade_type}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  grade_type: event.target.value as "WRITTEN_WORK" | "PERFORMANCE_TASK" | "FINAL_EXAM",
                }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
            >
              <option value="WRITTEN_WORK">Written Work (WW)</option>
              <option value="PERFORMANCE_TASK">Performance Task (PT)</option>
              <option value="FINAL_EXAM">Final Exam / Assessment</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Passing Score (points)
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

        {/* Total Points */}
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
          <p className="text-sm font-bold text-indigo-900">Total points: {totalPoints}</p>
          <p className="text-sm text-indigo-700">Calculated from your questions below.</p>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Status
          </label>

          <select
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

          <p className="mt-1 text-xs text-slate-500">
            Scheduled quizzes
            follow the open and
            close times you set.
          </p>
        </div>

        {/* Toggles */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
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

        <fieldset disabled={createQuiz.isPending} className="space-y-5 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">Questions</h2>
              <p className="text-sm text-slate-500">{questions.length} questions · {totalPoints} total points</p>
            </div>
            <button type="button" onClick={() => setQuestions((items) => [...items, newQuestion()])}
              className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white">+ Add question</button>
          </div>
          {questions.map((question, index) => (
            <section key={question.key} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-black text-slate-800">Question {index + 1}</h3>
                <div className="flex gap-3 text-sm font-bold">
                  <button type="button" disabled={index === 0} onClick={() => moveQuestion(index, -1)} className="disabled:opacity-30" aria-label={`Move question ${index + 1} up`}>Move up</button>
                  <button type="button" disabled={index === questions.length - 1} onClick={() => moveQuestion(index, 1)} className="disabled:opacity-30" aria-label={`Move question ${index + 1} down`}>Move down</button>
                  <button type="button" className="text-red-600" onClick={() => {
                    if (!question.question_text.trim() || window.confirm("Remove this question?")) {
                      setQuestions((items) => items.filter((q) => q.key !== question.key));
                    }
                  }}>Remove</button>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="text-sm font-bold sm:col-span-2">Question type
                  <select value={question.question_type} onChange={(event) => {
                    const kind = event.target.value as QuestionKind;
                    if (question.choices.some((c) => c.choice_text.trim()) && !window.confirm("Changing type resets the answer choices. Continue?")) return;
                    updateQuestion(question.key, { question_type: kind, choices: newQuestion(kind).choices });
                  }} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3">
                    <option value="MULTIPLE_CHOICE">Multiple choice</option>
                    <option value="TRUE_FALSE">True / False</option>
                    <option value="SHORT_ANSWER">Short answer</option>
                  </select>
                </label>
                <label className="text-sm font-bold">Points
                  <input type="number" min="0.01" step="any" required value={question.points}
                    onChange={(event) => updateQuestion(question.key, { points: Number(event.target.value) })}
                    className="mt-2 w-full rounded-xl border border-slate-200 p-3" />
                </label>
              </div>
              <label className="block text-sm font-bold">Question text
                <textarea required rows={3} value={question.question_text} placeholder="Enter your question"
                  onChange={(event) => updateQuestion(question.key, { question_text: event.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 p-3" />
              </label>
              {question.question_type === "SHORT_ANSWER" ? (
                <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Short answers are graded manually after submission.</p>
              ) : (
                <div className="space-y-3">
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
                        <button type="button" disabled={question.choices.length <= 2} className="text-sm text-red-600 disabled:opacity-30"
                          onClick={() => updateQuestion(question.key, { choices: question.choices.filter((_, ci) => ci !== choiceIndex) })}>Remove</button>
                      )}
                    </div>
                  ))}
                  {question.question_type === "MULTIPLE_CHOICE" && (
                    <button type="button" className="text-sm font-bold text-indigo-600"
                      onClick={() => updateQuestion(question.key, { choices: [...question.choices, { choice_text: "", is_correct: false }] })}>+ Add choice</button>
                  )}
                </div>
              )}
            </section>
          ))}
          {!questions.length && <p className="text-sm text-slate-500">Add a question to get started.</p>}
        </fieldset>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-2">
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