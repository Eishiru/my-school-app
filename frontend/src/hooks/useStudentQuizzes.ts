import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getStudentQuizzes,
  getStudentQuizAttempts,
  startStudentQuiz,
  submitStudentQuiz,
  getStudentQuizAttempt,
  getStudentQuizReview,
  getStudentGradeForecast,
} from "../api/studentApi";

export function useStudentQuizzes() {
  return useQuery({
    queryKey: ["student", "quizzes"],
    queryFn: getStudentQuizzes,
    staleTime: 2 * 60 * 1000,
  });
}

export function useStudentQuizAttempts() {
  return useQuery({
    queryKey: ["student", "quiz-attempts"],
    queryFn: getStudentQuizAttempts,
    staleTime: 2 * 60 * 1000,
  });
}

export function useStudentQuizAttempt(attemptId: number | null | undefined) {
  return useQuery({
    queryKey: ["student", "quiz-attempt", attemptId],
    queryFn: () => getStudentQuizAttempt(attemptId!),
    enabled: !!attemptId,
  });
}

export function useStudentQuizReview(quizId: number | null | undefined) {
  return useQuery({
    queryKey: ["student", "quiz-review", quizId],
    queryFn: () => getStudentQuizReview(quizId!),
    enabled: !!quizId,
  });
}

export function useStudentGradeForecast(subjectId: number | null | undefined) {
  return useQuery({
    queryKey: ["student", "grade-forecast", subjectId],
    queryFn: () => getStudentGradeForecast(subjectId!),
    enabled: !!subjectId,
  });
}

export function useStartStudentQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quizId: number) => startStudentQuiz(quizId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student", "quiz-attempts"] });
    },
  });
}

export function useSubmitStudentQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ attemptId, formData }: { attemptId: number; formData: FormData }) =>
      submitStudentQuiz(attemptId, formData),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["student", "quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["student", "quiz-attempts"] });
      queryClient.invalidateQueries({ queryKey: ["student", "quiz-attempt", variables.attemptId] });
    },
  });
}