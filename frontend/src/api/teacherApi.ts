import { authFetch } from "./apiClient";
import type { AdvisoryStudent, ApplySemesterWeightsPayload, BatchRecordQuizScoresPayload, BatchRecordQuizScoresResponse, CreateQuizPayload, CreateQuizQuestionPayload, CreateQuizResponse, DeleteQuizQuestionPayload, DeleteSemesterGradePayload, DeleteSubjectFilePayload, DeleteTeacherQuizPayload, GradeAnswerPayload, QuizItemAnalysisData, RecentQuizGrade, SaveSemesterGradePayload, Semester, SemesterGrade, SemesterSummaryRow, StudentDetail, StudentSubmission, TeacherAdvisoryDetail, TeacherPendingGradingTask, TeacherQuiz, TeacherQuizActivity, TeacherQuizQuestion, TeacherSemesterGrade, TeacherSubjectFile, TeacherSubjectOffering, TeacherSubjectStudent, TeacherSubjectSubmissionDetail, UpdateQuizQuestionPayload, UpdateQuizStatusPayload, UpdateQuizTimesPayload, UploadSubjectFilePayload } from "../types/teacherTypes";

export async function getTeacherSubjects(): Promise<TeacherSubjectOffering[]> {
  const response = await authFetch("/subject-offerings/", {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch teacher subjects: ${response.status}`
    );
  }

  const data = await response.json();

  return Array.isArray(data)
    ? data
    : data.results ?? [];
}

export async function deleteTeacherSubject(
  subjectId: number
): Promise<void> {
  const response = await authFetch(
    `/subject-offerings/${subjectId}/`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to delete teacher subject: ${response.status}`
    );
  }
}

export async function getTeacherSubject(
  subjectId: number
) {
  const response = await authFetch(
    `/subject-offerings/${subjectId}/`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch subject: ${response.status}`
    );
  }

  return response.json();
}

export async function getTeacherSubjectQuizzes(
  subjectId: number
): Promise<TeacherQuiz[]> {
  const response = await authFetch(
    `/subject-offerings/${subjectId}/quizzes/`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch quizzes: ${response.status}`
    );
  }

  const data = await response.json();

  return Array.isArray(data)
    ? data
    : data.results ?? [];
}

export async function getRecentQuizGrades(
  subjectId: number
): Promise<RecentQuizGrade[]> {
  const response = await authFetch(
    `/subject-offerings/${subjectId}/recent-quiz-grades/`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch recent quiz grades: ${response.status}`
    );
  }

  const data = await response.json();

  return Array.isArray(data)
    ? data
    : data.results ?? [];
}

export async function getSubjectFiles(
  subjectId: number
): Promise<TeacherSubjectFile[]> {
  const response = await authFetch(
    `/subject-offerings/${subjectId}/files/`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch subject files: ${response.status}`
    );
  }

  const data = await response.json();

  return Array.isArray(data)
    ? data
    : data.results ?? [];
}

export async function uploadSubjectFile({
  subjectId,
  file,
  title,
}: UploadSubjectFilePayload): Promise<TeacherSubjectFile> {
  const form = new FormData();

  form.append("file", file);
  form.append("title", title?.trim() || file.name);

  const response = await authFetch(
    `/subject-offerings/${subjectId}/files/upload/`,
    {
      method: "POST",
      body: form,
    }
  );

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => null);

    throw new Error(
      errorData?.detail ||
        `Failed to upload file: ${response.status}`
    );
  }

  return response.json();
}

export async function deleteSubjectFile({
  subjectId,
  fileId,
}: DeleteSubjectFilePayload): Promise<void> {
  const response = await authFetch(
    `/subject-offerings/${subjectId}/files/${fileId}/`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to delete file: ${response.status}`
    );
  }
}

export async function getTeacherSubjectActivities(
  subjectId: number
): Promise<TeacherQuizActivity[]> {
  const response = await authFetch(
    "/teacher/quizzes/",
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch activities: ${response.status}`
    );
  }

  const data = await response.json();

  const quizzes = Array.isArray(data)
    ? data
    : data.results ?? [];

  return quizzes.filter(
    (quiz: TeacherQuizActivity) =>
      quiz.SubjectOffering === subjectId
  );
}

export async function deleteTeacherQuizActivity({
  activityId,
}: DeleteTeacherQuizPayload): Promise<void> {
  const response = await authFetch(
    `/teacher/quizzes/${activityId}/`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to delete activity: ${response.status}`
    );
  }
}

export async function getTeacherSubjectGrades(
  subjectId: number
): Promise<TeacherSemesterGrade[]> {
  const response = await authFetch(
    `/semester-grades/?SubjectOffering_id=${subjectId}`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch subject grades: ${response.status}`
    );
  }

  const data = await response.json();

  return Array.isArray(data)
    ? data
    : data.results ?? [];
}

export async function getTeacherSubjectStudents(
  subjectId: number
): Promise<TeacherSubjectStudent[]> {
  const response = await authFetch(
    `/subject-offerings/${subjectId}/students/`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch class list: ${response.status}`
    );
  }

  const data = await response.json();

  return Array.isArray(data)
    ? data
    : data.results ?? [];
}

export async function getTeacherQuizzes(): Promise<TeacherQuiz[]> {
  const response = await authFetch(
    "/teacher/quizzes/",
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch teacher quizzes: ${response.status}`
    );
  }

  const data = await response.json();

  return Array.isArray(data)
    ? data
    : data.results ?? [];
}

export async function getTeacherPendingGrading(): Promise<TeacherPendingGradingTask[]> {
  const response = await authFetch(
    "/teacher/quizzes/pending-grading/",
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function getTeacherQuizAttempts(
  quizId: number
): Promise<{ id: number; quiz: number; student: number; score: number | null; status: string }[]> {
  const response = await authFetch(
    `/teacher/quizzes/${quizId}/attempts/`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return Array.isArray(data) ? data : data.results ?? [];
}

export async function deleteTeacherQuiz(
  quizId: number
): Promise<void> {
  const response = await authFetch(
    `/teacher/quizzes/${quizId}/`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to delete quiz: ${response.status}`
    );
  }
}

// quiz analysis

export async function getQuizItemAnalysis(
  quizId: number
): Promise<QuizItemAnalysisData> {
  const response = await authFetch(
    `/teacher/quizzes/${quizId}/item-analysis/`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch item analysis: ${response.status}`
    );
  }

  return response.json();
}

export async function generateQuizAIAnalysis(
  quizId: number
): Promise<QuizItemAnalysisData> {
  const response = await authFetch(
    `/teacher/quizzes/${quizId}/item-analysis/?with_ai=true`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to generate AI analysis: ${response.status}`
    );
  }

  return response.json();
}

export async function getTeacherQuiz(
  quizId: number
): Promise<TeacherQuiz> {
  const response = await authFetch(
    `/teacher/quizzes/${quizId}/`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch quiz: ${response.status}`
    );
  }

  return response.json();
}

export async function getQuizStudentSubmissions(
  quizId: number
): Promise<StudentSubmission[]> {
  const response = await authFetch(
    `/teacher/quizzes/${quizId}/student_answers/`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch submissions: ${response.status}`
    );
  }

  const data = await response.json();

  return Array.isArray(data)
    ? data
    : data.results ?? [];
}

export async function gradeQuizAnswer({
  answerId,
  points,
  feedback,
}: GradeAnswerPayload): Promise<void> {
  const response = await authFetch(
    "/teacher/quizzes/grade-answer/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        answer_id: answerId,
        points_earned: points,
        feedback,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => null);

    throw new Error(
      errorData?.error ||
        `Failed to grade answer: ${response.status}`
    );
  }
}

// create quiz

export async function getQuizQuestions(
  quizId: number
): Promise<TeacherQuizQuestion[]> {
  const response = await authFetch(
    `/teacher/quizzes/${quizId}/questions/`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch quiz questions: ${response.status}`
    );
  }

  const data = await response.json();

  return Array.isArray(data)
    ? data
    : data.results ?? [];
}

export async function updateQuizTimes({
  quizId,
  open_time,
  close_time,
}: UpdateQuizTimesPayload): Promise<void> {
  const response = await authFetch(
    `/teacher/quizzes/${quizId}/update_times/`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        open_time,
        close_time,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to update quiz times: ${response.status}`
    );
  }
}

export async function updateQuizStatus({
  quizId,
  status,
}: UpdateQuizStatusPayload): Promise<void> {
  const response = await authFetch(
    `/teacher/quizzes/${quizId}/`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to update quiz status: ${response.status}`
    );
  }
}

export async function addQuizQuestion(
  payload: CreateQuizQuestionPayload
): Promise<void> {
  const {
    quizId,
    ...questionData
  } = payload;

  const response = await authFetch(
    `/teacher/quizzes/${quizId}/add_question/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        questionData
      ),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to add question: ${response.status}`
    );
  }
}

export async function updateQuizQuestion(
  payload: UpdateQuizQuestionPayload
): Promise<void> {
  const {
    questionId,
    quizId: _quizId,
    ...questionData
  } = payload;

  const response = await authFetch(
    `/teacher/questions/${questionId}/`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        questionData
      ),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to update question: ${response.status}`
    );
  }
}

export async function deleteQuizQuestion({
  questionId,
}: DeleteQuizQuestionPayload): Promise<void> {
  const response = await authFetch(
    `/teacher/questions/${questionId}/`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to delete question: ${response.status}`
    );
  }
}

function formatApiErrorMessage(errorData: unknown, fallback: string): string {
  if (!errorData) return fallback;
  if (typeof errorData === "string") return errorData;
  if (typeof errorData === "object" && !Array.isArray(errorData)) {
    const obj = errorData as Record<string, unknown>;
    if (typeof obj.detail === "string") return obj.detail;
    if (typeof obj.error === "string") return obj.error;
    if (typeof obj.message === "string") return obj.message;
    const messages = Object.entries(obj)
      .map(([field, value]) => {
        const msg = Array.isArray(value)
          ? value.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ")
          : typeof value === "object"
            ? JSON.stringify(value)
            : String(value);
        return field === "detail" || field === "non_field_errors" ? msg : `${field}: ${msg}`;
      })
      .filter(Boolean);
    if (messages.length > 0) {
      return messages.join("\n");
    }
  }
  return fallback;
}

export async function createTeacherQuiz(
  payload: CreateQuizPayload
): Promise<CreateQuizResponse> {
  const response = await authFetch(
    "/teacher/quizzes/",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => null);

    throw new Error(
      formatApiErrorMessage(
        errorData,
        `Failed to create quiz: ${response.status}`
      )
    );
  }

  return response.json();
}

export async function batchRecordQuizScores(
  payload: BatchRecordQuizScoresPayload
): Promise<BatchRecordQuizScoresResponse> {
  const response = await authFetch(
    "/teacher/quizzes/batch-record-scores/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => null);

    throw new Error(
      errorData?.detail ||
        errorData?.error ||
        `Failed to record scores: ${response.status}`
    );
  }

  return response.json();
}

export async function getSemesterGrades(
  subjectId: number,
  semester: Semester
): Promise<SemesterGrade[]> {
  const response = await authFetch(
    `/semester-grades/?SubjectOffering_id=${subjectId}&semester=${semester}`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch semester grades: ${response.status}`
    );
  }

  const data = await response.json();

  return Array.isArray(data)
    ? data
    : data.results ?? [];
}

export async function saveSemesterGrade(
  payload: SaveSemesterGradePayload
): Promise<SemesterGrade> {
  const {
    gradeId,
    ...body
  } = payload;

  const response = await authFetch(
    gradeId
      ? `/semester-grades/${gradeId}/`
      : "/semester-grades/",
    {
      method: gradeId
        ? "PUT"
        : "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => null);

    throw new Error(
      errorData?.detail ||
        errorData?.error ||
        `Failed to save semester grade: ${response.status}`
    );
  }

  return response.json();
}

export async function deleteSemesterGrade({
  gradeId,
}: DeleteSemesterGradePayload): Promise<void> {
  const response = await authFetch(
    `/semester-grades/${gradeId}/`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to delete semester grade: ${response.status}`
    );
  }
}

export async function applySemesterWeights({
  subjectId,
  semester,
  ww_weight,
  pt_weight,
  sa_weight,
}: ApplySemesterWeightsPayload): Promise<void> {
  const response = await authFetch(
    "/semester-grades/bulk-apply-weights/",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        SubjectOffering: subjectId,
        semester,
        ww_weight,
        pt_weight,
        sa_weight,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => null);

    throw new Error(
      errorData?.detail ||
        errorData?.error ||
        `Failed to apply weights: ${response.status}`
    );
  }
}

import type {
  TeacherSubmissionsSummary,
} from "../types/teacherTypes";

export async function getTeacherSubmissionsSummary(): Promise<TeacherSubmissionsSummary> {
  const response = await authFetch(
    "/teacher/submissions/summary/",
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch submissions summary: ${response.status}`
    );
  }

  const data = await response.json();

  return {
    totals:
      data?.totals ?? null,

    by_subject:
      Array.isArray(
        data?.by_subject
      )
        ? data.by_subject
        : [],
  };
}

export async function getTeacherSubjectSubmissionDetail(
  subjectId: number
): Promise<TeacherSubjectSubmissionDetail> {
  const response = await authFetch(
    `/teacher/submissions/subject/${subjectId}/`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch subject submissions: ${response.status}`
    );
  }

  return response.json();
}

// advisory class 
export async function getTeacherAdvisoryDetail(
  teacherId: number
): Promise<TeacherAdvisoryDetail> {
  const response = await authFetch(
    `/teachers/${teacherId}/`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch teacher profile: ${response.status}`
    );
  }

  return response.json();
}

export async function getAdvisoryStudents(
  sectionId: number
): Promise<AdvisoryStudent[]> {
  const response = await authFetch(
    `/sections/${sectionId}/students/`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch advisory students: ${response.status}`
    );
  }

  const data = await response.json();

  return Array.isArray(data)
    ? data
    : data.results ?? [];
}

export async function getStudentSemesterSummary(
  studentId: number
): Promise<SemesterSummaryRow[]> {
  const response = await authFetch(
    `/students/${studentId}/semester-summary/`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch semester summary: ${response.status}`
    );
  }

  const data = await response.json();

  return Array.isArray(data)
    ? data
    : data.results ?? [];
}

export async function getStudentDetail(
  studentId: number
): Promise<StudentDetail> {
  const response = await authFetch(
    `/students/${studentId}/`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch student details: ${response.status}`
    );
  }

  return response.json();
}