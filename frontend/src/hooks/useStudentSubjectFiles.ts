import { useQuery } from "@tanstack/react-query";
import { getStudentSubjectFiles } from "../api/studentApi";

export function useStudentSubjectFiles(offeringId: number) {
  return useQuery({
    queryKey: ["student", "subject", offeringId, "files"],
    queryFn: () => getStudentSubjectFiles(offeringId),
    enabled: offeringId > 0,
    staleTime: 5 * 60 * 1000,
  });
}