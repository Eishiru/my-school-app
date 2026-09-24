import {useQuery} from "@tanstack/react-query";
import { getStudentProfile } from "../api/studentApi";

export function useStudentProfile() {
    return useQuery({

        queryKey:["student", "profile"],
        queryFn: getStudentProfile,
        staleTime: 10 * 60 * 1000,
    });
}