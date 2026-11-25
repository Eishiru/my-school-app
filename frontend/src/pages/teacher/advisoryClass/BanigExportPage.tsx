import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
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

// =====================================================================
// BANIG EXCEL EXPORT
// =====================================================================
export async function generateBanigExcel(options?: GenerateBanigPDFOptions) {
  const token = options?.token ?? localStorage.getItem("access");
  if (!token) return;

  const payload = parseJwt(token);
  const userId = Number(payload?.user_id ?? payload?.id ?? 0);
  if (!userId) return;

  const queryClient = options?.queryClient;

  // ---- Resolve teacher ----
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

  const sectionId   = teacher.advisory.id;
  const adviserName = `${teacher.first_name} ${teacher.last_name}`;
  const schoolYear  = options?.schoolYear || "2026-2027";
  const gradeLevel  = teacher.advisory.grade_level;
  const sectionName = (teacher.advisory as any).section ?? "";

  // ---- Resolve students ----
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

  // ---- Fetch grades per student ----
  const allStudentData = await Promise.all(
    students.map(async (student: AdvisoryStudent) => {
      try {
        let grades: SemesterSummaryRow[];
        if (queryClient) {
          grades = await queryClient.fetchQuery({
            queryKey: ["teacher", "advisory", "student", student.id, "semester-summary"],
            queryFn: () => getStudentSemesterSummary(student.id),
            staleTime: 5 * 60 * 1000,
          });
        } else {
          grades = await getStudentSemesterSummary(student.id);
        }
        return { student, grades: Array.isArray(grades) ? grades : [] };
      } catch {
        return { student, grades: [] };
      }
    })
  );

  // ---- Collect subjects (preserving order) ----
  const subjectMap = new Map<string, { subject: string; teacher: string }>();
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

  // =====================================================================
  // BUILD WORKSHEET DATA (aoa = array of arrays)
  // =====================================================================
  const aoa: any[][] = [];

  // ---- Meta rows ----
  aoa.push([`School Year: ${schoolYear}`]);
  aoa.push([`Curriculum Year: ${gradeLevel}`]);
  aoa.push([`Adviser: ${adviserName}`]);
  aoa.push([]); // blank spacer

  // ---- Teacher header row ----
  const teacherRow: any[] = [""];
  subjects.forEach((s) => {
    teacherRow.push(s.teacher, "", "", "");
  });
  aoa.push(teacherRow);

  // ---- Subject header row ----
  const subjectRow: any[] = [""];
  subjects.forEach((s) => {
    subjectRow.push(s.subject, "", "", "");
  });
  aoa.push(subjectRow);

  // ---- "SEMESTER" label row ----
  const semLabelRow: any[] = [""];
  subjects.forEach(() => {
    semLabelRow.push("SEMESTER", "", "", "");
  });
  aoa.push(semLabelRow);

  // ---- Column headers: NAME | 1 2 3 A per subject ----
  const colHeader: any[] = ["NAME OF STUDENTS/PUPILS"];
  subjects.forEach(() => {
    colHeader.push("1", "2", "3", "A");
  });
  aoa.push(colHeader);

  // ---- Student data rows ----
  allStudentData.forEach(({ student, grades }: any) => {
    const row: any[] = [`${student.last_name}, ${student.first_name}`];
    subjects.forEach((subjectInfo) => {
      const grade = grades.find((g: any) => g.subject === subjectInfo.subject);
      const sem1  = grade?.semester_1 ?? grade?.sem1;
      const sem2  = grade?.semester_2 ?? grade?.sem2;
      const sem3  = grade?.semester_3 ?? grade?.sem3;
      const avg   = grade?.final;
      row.push(
        sem1 != null ? (typeof sem1 === "number" ? parseFloat(sem1.toFixed(1)) : sem1) : "",
        sem2 != null ? (typeof sem2 === "number" ? parseFloat(sem2.toFixed(1)) : sem2) : "",
        sem3 != null ? (typeof sem3 === "number" ? parseFloat(sem3.toFixed(1)) : sem3) : "",
        avg  != null ? (typeof avg  === "number" ? parseFloat(avg.toFixed(1))  : avg)  : "",
      );
    });
    aoa.push(row);
  });

  // =====================================================================
  // XLSX MERGE CELLS
  // =====================================================================
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Row indices (0-based): 0=SchoolYear, 1=CurriculumYear, 2=Adviser, 3=blank,
  //   4=TeacherRow, 5=SubjectRow, 6=SemLabel, 7=ColHeader, 8+=students
  const TEACHER_ROW  = 4;
  const SUBJECT_ROW  = 5;
  const SEMLBL_ROW   = 6;

  if (!ws["!merges"]) ws["!merges"] = [];

  subjects.forEach((_, i) => {
    const startCol = 1 + i * 4; // B, F, J, ...
    const endCol   = startCol + 3;
    ws["!merges"]!.push(
      { s: { r: TEACHER_ROW, c: startCol }, e: { r: TEACHER_ROW, c: endCol } },
      { s: { r: SUBJECT_ROW, c: startCol }, e: { r: SUBJECT_ROW, c: endCol } },
      { s: { r: SEMLBL_ROW,  c: startCol }, e: { r: SEMLBL_ROW,  c: endCol } },
    );
  });

  // Set column widths
  const colWidths: { wch: number }[] = [{ wch: 32 }]; // name column
  subjects.forEach(() => {
    colWidths.push({ wch: 7 }, { wch: 7 }, { wch: 7 }, { wch: 7 });
  });
  ws["!cols"] = colWidths;

  // =====================================================================
  // WORKBOOK & SAVE
  // =====================================================================
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "BANIG Form");

  const safeName = sectionName
    ? `BANIG_FORM_${sectionName}_${schoolYear}`.replace(/[^a-zA-Z0-9_\-]/g, "_")
    : `BANIG_FORM_${schoolYear}`.replace(/[^a-zA-Z0-9_\-]/g, "_");

  XLSX.writeFile(wb, `${safeName}.xlsx`);
}
