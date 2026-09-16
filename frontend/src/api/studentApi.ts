import type {
    StudentProfile, 
    StudentSubjectOffering, 
    StudentQuiz,
    StudentSubjectFile,
    StudentSemesterGradeRow,
    StudentSubjectQuarterlyGrade,
    StudentQuizAttempt
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