import { authFetch, API_BASE_URL } from "./apiClient";

// ==================== Types ====================

export interface AdminDashboardStats {
  students: number;
  teachers: number;
  subjects: number;
}

export interface AdminUserAccount {
  id: string | number;
  first_name?: string;
  last_name?: string;
  email: string;
  school_id?: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  student_profile?: {
    id?: number;
    grade_level?: string;
    lrn?: string;
    section?: string | number;
    section_name?: string;
    gender?: "MALE" | "FEMALE" | string;
    birthdate?: string;
    age?: number | null;
  };
  subjects?: { id: number; name: string }[];
  status?: string;
}

export interface SemesterData {
  id: number;
  school_year: number;
  name: "SEM1" | "SEM2" | "SEM3" | string;
  name_display: string;
  is_active: boolean;
}

export interface SchoolYearData {
  id: number;
  name: string;
  is_active: boolean;
  semesters: SemesterData[];
  active_semester: SemesterData | null;
}

export interface ActiveAcademicTerm {
  school_year: SchoolYearData | null;
  active_semester: SemesterData | null;
}

export interface AdminGradeLog {
  timestamp: string;
  teacher: string;
  student: string;
  subject: string;
  activity: string;
  previousGrade: string;
  newGrade: string;
  change: string;
  changeType: "Update" | "Create";
}

export interface AdminSubject {
  id: number;
  name: string;
  faculty_count?: number;
  teachers?: AdminTeacher[];
}

export interface AdminTeacher {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  subjects?: { id: number; name: string }[];
  advisory?: {
    id: number;
    section: string;
    grade_level?: string | number;
    adviser_name?: string;
  } | null;
}

export interface AdminSection {
  id: number;
  name: string;
  grade_level: string;
  adviser_name: string;
  student_count?: number;
}

export interface AdminStudent {
  id: number;
  school_id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
}

// ==================== API Functions ====================

/**
 * Fetch overview stats for the admin dashboard (students, teachers, subjects count).
 */
export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const res = await authFetch("/dashboard/stats/");
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Failed to load stats: ${err || res.statusText}`);
  }
  return res.json();
}

/**
 * Fetch all users (supports optional role filter).
 */
export async function getAdminUsers(role?: string): Promise<AdminUserAccount[]> {
  const url = role ? `/user/?role=${role}` : "/user/";
  const res = await authFetch(url);
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Failed to load users: ${err || res.statusText}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data.results ?? [];
}

/**
 * Create a new user account (Admin, Teacher, or Student).
 */
export async function createAdminUser(payload: Record<string, any>): Promise<any> {
  const res = await authFetch("/user/create/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const msg = errData?.detail || errData?.error || "Failed to create user account.";
    throw new Error(msg);
  }
  return res.json();
}

/**
 * Update an existing user account.
 */
export async function updateAdminUser(
  userId: string | number,
  payload: Record<string, any>
): Promise<any> {
  const res = await authFetch(`/user/${userId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.detail || errData?.error || "Failed to update user.");
  }
  return res.json();
}

/**
 * Delete a user account.
 */
export async function deleteAdminUser(userId: string | number): Promise<void> {
  const res = await authFetch(`/user/${userId}/`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 204) {
    throw new Error("Failed to delete user account.");
  }
}

/**
 * Import student accounts from Excel file.
 */
export async function importStudentsExcel(formData: FormData): Promise<any> {
  const res = await authFetch("/user/import-students/", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error || errData?.detail || "Failed to import students.");
  }
  return res.json();
}

/**
 * Fetch grade change audit logs.
 */
export async function getAdminGradeLogs(limit?: number): Promise<AdminGradeLog[]> {
  const url = limit ? `/grade-logs/?limit=${limit}` : "/grade-logs/";
  const res = await authFetch(url);
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Failed to load grade logs: ${err || res.statusText}`);
  }
  const data = await res.json();
  const list = Array.isArray(data) ? data : data.results ?? [];
  return list;
}

/**
 * Fetch curriculum subjects.
 */
export async function getAdminSubjects(): Promise<AdminSubject[]> {
  const res = await authFetch("/subjects/");
  if (!res.ok) {
    throw new Error("Failed to load subjects.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data.results ?? [];
}

/**
 * Create a new curriculum subject.
 */
export async function createAdminSubject(name: string): Promise<AdminSubject> {
  const res = await authFetch("/subjects/", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    throw new Error("Failed to create subject.");
  }
  return res.json();
}

/**
 * Delete a curriculum subject.
 */
export async function deleteAdminSubject(subjectId: number): Promise<void> {
  const res = await authFetch(`/subjects/${subjectId}/`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 204) {
    throw new Error("Failed to delete subject.");
  }
}

/**
 * Get subject details by ID.
 */
export async function getAdminSubjectDetail(subjectId: number): Promise<AdminSubject> {
  const res = await authFetch(`/subjects/${subjectId}/`);
  if (!res.ok) {
    throw new Error("Subject not found.");
  }
  return res.json();
}

/**
 * Get instructors assigned to a specific curriculum subject.
 */
export async function getAdminSubjectTeachers(subjectId: number): Promise<AdminTeacher[]> {
  const res = await authFetch(`/subjects/${subjectId}/teachers/`);
  if (!res.ok) {
    throw new Error("Failed to load subject teachers.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data.results ?? [];
}

/**
 * Assign an instructor to a curriculum subject.
 */
export async function assignTeacherToSubject(
  subjectId: number,
  teacherId: number
): Promise<any> {
  const res = await authFetch(`/subjects/${subjectId}/assign-teacher/`, {
    method: "POST",
    body: JSON.stringify({ teacher_id: teacherId }),
  });
  if (!res.ok) {
    throw new Error("Failed to assign instructor to subject.");
  }
  return res.json();
}

/**
 * Remove an instructor from a curriculum subject.
 */
export async function removeTeacherFromSubject(
  subjectId: number,
  teacherId: number
): Promise<any> {
  const res = await authFetch(`/subjects/${subjectId}/remove-teacher/`, {
    method: "POST",
    body: JSON.stringify({ teacher_id: teacherId }),
  });
  if (!res.ok) {
    throw new Error("Failed to remove instructor from subject.");
  }
  return res.json();
}

/**
 * Fetch all sections.
 */
export async function getAdminSections(): Promise<AdminSection[]> {
  const res = await authFetch("/sections/");
  if (!res.ok) {
    throw new Error("Failed to load sections.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data.results ?? [];
}

/**
 * Create a new section.
 */
export async function createAdminSection(payload: {
  name: string;
  grade_level: string;
  adviser?: number | string | null;
}): Promise<AdminSection> {
  const res = await authFetch("/sections/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error("Failed to create section.");
  }
  return res.json();
}

/**
 * Delete a section.
 */
export async function deleteAdminSection(sectionId: number): Promise<void> {
  const res = await authFetch(`/sections/${sectionId}/`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 204) {
    throw new Error("Failed to delete section.");
  }
}

/**
 * Get section detail.
 */
export async function getAdminSectionDetail(sectionId: number | string): Promise<AdminSection> {
  const res = await authFetch(`/sections/${sectionId}/`);
  if (!res.ok) {
    throw new Error("Section not found.");
  }
  return res.json();
}

/**
 * Get students in a section.
 */
export async function getAdminSectionStudents(
  sectionId: number | string
): Promise<AdminStudent[]> {
  const res = await authFetch(`/sections/${sectionId}/students/`);
  if (!res.ok) {
    throw new Error("Failed to load students in section.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data.results ?? [];
}

/**
 * Assign a student to a section.
 */
export async function assignStudentToSection(
  studentId: number | string,
  sectionId: number | string
): Promise<any> {
  const res = await authFetch(`/students/${studentId}/`, {
    method: "PATCH",
    body: JSON.stringify({ section: sectionId }),
  });
  if (!res.ok) {
    throw new Error("Failed to assign student to section.");
  }
  return res.json();
}

/**
 * Remove a student from their section.
 */
export async function removeStudentFromSection(
  studentId: number | string
): Promise<any> {
  const res = await authFetch(`/students/${studentId}/`, {
    method: "PATCH",
    body: JSON.stringify({ section: null }),
  });
  if (!res.ok) {
    throw new Error("Failed to remove student from section.");
  }
  return res.json();
}

/**
 * Assign an adviser to a section.
 */
export async function assignAdviserToSection(
  sectionId: number | string,
  teacherId: number | string
): Promise<any> {
  const res = await authFetch(`/sections/${sectionId}/`, {
    method: "PATCH",
    body: JSON.stringify({ adviser: teacherId }),
  });
  if (!res.ok) {
    throw new Error("Failed to assign adviser.");
  }
  return res.json();
}

/**
 * Remove adviser from a section.
 */
export async function removeAdviserFromSection(
  sectionId: number | string
): Promise<any> {
  const res = await authFetch(`/sections/${sectionId}/`, {
    method: "PATCH",
    body: JSON.stringify({ adviser: null }),
  });
  if (!res.ok) {
    throw new Error("Failed to remove adviser.");
  }
  return res.json();
}

/**
 * Fetch all teachers for selection/assignment dropdowns.
 */
export async function getAdminTeachers(): Promise<AdminTeacher[]> {
  const res = await authFetch("/teachers/");
  if (!res.ok) {
    throw new Error("Failed to load teachers.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data.results ?? [];
}

/**
 * Fetch all students for selection/assignment dropdowns.
 */
export async function getAdminStudents(): Promise<AdminStudent[]> {
  const res = await authFetch("/students/");
  if (!res.ok) {
    throw new Error("Failed to load students.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data.results ?? [];
}

/**
 * Fetch all school years with their 3 semesters.
 */
export async function getAcademicYears(): Promise<SchoolYearData[]> {
  const res = await authFetch("/academic-years/");
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Failed to load academic years: ${err || res.statusText}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data.results ?? [];
}

/**
 * Create a new school year (e.g. "2027-2028"). Auto-initializes SEM1, SEM2, SEM3.
 */
export async function createAcademicYear(name: string): Promise<SchoolYearData> {
  const res = await authFetch("/academic-years/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Failed to create academic year: ${err || res.statusText}`);
  }
  return res.json();
}

/**
 * Set a school year as the active school year.
 */
export async function activateAcademicYear(id: number): Promise<SchoolYearData> {
  const res = await authFetch(`/academic-years/${id}/activate/`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Failed to activate academic year: ${err || res.statusText}`);
  }
  return res.json();
}

/**
 * Set an active semester for a school year (SEM1, SEM2, or SEM3).
 */
export async function activateSemester(
  schoolYearId: number,
  semesterNameOrId: string | number
): Promise<SchoolYearData> {
  const body =
    typeof semesterNameOrId === "number"
      ? { semester_id: semesterNameOrId }
      : { semester_name: semesterNameOrId };

  const res = await authFetch(`/academic-years/${schoolYearId}/activate-semester/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Failed to activate semester: ${err || res.statusText}`);
  }
  return res.json();
}

/**
 * Get the currently active academic year and active semester.
 * Accessible to any authenticated user across all portals.
 */
export async function getActiveAcademicTerm(): Promise<ActiveAcademicTerm> {
  const res = await authFetch("/academic-years/active/");
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Failed to load active term: ${err || res.statusText}`);
  }
  return res.json();
}
