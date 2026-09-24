import { useQuery } from "@tanstack/react-query";
import { getStudentSubjectQuizzes } from "../api/studentApi";

export function useStudentSubjectQuizzes(offeringId: number) {
  return useQuery({
    queryKey: ["student", "subject", offeringId, "quizzes"],
    queryFn: () => getStudentSubjectQuizzes(offeringId),
    enabled: offeringId > 0,
    staleTime: 5 * 60 * 1000,
  });
}