import React, {
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Download,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import {
  generateBanigPDF,
} from "./BanigExportPage";

import {
  useAdvisoryStudents,
  useStudentSemesterSummary,
  useTeacherAdvisoryDetail,
} from "../../../hooks/useTeacherSubjects";

import type {
  AdvisoryStudent,
  SemesterSummaryRow,
} from "../../../types/teacherTypes";

/* ==============================
   Helpers
============================== */

function parseJwt(
  token: string
): Record<string, unknown> | null {
  try {
    const base64Url =
      token.split(".")[1];

    if (!base64Url) {
      return null;
    }

    const base64 =
      base64Url
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const jsonPayload =
      decodeURIComponent(
        atob(base64)
          .split("")
          .map(
            (character) =>
              "%" +
              (
                "00" +
                character
                  .charCodeAt(0)
                  .toString(16)
              ).slice(-2)
          )
          .join("")
      );

    return JSON.parse(
      jsonPayload
    );
  } catch {
    return null;
  }
}

function getCurrentTeacherId() {
  const token =
    localStorage.getItem(
      "access"
    );

  if (!token) {
    return 0;
  }

  const payload =
    parseJwt(token);

  const rawId =
    payload?.user_id ??
    payload?.id;

  return Number(
    rawId || 0
  );
}

function gradeLabel(
  gradeLevel:
    string | number
) {
  if (
    typeof gradeLevel ===
      "string" &&
    gradeLevel.startsWith(
      "GRADE_"
    )
  ) {
    return gradeLevel.replace(
      "GRADE_",
      "Grade "
    );
  }

  return `Grade ${gradeLevel}`;
}

function safeAverage(
  values: Array<
    number | null | undefined
  >
) {
  const numbers =
    values.filter(
      (
        value
      ): value is number =>
        typeof value ===
          "number" &&
        Number.isFinite(
          value
        )
    );

  if (
    numbers.length ===
    0
  ) {
    return null;
  }

  return (
    numbers.reduce(
      (
        total,
        value
      ) =>
        total +
        value,
      0
    ) /
    numbers.length
  );
}

/* ==============================
   Main Page
============================== */

export default function AdvisoryClass() {
  const navigate =
    useNavigate();

  const teacherId =
    getCurrentTeacherId();

  const [
    expandedStudent,
    setExpandedStudent,
  ] =
    useState<number | null>(
      null
    );

  const [
    exporting,
    setExporting,
  ] =
    useState(false);

  /* --------------------------
     Teacher
  -------------------------- */

  const {
    data: teacher,
    isLoading:
      teacherLoading,
    isError:
      teacherError,
    error:
      teacherErrorData,
  } =
    useTeacherAdvisoryDetail(
      teacherId
    );

  const sectionId =
    teacher?.advisory?.id ??
    0;

  /* --------------------------
     Advisory Students
  -------------------------- */

  const {
    data: students = [],
    isLoading:
      studentsLoading,
    isError:
      studentsError,
    error:
      studentsErrorData,
  } =
    useAdvisoryStudents(
      sectionId
    );

  const loading =
    teacherLoading ||
    studentsLoading;

  /* --------------------------
     Header
  -------------------------- */

  const header =
    useMemo(() => {
      const section =
        teacher?.advisory;

      if (!section) {
        return {
          title:
            "No Advisory Class Assigned",

          subtitle: `${students.length} Students Enrolled`,
        };
      }

      return {
        title: `${gradeLabel(
          section.grade_level
        )} - ${
          section.section
        }`,

        subtitle: `${students.length} Students Enrolled`,
      };
    }, [
      teacher,
      students.length,
    ]);

  /* --------------------------
     Invalid Teacher
  -------------------------- */

  if (!teacherId) {
    return (
      <AdvisoryError
        message="Unable to determine the current teacher account."
      />
    );
  }

  /* --------------------------
     Loading
  -------------------------- */

  if (loading) {
    return (
      <AdvisoryLoading />
    );
  }

  /* --------------------------
     Error
  -------------------------- */

  if (
    teacherError ||
    studentsError
  ) {
    const message =
      teacherErrorData instanceof
      Error
        ? teacherErrorData.message
        : studentsErrorData instanceof
          Error
        ? studentsErrorData.message
        : "Failed to load advisory class.";

    return (
      <AdvisoryError
        message={
          message
        }
      />
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">

      <section className="p-4 md:p-6">

        <div className="mx-auto max-w-8xl">

          {/* =========================
              Header
          ========================= */}

          <header className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">

            <div>

              <span className="inline-flex px-2 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider rounded">
                Advisory Class
              </span>

              <h1 className="mt-3 text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                {
                  header.title
                }
              </h1>

              <p className="text-slate-500 font-medium mt-1">
                {
                  header.subtitle
                }
              </p>

              {teacher && (

                <p className="text-slate-400 text-sm font-semibold mt-2">
                  Adviser:{" "}
                  {
                    teacher.first_name
                  }{" "}
                  {
                    teacher.last_name
                  }
                </p>

              )}

            </div>

            <button
              type="button"
              disabled={
                exporting
              }
              onClick={async () => {
                try {
                  setExporting(
                    true
                  );

                  await generateBanigPDF();
                } finally {
                  setExporting(
                    false
                  );
                }
              }}
              className="inline-flex items-center gap-2 self-start md:self-auto px-5 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-xl shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <Download
                size={
                  18
                }
              />

              {exporting
                ? "Generating..."
                : "Export Banig"}
            </button>

          </header>

          {/* =========================
              No Advisory
          ========================= */}

          {!teacher?.advisory ? (

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-slate-600">
              This teacher has no
              advisory section
              assigned yet.
            </div>

          ) : (

            /* =========================
               Student Table
            ========================= */

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

              <div className="overflow-x-auto">

                <table className="w-full text-left border-separate border-spacing-0">

                  <thead>

                    <tr className="bg-slate-50/50">

                      <TableHeading
                        className="w-16 text-center"
                      >
                        #
                      </TableHeading>

                      <TableHeading>
                        Student Name
                      </TableHeading>

                      <TableHeading className="text-center">
                        LRN / ID
                      </TableHeading>

                      <TableHeading className="text-right">
                        Actions
                      </TableHeading>

                    </tr>

                  </thead>

                  <tbody>

                    {students.map(
                      (
                        student,
                        index
                      ) => {

                        const isExpanded =
                          expandedStudent ===
                          student.id;

                        return (

                          <React.Fragment
                            key={
                              student.id
                            }
                          >

                            {/* Student Row */}

                            <tr
                              onClick={() =>
                                setExpandedStudent(
                                  (
                                    previous
                                  ) =>
                                    previous ===
                                    student.id
                                      ? null
                                      : student.id
                                )
                              }
                              className={`group cursor-pointer transition ${
                                isExpanded
                                  ? "bg-indigo-50/40"
                                  : "hover:bg-slate-50"
                              }`}
                            >

                              <td className="p-5 text-center text-slate-400 font-mono text-xs border-b border-slate-100">
                                {
                                  index +
                                  1
                                }
                              </td>

                              <td className="p-5 border-b border-slate-100">

                                <StudentIdentity
                                  student={
                                    student
                                  }
                                />

                              </td>

                              <td className="p-5 text-center border-b border-slate-100">

                                <span className="font-mono text-sm text-slate-400">
                                  {
                                    student.school_id
                                  }
                                </span>

                              </td>

                              <td className="p-5 border-b border-slate-100">

                                <div className="flex justify-end items-center gap-2">

                                  <button
                                    type="button"
                                    onClick={(
                                      event
                                    ) => {
                                      event.stopPropagation();

                                      navigate(
                                        `/teacher/advisory-class/report-card/${student.id}`,
                                        {
                                          state: {
                                            student: {
                                              name:
                                                `${student.first_name} ${student.last_name}`,

                                              lrn:
                                                student.school_id,

                                              section:
                                                teacher?.advisory
                                                  ? `${gradeLabel(
                                                      teacher.advisory.grade_level
                                                    )} - ${
                                                      teacher.advisory.section
                                                    }`
                                                  : String(
                                                      student.section || ""
                                                    ),

                                              Section:
                                                teacher?.advisory
                                                  ? `${gradeLabel(
                                                      teacher.advisory.grade_level
                                                    )} - ${
                                                      teacher.advisory.section
                                                    }`
                                                  : String(
                                                      student.section || ""
                                                    ),

                                              grade:
                                                student.grade_level,
                                            },
                                          },
                                        }
                                      );
                                    }}
                                    className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm"
                                  >
                                    Generate SF9
                                  </button>

                                  <span className="p-2 text-slate-400">

                                    {isExpanded ? (
                                      <ChevronUp
                                        size={
                                          18
                                        }
                                      />
                                    ) : (
                                      <ChevronDown
                                        size={
                                          18
                                        }
                                      />
                                    )}

                                  </span>

                                </div>

                              </td>

                            </tr>

                            {/* Expanded Semester Grades */}

                            {isExpanded && (

                              <tr>

                                <td
                                  colSpan={
                                    4
                                  }
                                  className="p-0 bg-slate-50/30"
                                >

                                  <StudentSemesterDetails
                                    student={
                                      student
                                    }
                                  />

                                </td>

                              </tr>

                            )}

                          </React.Fragment>

                        );
                      }
                    )}

                    {/* Empty students */}

                    {students.length ===
                    0 && (

                      <tr>

                        <td
                          colSpan={
                            4
                          }
                          className="p-8 text-center text-slate-600"
                        >
                          No students
                          found in this
                          advisory
                          section.
                        </td>

                      </tr>

                    )}

                  </tbody>

                </table>

              </div>

            </div>

          )}

        </div>

      </section>

    </main>
  );
}

/* ==============================
   Expanded Student Semester Data
============================== */

function StudentSemesterDetails({
  student,
}: {
  student:
    AdvisoryStudent;
}) {
  const {
    data: grades = [],
    isLoading,
    isError,
    error,
    refetch,
  } =
    useStudentSemesterSummary(
      student.id,
      true
    );

  /*
   * Overall final average
   * across subject offerings.
   */
  const overallAverage =
    useMemo(() => {
      return safeAverage(
        grades.map(
          (
            grade
          ) =>
            grade.final
        )
      );
    }, [
      grades,
    ]);

  if (isLoading) {
    return (
      <div className="p-8 text-sm font-semibold text-slate-500">
        Loading semester
        grades...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">

        <div className="flex items-center gap-2 text-sm font-bold text-rose-600">

          <AlertCircle
            size={
              16
            }
          />

          <span>
            {error instanceof
            Error
              ? error.message
              : "Failed to load semester grades."}
          </span>

        </div>

        <button
          type="button"
          onClick={() =>
            refetch()
          }
          className="mt-3 text-xs font-black text-indigo-600 hover:underline"
        >
          Retry
        </button>

      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* =========================
            Performance Details
        ========================= */}

        <div className="space-y-4">

          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Performance Details
          </h4>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">

            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
              Overall Average
            </p>

            <p className="text-xl font-black text-slate-800">
              {overallAverage !=
              null
                ? `${overallAverage.toFixed(
                    1
                  )}%`
                : "—"}
            </p>

          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">

            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
              Grade Basis
            </p>

            <p className="text-sm font-black text-slate-800">
              Semester Grades
            </p>

          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">

            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
              Subjects
            </p>

            <p className="text-xl font-black text-slate-800">
              {
                grades.length
              }
            </p>

          </div>

        </div>

        {/* =========================
            Semester Table
        ========================= */}

        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">

          <div className="overflow-x-auto">

            <table className="w-full text-sm">

              <thead className="bg-slate-50 text-slate-500">

                <tr>

                  <th className="p-4 pl-6 font-black text-[10px] uppercase tracking-wider text-left">
                    Subject Offering
                  </th>

                  <th className="p-4 font-black text-[10px] uppercase tracking-wider text-center">
                    Semester 1
                  </th>

                  <th className="p-4 font-black text-[10px] uppercase tracking-wider text-center">
                    Semester 2
                  </th>

                  <th className="p-4 font-black text-[10px] uppercase tracking-wider text-center">
                    Semester 3
                  </th>

                  <th className="p-4 pr-6 font-black text-[10px] uppercase tracking-wider text-right">
                    Final
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-100">

                {grades.length ===
                0 ? (

                  <tr>

                    <td
                      colSpan={
                        5
                      }
                      className="p-6 text-slate-600 font-semibold"
                    >
                      No semester
                      grades
                      available yet.
                    </td>

                  </tr>

                ) : (

                  grades.map(
                    (
                      grade
                    ) => (

                    <SemesterGradeRow
                      key={
                        grade.subject_offering_id
                      }
                      grade={
                        grade
                      }
                    />

                    )
                  )

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

function SemesterGradeRow({
  grade,
}: {
  grade:
    SemesterSummaryRow;
}) {
  const semesterScores = [
    grade.semester_1 ?? grade.sem1 ?? null,
    grade.semester_2 ?? grade.sem2 ?? null,
    grade.semester_3 ?? grade.sem3 ?? null,
  ];

  return (
    <tr className="hover:bg-slate-50 transition-colors">

      <td className="p-4 pl-6 font-bold text-slate-700">
        {
          grade.subject
        }
      </td>

      {semesterScores.map(
        (
          score,
          index
        ) => (

        <td
          key={
            index
          }
          className={`p-4 text-center font-medium ${
            typeof score ===
              "number" &&
            score < 75
              ? "text-rose-500"
              : "text-slate-600"
          }`}
        >
          {typeof score ===
          "number"
            ? score.toFixed(
                1
              )
            : "—"}
        </td>

        )
      )}

      <td className="p-4 pr-6 text-right">

        <span
          className={`font-black ${
            typeof grade.final ===
              "number" &&
            grade.final < 75
              ? "text-rose-600"
              : "text-indigo-600"
          }`}
        >
          {typeof grade.final ===
          "number"
            ? grade.final.toFixed(
                1
              )
            : "—"}
        </span>

      </td>

    </tr>
  );
}

/* ==============================
   Student Identity
============================== */

function StudentIdentity({
  student,
}: {
  student:
    AdvisoryStudent;
}) {
  const fullName =
    `${student.first_name} ${student.last_name}`.trim();

  return (
    <div className="flex items-center gap-4">

      <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 group-hover:bg-white group-hover:text-indigo-600 transition-colors border border-transparent group-hover:border-indigo-100">
        {(fullName[0] ||
          "?").toUpperCase()}
      </div>

      <div className="flex flex-col">

        <span className="font-bold text-slate-800 text-base">
          {
            fullName
          }
        </span>

        <span className="text-[11px] font-semibold text-slate-400">
          {
            student.email
          }
        </span>

      </div>

    </div>
  );
}

/* ==============================
   Table Heading
============================== */

function TableHeading({
  children,
  className = "",
}: {
  children:
    React.ReactNode;

  className?:
    string;
}) {
  return (
    <th
      className={`p-5 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 ${className}`}
    >
      {
        children
      }
    </th>
  );
}

/* ==============================
   Loading
============================== */

function AdvisoryLoading() {
  return (
    <main className="min-h-screen bg-slate-50 p-6">

      <div className="mx-auto max-w-7xl space-y-4">

        <div className="h-28 rounded-3xl border border-slate-200 bg-white animate-pulse" />

        <div className="h-96 rounded-3xl border border-slate-200 bg-white animate-pulse" />

      </div>

    </main>
  );
}

/* ==============================
   Error
============================== */

function AdvisoryError({
  message,
}: {
  message:
    string;
}) {
  return (
    <main className="min-h-screen bg-slate-50 p-6">

      <div className="mx-auto max-w-xl rounded-3xl border border-rose-200 bg-white p-8 text-center">

        <AlertCircle
          className="mx-auto text-rose-500"
          size={
            28
          }
        />

        <div className="mt-3 font-black text-slate-900">
          {
            message
          }
        </div>

      </div>

    </main>
  );
}