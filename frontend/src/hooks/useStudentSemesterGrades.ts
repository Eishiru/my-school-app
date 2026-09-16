import { useQuery } from "@tanstack/react-query";
import {
  getStudentSemesterSummary,
  getStudentSubjectGrades,
  getStudentQuizAttempts,
} from "../api/studentApi";

export function useStudentSemesterGrades(studentId?: number | string) {
  return useQuery({
    queryKey: ["student", "semester-summary", studentId ?? "me"],
    queryFn: () => getStudentSemesterSummary(studentId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useStudentSubjectGrades(offeringId: number) {
  return useQuery({
    queryKey: ["student", "subject", offeringId, "grades"],
    queryFn: () => getStudentSubjectGrades(offeringId),
    enabled: offeringId > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStudentQuizAttempts() {
  return useQuery({
    queryKey: ["student", "quiz-attempts"],
    queryFn: getStudentQuizAttempts,
    staleTime: 2 * 60 * 1000,
  });
}
