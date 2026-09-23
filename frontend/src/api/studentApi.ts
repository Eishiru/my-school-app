import type {
    StudentProfile, 
    StudentSubjectOffering, 
    StudentQuiz,
    StudentSubjectFile,
    StudentSemesterGradeRow,
    StudentSubjectQuarterlyGrade,
    StudentQuizAttempt,
    StudentQuizStartResponse,
    StudentQuizSubmitResponse,
    StudentQuizReviewData,
    StudentGradeForecast
} from "../types/studentTypes";
import { authFetch } from "./apiClient";



export async function getStudentProfile(): Promise<StudentProfile> {
   const response = await authFetch("/student/profile/",{
        method: "GET",
   });

    return response.json();

}

export async function getStudentSubjects(): Promise<StudentSubjectOffering[]>{
    const response = await authFetch("/student/subject-offerings/", {
        method: "GET",
    });

    return response.json();
}

export async function getStudentSubject(offeringId: number): Promise<StudentSubjectOffering> {
    const response = await authFetch(
        `/student/subject-offerings/${offeringId}/`,
        {
            method: "GET",
        }
    );

    return response.json();
}

export async function getStudentQuizzes(): Promise<StudentQuiz[]> {
  const response = await authFetch("/student/quizzes/", {
    method: "GET",
  });

  return response.json();
}

export async function getStudentSubjectQuizzes(
  offeringId: number
): Promise<StudentQuiz[]> {
  const response = await authFetch(
    `/student/subject-offerings/${offeringId}/quizzes/`,
    {
      method: "GET",
    }
  );

  return response.json();
}

export async function getStudentSubjectFiles(
  offeringId: number
): Promise<StudentSubjectFile[]> {
  const response = await authFetch(
    `/student/subject-offerings/${offeringId}/files/`,
    {
      method: "GET",
    }
  );

  return response.json();
}

export async function getStudentSemesterSummary(
  studentId?: number | string
): Promise<StudentSemesterGradeRow[]> {
  const url = studentId
    ? `/students/${studentId}/semester-summary/`
    : "/students/my-semester-summary/";
  const response = await authFetch(url, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch student semester summary: ${response.status}`
    );
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export async function getStudentSubjectGrades(
  offeringId: number
): Promise<StudentSubjectQuarterlyGrade[]> {
  const response = await authFetch(
    `/student/subject-offerings/${offeringId}/my-grades/`,
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
  return Array.isArray(data) ? data : [];
}

export async function getStudentQuizAttempts(): Promise<StudentQuizAttempt[]> {
  const response = await authFetch("/student/quiz-attempts/", {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch quiz attempts: ${response.status}`
    );
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export async function startStudentQuiz(quizId: number): Promise<StudentQuizStartResponse> {
  const response = await authFetch(`/student/quizzes/${quizId}/start/`, {
    method: "POST",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to start quiz: ${response.status}`);
  }

  return response.json();
}

export async function submitStudentQuiz(attemptId: number, formData: FormData): Promise<StudentQuizSubmitResponse> {
  const response = await authFetch(`/student/quiz-attempts/${attemptId}/submit/`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to submit quiz: ${response.status}`);
  }

  return response.json();
}

export async function getStudentQuizAttempt(attemptId: number): Promise<StudentQuizAttempt> {
  const response = await authFetch(`/student/quiz-attempts/${attemptId}/`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch quiz attempt: ${response.status}`);
  }

  return response.json();
}

export async function getStudentQuizReview(quizId: number): Promise<StudentQuizReviewData> {
  const response = await authFetch(`/student/quizzes/${quizId}/review/`, {
    method: "GET",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch quiz review: ${response.status}`);
  }

  return response.json();
}

export async function getStudentGradeForecast(subjectId: number): Promise<StudentGradeForecast> {
  const response = await authFetch(`/student/grade-forecast/${subjectId}/`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch grade forecast: ${response.status}`);
  }

  return response.json();
}