import { useQuery } from "@tanstack/react-query";
import { getStudentSubject } from "../api/studentApi";

export function useStudentSubject(offeringId: number) {
  return useQuery({
    queryKey: ["student", "subject", offeringId],
    queryFn: () => getStudentSubject(offeringId),
    enabled: offeringId > 0,
    staleTime: 10 * 60 * 1000,
  });
}