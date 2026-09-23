import React, { useMemo, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";

import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Search,
  X,
  Calendar,
  Users,
  FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { generateBanigPDF } from "./BanigExportPage";
import {
  useAdvisoryStudents,
  useStudentSemesterSummary,
  useTeacherAdvisoryDetail,
} from "../../../hooks/useTeacherSubjects";
import { useActiveAcademicTerm } from "../../../hooks/useAdminData";
import { formatGradeLevel, formatSectionName } from "./ExportReportCard";

import type {
  AdvisoryStudent,
  SemesterSummaryRow,
} from "../../../types/teacherTypes";

/* ==============================
   Helpers
============================== */

function parseJwt(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split(".")[1];

    if (!base64Url) {
      return null;
    }

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");

    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(
          (character) =>
            "%" + ("00" + character.charCodeAt(0).toString(16)).slice(-2),
        )
        .join(""),
    );

    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function getCurrentTeacherId() {
  const token = localStorage.getItem("access");

  if (!token) {
    return 0;
  }

  const payload = parseJwt(token);

  const rawId = payload?.user_id ?? payload?.id;

  return Number(rawId || 0);
}

function gradeLabel(gradeLevel: string | number) {
  if (typeof gradeLevel === "string" && gradeLevel.startsWith("GRADE_")) {
    return gradeLevel.replace("GRADE_", "Grade ");
  }

  return `Grade ${gradeLevel}`;
}

function safeAverage(values: Array<number | null | undefined>) {
  const numbers = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );

  if (numbers.length === 0) {
    return null;
  }

  return numbers.reduce((total, value) => total + value, 0) / numbers.length;
}

/* ==============================
   Main Page
============================== */

export default function AdvisoryClass() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const teacherId = getCurrentTeacherId();
  const [expandedStudent, setExpandedStudent] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: activeTerm } = useActiveAcademicTerm();

  /* --------------------------
     Teacher
  -------------------------- */

  const {
    data: teacher,
    isLoading: teacherLoading,
    isError: teacherError,
    error: teacherErrorData,
  } = useTeacherAdvisoryDetail(teacherId);

  const sectionId = teacher?.advisory?.id ?? 0;

  /* --------------------------
     Advisory Students
  -------------------------- */

  const {
    data: students = [],
    isLoading: studentsLoading,
    isError: studentsError,
    error: studentsErrorData,
  } = useAdvisoryStudents(sectionId);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter((student) => {
      const name = `${student.first_name} ${student.last_name}`.toLowerCase();
      const id = String(student.school_id || "").toLowerCase();
      const email = String(student.email || "").toLowerCase();
      return name.includes(q) || id.includes(q) || email.includes(q);
    });
  }, [students, searchQuery]);

  const loading = teacherLoading || studentsLoading;

  /* --------------------------
     Header
  -------------------------- */

  const header = useMemo(() => {
    const section = teacher?.advisory;

    if (!section) {
      return {
        title: "No Advisory Class Assigned",

        subtitle: `${students.length} Students Enrolled`,
      };
    }

    return {
      title: `${gradeLabel(section.grade_level)} - ${section.section}`,

      subtitle: `${students.length} Students Enrolled`,
    };
  }, [teacher, students.length]);

  /* --------------------------
     Invalid Teacher
  -------------------------- */

  if (!teacherId) {
    return (
      <AdvisoryError message="Unable to determine the current teacher account." />
    );
  }

  /* --------------------------
     Loading
  -------------------------- */

  if (loading) {
    return <AdvisoryLoading />;
  }

  /* --------------------------
     Error
  -------------------------- */

  if (teacherError || studentsError) {
    const message =
      teacherErrorData instanceof Error
        ? teacherErrorData.message
        : studentsErrorData instanceof Error
          ? studentsErrorData.message
          : "Failed to load advisory class.";

    return <AdvisoryError message={message} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {header.title}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {students.length} Students Enrolled {teacher ? `• Class Adviser: ${teacher.first_name} ${teacher.last_name}` : ""}
          </p>
        </div>

        <button
          type="button"
          disabled={exporting || students.length === 0}
          onClick={async () => {
            try {
              setExporting(true);
              await generateBanigPDF({
                queryClient,
                teacher,
                students,
                schoolYear: activeTerm?.school_year?.name,
              });
            } finally {
              setExporting(false);
            }
          }}
          className="inline-flex items-center gap-2 self-start md:self-auto px-4 py-2 bg-white border border-slate-200/80 text-slate-700 text-xs font-semibold rounded-lg shadow-xs hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          <Download size={14} className="text-indigo-600" />
          <span>{exporting ? "Generating Banig PDF..." : "Export Banig (Summary)"}</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      {teacher?.advisory && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              size={15}
            />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students by name, LRN, or email..."
              className="w-full rounded-lg border border-slate-200/80 bg-white py-2 pl-9 pr-9 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="text-xs font-medium text-slate-500">
            Showing {filteredStudents.length} of {students.length} students
          </div>
        </div>
      )}

      {/* No Advisory Class */}
      {!teacher?.advisory ? (
        <div className="rounded-xl border border-slate-200/80 bg-white p-12 text-center text-xs text-slate-400 shadow-xs">
          You are not currently assigned as an adviser for any section.
        </div>
      ) : (
        /* Student Table */
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th className="w-12 px-4 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Student Name
                  </th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    LRN / ID
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student, index) => {
                  const isExpanded = expandedStudent === student.id;

                  return (
                    <React.Fragment key={student.id}>
                      {/* Student Row */}
                      <tr
                        onClick={() =>
                          setExpandedStudent((previous) =>
                            previous === student.id ? null : student.id,
                          )
                        }
                        className={`cursor-pointer transition-colors ${
                          isExpanded ? "bg-indigo-50/40" : "hover:bg-slate-50/60"
                        }`}
                      >
                        <td className="px-4 py-3.5 text-center text-slate-400 font-mono text-xs">
                          {index + 1}
                        </td>

                        <td className="px-6 py-3.5">
                          <StudentIdentity student={student} />
                        </td>

                        <td className="px-6 py-3.5 text-center">
                          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {student.school_id}
                          </span>
                        </td>

                        <td className="px-6 py-3.5">
                          <div className="flex justify-end items-center gap-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                const cleanGrade = formatGradeLevel(student.grade_level || teacher?.advisory?.grade_level);
                                const cleanSection = formatSectionName(teacher?.advisory?.section || (student as any).section_name || student.section);
                                navigate(
                                  `/teacher/advisory-class/report-card/${student.id}`,
                                  {
                                    state: {
                                      student: {
                                        name: `${student.first_name} ${student.last_name}`.trim(),
                                        lrn: student.school_id,
                                        section: cleanSection,
                                        Section: cleanSection,
                                        grade: cleanGrade,
                                        age: (student as any).age,
                                        sex: (student as any).sex || (student as any).gender,
                                        schoolYear: activeTerm?.school_year?.name || "",
                                      },
                                    },
                                  },
                                );
                              }}
                              className="px-3 py-1.5 bg-white border border-slate-200/80 text-slate-700 text-xs font-semibold rounded-lg hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-colors shadow-xs"
                            >
                              Generate SF9
                            </button>

                            <span className="p-1 text-slate-400 hover:text-slate-600">
                              {isExpanded ? (
                                <ChevronUp size={16} />
                              ) : (
                                <ChevronDown size={16} />
                              )}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Semester Grades */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={4} className="p-0 bg-slate-50/40 border-b border-slate-100">
                            <StudentSemesterDetails student={student} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-12 text-center text-xs text-slate-400"
                    >
                      {students.length === 0
                        ? "No students enrolled in this advisory section."
                        : "No students match your search query."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==============================
   Expanded Student Semester Data
============================== */

function StudentSemesterDetails({ student }: { student: AdvisoryStudent }) {
  const {
    data: grades = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useStudentSemesterSummary(student.id, true);

  /*
   * Overall final average
   * across subject offerings.
   */
  const overallAverage = useMemo(() => {
    return safeAverage(grades.map((grade) => grade.final));
  }, [grades]);

  if (isLoading) {
    return (
      <div className="p-8 text-sm font-semibold text-slate-500">
        Loading semester grades...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-2 text-sm font-bold text-rose-600">
          <AlertCircle size={16} />

          <span>
            {error instanceof Error
              ? error.message
              : "Failed to load semester grades."}
          </span>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 text-xs font-black text-indigo-600 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-5 border-t border-slate-100 bg-slate-50/50">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Performance Details Cards */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Academic Performance
          </h4>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <p className="text-[10px] font-semibold text-slate-400 uppercase">
              Overall Cumulative Average
            </p>
            <p className="text-xl font-bold text-slate-900 mt-1">
              {overallAverage != null ? `${overallAverage.toFixed(1)}%` : "—"}
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <p className="text-[10px] font-semibold text-slate-400 uppercase">
              Curriculum Basis
            </p>
            <p className="text-xs font-semibold text-slate-800 mt-1">
              3 Semesters Standard
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <p className="text-[10px] font-semibold text-slate-400 uppercase">
              Enrolled Subjects
            </p>
            <p className="text-xl font-bold text-slate-900 mt-1">
              {grades.length}
            </p>
          </div>
        </div>

        {/* Semester Matrix Table */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                    Subject Offering
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                    Semester 1
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                    Semester 2
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                    Semester 3
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                    Final Grade
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {grades.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-6 text-center text-xs text-slate-400"
                    >
                      No semester grades available for this learner yet.
                    </td>
                  </tr>
                ) : (
                  grades.map((grade) => (
                    <SemesterGradeRow
                      key={grade.subject_offering_id}
                      grade={grade}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==============================
   Semester Grade Row
============================== */

function SemesterGradeRow({ grade }: { grade: SemesterSummaryRow }) {
  const semesterScores = [
    grade.semester_1 ?? grade.sem1 ?? null,
    grade.semester_2 ?? grade.sem2 ?? null,
    grade.semester_3 ?? grade.sem3 ?? null,
  ];

  return (
    <tr className="hover:bg-slate-50/60 transition-colors">
      <td className="px-4 py-3 font-semibold text-slate-800">{grade.subject}</td>

      {semesterScores.map((score, index) => (
        <td
          key={index}
          className={`px-4 py-3 text-center font-mono ${
            typeof score === "number" && score < 75
              ? "text-rose-600 font-semibold"
              : "text-slate-600"
          }`}
        >
          {typeof score === "number" ? score.toFixed(1) : "—"}
        </td>
      ))}

      <td className="px-4 py-3 text-right">
        <span
          className={`font-mono font-bold ${
            typeof grade.final === "number" && grade.final < 75
              ? "text-rose-600"
              : "text-indigo-600"
          }`}
        >
          {typeof grade.final === "number" ? grade.final.toFixed(1) : "—"}
        </span>
      </td>
    </tr>
  );
}

/* ==============================
   Student Identity
============================== */

function StudentIdentity({ student }: { student: AdvisoryStudent }) {
  const fullName = `${student.first_name} ${student.last_name}`.trim();
  const initials =
    (student.first_name?.charAt(0) || "") + (student.last_name?.charAt(0) || "");

  return (
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center font-bold text-xs text-blue-700 border border-blue-100 shrink-0">
        {initials || "S"}
      </div>

      <div className="min-w-0">
        <span className="font-semibold text-sm text-slate-900 block truncate">
          {fullName}
        </span>
        <span className="text-xs text-slate-400 block truncate">
          {student.email}
        </span>
      </div>
    </div>
  );
}

/* ==============================
   Loading & Error
============================== */

function AdvisoryLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-20 rounded-xl border border-slate-200/80 bg-white" />
      <div className="h-96 rounded-xl border border-slate-200/80 bg-white" />
    </div>
  );
}

function AdvisoryError({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-6 text-rose-700 text-center max-w-xl mx-auto">
      <AlertCircle className="mx-auto text-rose-500 mb-2" size={24} />
      <div className="font-bold text-sm text-slate-900">{message}</div>
    </div>
  );
}
