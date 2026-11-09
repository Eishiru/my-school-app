import { useQuery } from "@tanstack/react-query";
import { getSubjectOfferingForecasts } from "../api/teacherApi";

export function useSubjectOfferingForecasts(
  subjectOfferingId: number | null | undefined
) {
  return useQuery({
    queryKey: ["teacher", "subject-offering-forecasts", subjectOfferingId],
    queryFn: () => getSubjectOfferingForecasts(subjectOfferingId!),
    enabled: !!subjectOfferingId,
  });
}
