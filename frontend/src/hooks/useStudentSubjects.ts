import { useQuery } from "@tanstack/react-query";
import { getStudentSubjects } from "../api/studentApi";

export function useStudentSubjects() {
    return useQuery({
        queryKey: ["student", "subjects"],
        queryFn: getStudentSubjects,
        staleTime: 10 * 60 * 1000
    });
}