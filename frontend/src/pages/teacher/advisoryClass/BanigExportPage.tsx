import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { QueryClient } from "@tanstack/react-query";
import {
  getTeacherAdvisoryDetail,
  getAdvisoryStudents,
  getStudentSemesterSummary,
} from "../../../api/teacherApi";
import type {
  TeacherAdvisoryDetail,
  AdvisoryStudent,
  SemesterSummaryRow,
} from "../../../types/teacherTypes";

function parseJwt(token: string): any {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export interface GenerateBanigPDFOptions {
  queryClient?: QueryClient;
  teacher?: TeacherAdvisoryDetail | null;
  students?: AdvisoryStudent[];
  token?: string | null;
  schoolYear?: string;
}

export async function generateBanigPDF(options?: GenerateBanigPDFOptions) {
  const token = options?.token ?? localStorage.getItem("access");
  if (!token) return;

  const payload = parseJwt(token);
  const userId = Number(payload?.user_id ?? payload?.id ?? 0);
  if (!userId) return;

  const queryClient = options?.queryClient;

  // =============================
  // RESOLVE / FETCH TEACHER (Adviser)
  // =============================
  let teacher: TeacherAdvisoryDetail | null = options?.teacher ?? null;
  if (!teacher) {
    if (queryClient) {
      teacher = await queryClient.fetchQuery({
        queryKey: ["teacher", "advisory", userId],
        queryFn: () => getTeacherAdvisoryDetail(userId),
        staleTime: 10 * 60 * 1000,
      });
    } else {
      teacher = await getTeacherAdvisoryDetail(userId);
    }
  }

  if (!teacher?.advisory) return;

  const sectionId = teacher.advisory.id;
  const adviserName = `${teacher.first_name} ${teacher.last_name}`;
  const schoolYear = options?.schoolYear || "2026-2027";
  const curriculumYear = teacher.advisory.grade_level;

  // =============================
  // RESOLVE / FETCH STUDENTS
  // =============================
  let students: AdvisoryStudent[] = options?.students ?? [];
  if (!students || students.length === 0) {
    if (queryClient) {
      students = await queryClient.fetchQuery({
        queryKey: ["teacher", "advisory", "section", sectionId, "students"],
        queryFn: () => getAdvisoryStudents(sectionId),
        staleTime: 5 * 60 * 1000,
      });
    } else {
      students = await getAdvisoryStudents(sectionId);
    }
  }

  // =============================
  // FETCH / RESOLVE GRADES (Using React Query cache)
  // =============================
  const allStudentData = await Promise.all(
    students.map(async (student: AdvisoryStudent) => {
      try {
        let grades: SemesterSummaryRow[];
        if (queryClient) {
          grades = await queryClient.fetchQuery({
            queryKey: [
              "teacher",
              "advisory",
              "student",
              student.id,
              "semester-summary",
            ],
            queryFn: () => getStudentSemesterSummary(student.id),
            staleTime: 5 * 60 * 1000,
          });
        } else {
          grades = await getStudentSemesterSummary(student.id);
        }
        return { student, grades: Array.isArray(grades) ? grades : [] };
      } catch (err) {
        console.error(`Failed to load grades for student ${student.id}:`, err);
        return { student, grades: [] };
      }
    })
  );

  // =============================
  // COLLECT SUBJECTS
  // =============================
  const subjectMap = new Map<string, any>();

  allStudentData.forEach((s: any) => {
    s.grades.forEach((g: any) => {
      if (!subjectMap.has(g.subject)) {
        subjectMap.set(g.subject, {
          subject: g.subject,
          teacher: g.teacher_name ?? "",
        });
      }
    });
  });

  const subjects = Array.from(subjectMap.values());

  // =============================
  // CREATE PDF
  // =============================
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a3",
  });

  doc.setFontSize(9);

  const nameColWidth = 40; // wider name column
  const ratingColWidth = 12; // each rating column
  const subjectBlockWidth = ratingColWidth * 4;

  // Build header rows
  const headerRow1: any[] = [
    { content: `School Year: ${schoolYear}`, styles: { cellWidth: nameColWidth } },
  ];

  const headerRow2: any[] = [
    { content: `Curriculum Year: ${curriculumYear}`, styles: { cellWidth: nameColWidth } },
  ];

  const headerRow3: any[] = [
    { content: `Adviser: ${adviserName}`, styles: { cellWidth: nameColWidth } },
  ];

  const headerRow4: any[] = [
    { content: "NAME OF STUDENTS/PUPILS", styles: { cellWidth: nameColWidth } },
  ];

  subjects.forEach((s) => {
    // Row 1 - Teacher
    headerRow1.push({
      content: s.teacher,
      colSpan: 4,
      styles: { halign: "center" },
    });

    // Row 2 - Subject
    headerRow2.push({
      content: s.subject,
      colSpan: 4,
      styles: { halign: "center" },
    });

    // Row 3 - PER RATING / SEMESTER
    headerRow3.push({
      content: "SEMESTER",
      colSpan: 4,
      styles: { halign: "center" },
    });

    // Row 4 - 1 2 3 A
    ["1", "2", "3", "A"].forEach((r) => {
      headerRow4.push({ content: r });
    });
  });

  // =============================
  // BUILD STUDENT ROWS
  // =============================
  const body: any[] = [];

  allStudentData.forEach((entry: any) => {
    const row: any[] = [];

    const studentName = `${entry.student.last_name}, ${entry.student.first_name}`;
    row.push(studentName);

    subjects.forEach((subjectInfo: any) => {
      const grade = entry.grades.find(
        (g: any) => g.subject === subjectInfo.subject
      );

      const sem1 = grade?.semester_1 ?? grade?.sem1;
      const sem2 = grade?.semester_2 ?? grade?.sem2;
      const sem3 = grade?.semester_3 ?? grade?.sem3;

      row.push(
        sem1 != null ? (typeof sem1 === "number" ? sem1.toFixed(1) : sem1) : "",
        sem2 != null ? (typeof sem2 === "number" ? sem2.toFixed(1) : sem2) : "",
        sem3 != null ? (typeof sem3 === "number" ? sem3.toFixed(1) : sem3) : "",
        grade?.final != null ? (typeof grade.final === "number" ? grade.final.toFixed(1) : grade.final) : ""
      );
    });

    body.push(row);
  });

  // =============================
  // RENDER TABLE
  // =============================
  autoTable(doc, {
    head: [headerRow1, headerRow2, headerRow3, headerRow4],
    body: body,
    startY: 10,
    theme: "grid",
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      lineWidth: 0.2,
      lineColor: [0, 0, 0], 
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: nameColWidth },
    },
    margin: { left: 5, right: 5 },
  });

  doc.save("BANIG_FORM.pdf");
}
