import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAdminDashboardStats,
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  importStudentsExcel,
  getAdminGradeLogs,
  getAdminSubjects,
  createAdminSubject,
  deleteAdminSubject,
  getAdminSubjectDetail,
  getAdminSubjectTeachers,
  assignTeacherToSubject,
  removeTeacherFromSubject,
  getAdminSections,
  createAdminSection,
  deleteAdminSection,
  getAdminSectionDetail,
  getAdminSectionStudents,
  assignStudentToSection,
  removeStudentFromSection,
  assignAdviserToSection,
  removeAdviserFromSection,
  getAdminTeachers,
  getAdminStudents,
  getAcademicYears,
  createAcademicYear,
  activateAcademicYear,
  activateSemester,
  getActiveAcademicTerm,
  AdminDashboardStats,
  AdminUserAccount,
  AdminGradeLog,
  AdminSubject,
  AdminTeacher,
  AdminSection,
  AdminStudent,
  SemesterData,
  SchoolYearData,
  ActiveAcademicTerm,
} from "../api/adminApi";

export type {
  AdminDashboardStats,
  AdminUserAccount,
  AdminGradeLog,
  AdminSubject,
  AdminTeacher,
  AdminSection,
  AdminStudent,
  SemesterData,
  SchoolYearData,
  ActiveAcademicTerm,
};

// ==================== QUERIES ====================

/**
 * Fetch overview statistics for the Admin Dashboard.
 */
export function useAdminDashboardStats() {
  return useQuery<AdminDashboardStats>({
    queryKey: ["admin", "stats"],
    queryFn: getAdminDashboardStats,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch user accounts list with optional role filter.
 */
export function useAdminUsers(role?: string) {
  return useQuery<AdminUserAccount[]>({
    queryKey: ["admin", "users", role ?? "ALL"],
    queryFn: () => getAdminUsers(role),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch grade change audit logs.
 */
export function useAdminGradeLogs(limit?: number) {
  return useQuery<AdminGradeLog[]>({
    queryKey: ["admin", "gradeLogs", limit ?? "ALL"],
    queryFn: () => getAdminGradeLogs(limit),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Fetch curriculum subjects list.
 */
export function useAdminSubjects() {
  return useQuery<AdminSubject[]>({
    queryKey: ["admin", "subjects"],
    queryFn: getAdminSubjects,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch detail for a specific subject.
 */
export function useAdminSubjectDetail(subjectId: number) {
  return useQuery<AdminSubject>({
    queryKey: ["admin", "subjects", subjectId],
    queryFn: () => getAdminSubjectDetail(subjectId),
    enabled: subjectId > 0,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch teachers assigned to a specific subject.
 */
export function useAdminSubjectTeachers(subjectId: number) {
  return useQuery<AdminTeacher[]>({
    queryKey: ["admin", "subjects", subjectId, "teachers"],
    queryFn: () => getAdminSubjectTeachers(subjectId),
    enabled: subjectId > 0,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch all sections.
 */
export function useAdminSections() {
  return useQuery<AdminSection[]>({
    queryKey: ["admin", "sections"],
    queryFn: getAdminSections,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch detail for a specific section.
 */
export function useAdminSectionDetail(sectionId: number | string) {
  return useQuery<AdminSection>({
    queryKey: ["admin", "sections", sectionId],
    queryFn: () => getAdminSectionDetail(sectionId),
    enabled: !!sectionId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch students enrolled in a specific section.
 */
export function useAdminSectionStudents(sectionId: number | string) {
  return useQuery<AdminStudent[]>({
    queryKey: ["admin", "sections", sectionId, "students"],
    queryFn: () => getAdminSectionStudents(sectionId),
    enabled: !!sectionId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch all teachers for assignment dropdowns.
 */
export function useAdminTeachers() {
  return useQuery<AdminTeacher[]>({
    queryKey: ["admin", "teachers"],
    queryFn: getAdminTeachers,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch all students for assignment dropdowns.
 */
export function useAdminStudents() {
  return useQuery<AdminStudent[]>({
    queryKey: ["admin", "students"],
    queryFn: getAdminStudents,
    staleTime: 5 * 60 * 1000,
  });
}

// ==================== MUTATIONS ====================

/**
 * Create a new user account (Admin, Teacher, or Student).
 */
export function useCreateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, any>) => createAdminUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

/**
 * Update an existing user account.
 */
export function useUpdateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: string | number;
      payload: Record<string, any>;
    }) => updateAdminUser(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

/**
 * Delete a user account.
 */
export function useDeleteAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string | number) => deleteAdminUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

/**
 * Import students via Excel spreadsheet.
 */
export function useImportStudentsExcel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => importStudentsExcel(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "sections"] });
    },
  });
}

/**
 * Create a new curriculum subject.
 */
export function useCreateAdminSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createAdminSubject(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "subjects"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

/**
 * Delete a curriculum subject.
 */
export function useDeleteAdminSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subjectId: number) => deleteAdminSubject(subjectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "subjects"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

/**
 * Assign a teacher to a subject.
 */
export function useAssignTeacherToSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      subjectId,
      teacherId,
    }: {
      subjectId: number;
      teacherId: number;
    }) => assignTeacherToSubject(subjectId, teacherId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "subjects"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "subjects", variables.subjectId, "teachers"],
      });
    },
  });
}

/**
 * Remove a teacher from a subject.
 */
export function useRemoveTeacherFromSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      subjectId,
      teacherId,
    }: {
      subjectId: number;
      teacherId: number;
    }) => removeTeacherFromSubject(subjectId, teacherId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "subjects"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "subjects", variables.subjectId, "teachers"],
      });
    },
  });
}

/**
 * Create a new section.
 */
export function useCreateAdminSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      name: string;
      grade_level: string;
      adviser?: number | string | null;
    }) => createAdminSection(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "sections"] });
    },
  });
}

/**
 * Delete a section.
 */
export function useDeleteAdminSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sectionId: number) => deleteAdminSection(sectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "sections"] });
    },
  });
}

/**
 * Assign a student to a section.
 */
export function useAssignStudentToSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      studentId,
      sectionId,
    }: {
      studentId: number | string;
      sectionId: number | string;
    }) => assignStudentToSection(studentId, sectionId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "sections", variables.sectionId, "students"],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "sections"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "students"] });
    },
  });
}

/**
 * Remove a student from a section.
 */
export function useRemoveStudentFromSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      studentId,
      sectionId,
    }: {
      studentId: number | string;
      sectionId: number | string;
    }) => removeStudentFromSection(studentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "sections", variables.sectionId, "students"],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "sections"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "students"] });
    },
  });
}

/**
 * Assign an adviser to a section.
 */
export function useAssignAdviserToSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sectionId,
      teacherId,
    }: {
      sectionId: number | string;
      teacherId: number | string;
    }) => assignAdviserToSection(sectionId, teacherId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "sections", variables.sectionId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "sections"] });
    },
  });
}

/**
 * Remove adviser from a section.
 */
export function useRemoveAdviserFromSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sectionId: number | string) =>
      removeAdviserFromSection(sectionId),
    onSuccess: (_, sectionId) => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "sections", sectionId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "sections"] });
    },
  });
}

// ==================== ACADEMIC SETUP HOOKS ====================

/**
 * Fetch all school years with their 3 semesters (Admin only).
 */
export function useAcademicYears() {
  return useQuery<SchoolYearData[]>({
    queryKey: ["admin", "academicYears"],
    queryFn: getAcademicYears,
  });
}

/**
 * Fetch the currently active school year and semester.
 * Can be used globally across all portals (Topbar, etc.).
 */
export function useActiveAcademicTerm() {
  return useQuery<ActiveAcademicTerm>({
    queryKey: ["academicTerm", "active"],
    queryFn: getActiveAcademicTerm,
    staleTime: 60 * 1000,
  });
}

/**
 * Create a new school year.
 */
export function useCreateAcademicYear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createAcademicYear(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "academicYears"] });
      queryClient.invalidateQueries({ queryKey: ["academicTerm", "active"] });
    },
  });
}

/**
 * Activate a school year.
 */
export function useActivateAcademicYear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => activateAcademicYear(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "academicYears"] });
      queryClient.invalidateQueries({ queryKey: ["academicTerm", "active"] });
    },
  });
}

/**
 * Activate a semester for a school year.
 */
export function useActivateSemester() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      schoolYearId,
      semesterNameOrId,
    }: {
      schoolYearId: number;
      semesterNameOrId: string | number;
    }) => activateSemester(schoolYearId, semesterNameOrId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "academicYears"] });
      queryClient.invalidateQueries({ queryKey: ["academicTerm", "active"] });
    },
  });
}
