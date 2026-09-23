import React, { useState, useEffect, useMemo } from "react";
import { ArrowLeft, MoreVertical, Plus, Mail, Users, Trash2, ExternalLink } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AddStudentModal from "./AddStudentModal";
import AddAdviserModal from "./AddAdviserModal";
import { authFetch } from "../../../api/apiClient";
import {
  useAdminSectionDetail,
  useAdminSectionStudents,
  useAdminTeachers,
  useAssignStudentToSection,
  useRemoveStudentFromSection,
  useAssignAdviserToSection,
  useRemoveAdviserFromSection,
} from "../../../hooks/useAdminData";

interface Student {
  id: number;
  school_id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
}

interface Section {
  id: number;
  name: string;
  grade_level: string;
  adviser_name: string; // "First Last" or "N/A"
}

interface Teacher {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export const StudentClassList = () => {
  const navigate = useNavigate();
  const { sectionId } = useParams<{ sectionId: string }>();

  const { data: section = null } = useAdminSectionDetail(sectionId!);
  const { data: students = [], isLoading: loading } = useAdminSectionStudents(sectionId!);
  const { data: availableTeachers = [] } = useAdminTeachers();

  const assignStudentMutation = useAssignStudentToSection();
  const removeStudentMutation = useRemoveStudentFromSection();
  const assignAdviserMutation = useAssignAdviserToSection();
  const removeAdviserMutation = useRemoveAdviserFromSection();

  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isAdviserModalOpen, setIsAdviserModalOpen] = useState(false);

  // Close menu on outside click or Escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-student-menu]")) {
        setOpenMenuId(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenuId(null);
      }
    };

    if (openMenuId !== null) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuId]);

  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | "">("");

  const [searchQuery, setSearchQuery] = useState("");

  // -------------------
  // Adviser state
  // -------------------
  const adviserLabel = useMemo(() => {
    if (!section?.adviser_name) return "N/A";
    if (section.adviser_name === "N/A") return "N/A";
    if (section.adviser_name.trim() === "") return "N/A";
    return section.adviser_name;
  }, [section]);

  const hasAdviser = adviserLabel !== "N/A";

  // Auto-close adviser modal if adviser exists
  useEffect(() => {
    if (isAdviserModalOpen && hasAdviser) setIsAdviserModalOpen(false);
  }, [hasAdviser, isAdviserModalOpen]);

  // -------------------
  // Fetch Available Students (grade_level match, section=null)
  // -------------------
  useEffect(() => {
    if (!section) return;

    authFetch(`/students/?section=null&grade_level=${section.grade_level}`)
      .then((res) => res.json())
      .then((data) => setAvailableStudents(Array.isArray(data) ? data : []))
      .catch((e) => {
        console.error(e);
        setAvailableStudents([]);
      });
  }, [section]);



  // -------------------
  // -------------------
  // Add MANY students to section
  // -------------------
  const handleAddStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!section || selectedStudentIds.length === 0) return;

    try {
      await Promise.all(
        selectedStudentIds.map((id) =>
          assignStudentMutation.mutateAsync({ studentId: id, sectionId: section.id })
        )
      );

      setAvailableStudents((prev) => prev.filter((s) => !selectedStudentIds.includes(s.id)));
      setSelectedStudentIds([]);
      setIsStudentModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to assign one or more students.");
    }
  };

  // -------------------
  // Remove student from section
  // -------------------
  const handleRemoveFromSection = async (student: Student) => {
    const secName = section?.name ?? "this";
    const ok = window.confirm(
      `Remove student "${student.first_name} ${student.last_name}" (${student.school_id}) from section ${secName}?`
    );
    if (!ok) return;

    try {
      await removeStudentMutation.mutateAsync({ studentId: student.id, sectionId: section?.id || "" });
      const removed = students.find((s) => s.id === student.id);
      if (removed) setAvailableStudents((prev) => [removed, ...prev]);
    } catch (err) {
      console.error(err);
      alert("Failed to remove student from section");
    } finally {
      setOpenMenuId(null);
    }
  };

  // -------------------
  // Assign adviser
  // -------------------
  const handleAssignAdviser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!section || !selectedTeacherId) return;

    try {
      await assignAdviserMutation.mutateAsync({
        sectionId: section.id,
        teacherId: selectedTeacherId,
      });
      setIsAdviserModalOpen(false);
      setSelectedTeacherId("");
    } catch (err) {
      alert("Failed to assign adviser");
    }
  };

  // -------------------
  // Remove adviser
  // -------------------
  const handleRemoveAdviser = async () => {
    if (!section) return;

    const ok = window.confirm("Remove adviser from this section?");
    if (!ok) return;

    try {
      await removeAdviserMutation.mutateAsync(section.id);
      setSelectedTeacherId("");
    } catch (err) {
      console.error(err);
      alert("Failed to remove adviser");
    }
  };

  // -------------------
  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const hay = `${s.first_name} ${s.last_name} ${s.email} ${s.school_id}`.toLowerCase();
      return hay.includes(q);
    });
  }, [students, searchQuery]);

  // -------------------
  // UI states
  // -------------------
  if (loading) return <div className="p-8 text-center text-xs text-slate-400">Loading section roster...</div>;
  if (!section) return <div className="p-8 text-center text-xs text-slate-400">Section not found</div>;

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div>
        <Link
          to="/admin/students"
          className="inline-flex items-center text-slate-500 hover:text-indigo-600 transition-colors text-xs font-medium group mb-3"
        >
          <ArrowLeft size={14} className="mr-1.5 group-hover:-translate-x-1 transition-transform" />
          Back to All Sections
        </Link>

        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {section.grade_level.replace("GRADE_", "Grade ")} — Section {section.name}
            </h1>

            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
              <Users size={14} className="text-slate-400" />
              <span>
                Class Adviser:{" "}
                <span className="font-semibold text-slate-800">
                  {adviserLabel}
                </span>
              </span>

              {hasAdviser && (
                <button
                  type="button"
                  onClick={handleRemoveAdviser}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-md transition-colors"
                >
                  <Trash2 size={12} />
                  Remove Adviser
                </button>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {!hasAdviser ? (
              <button
                onClick={() => setIsAdviserModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
              >
                <Plus size={15} className="text-indigo-600" />
                Assign Adviser
              </button>
            ) : null}

            <button
              onClick={() => setIsStudentModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
            >
              <Plus size={15} />
              Add Students to Section
            </button>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 sm:max-w-md">
          <input
            type="text"
            placeholder="Search by student name, email, or school ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-3 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing {filteredStudents.length} of {students.length} students
        </div>
      </div>

      {/* Table Card */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden min-h-[320px]">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/80 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                School ID
              </th>
              <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Full Name
              </th>
              <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Email Address
              </th>
              <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredStudents.map((student, index) => {
              const initials =
                (student.first_name?.charAt(0) || "") + (student.last_name?.charAt(0) || "");

              return (
                <tr key={student.school_id} className="hover:bg-slate-50/60 transition-colors group">
                  <td className="px-6 py-3.5">
                    <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {student.school_id}
                    </span>
                  </td>

                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700 border border-blue-100">
                        {initials || "S"}
                      </div>
                      <span className="font-semibold text-sm text-slate-900">
                        {student.last_name}, {student.first_name}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-3.5 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Mail size={13} className="text-slate-400" />
                      <span>{student.email}</span>
                    </div>
                  </td>

                  <td className="px-6 py-3.5 text-right">
                    <div className="relative inline-block text-left" data-student-menu>
                      <button
                        onClick={() => setOpenMenuId(openMenuId === student.id ? null : student.id)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          openMenuId === student.id
                            ? "border-slate-300 bg-slate-100 text-slate-800 shadow-inner"
                            : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        }`}
                        aria-label="Open actions"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {openMenuId === student.id && (
                        <div
                          className={`absolute right-0 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100 ${
                            index >= filteredStudents.length - 2 && filteredStudents.length > 2
                              ? "bottom-full mb-1.5 origin-bottom-right"
                              : "top-full mt-1.5 origin-top-right"
                          }`}
                        >
                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              navigate("/admin/accounts", { state: { activeTab: "student" } });
                            }}
                            className="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium transition-colors"
                          >
                            <ExternalLink size={14} className="text-indigo-600 shrink-0" />
                            <span>View in Accounts</span>
                          </button>

                          <div className="my-1 border-t border-slate-100" />

                          <button
                            onClick={() => handleRemoveFromSection(student)}
                            className="w-full text-left px-3.5 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 font-medium transition-colors"
                          >
                            <Trash2 size={14} className="text-rose-600 shrink-0" />
                            <span>Remove from Section</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-xs text-slate-400">
                  {students.length === 0
                    ? "No students currently enrolled in this section."
                    : "No students matching your search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Students Modal */}
      <AddStudentModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        selectedStudentIds={selectedStudentIds}
        setSelectedStudentIds={setSelectedStudentIds}
        onSubmit={handleAddStudents}
        availableStudents={availableStudents}
      />

      {/* Add Adviser Modal (only openable if !hasAdviser) */}
      <AddAdviserModal
        isOpen={isAdviserModalOpen}
        onClose={() => setIsAdviserModalOpen(false)}
        selectedTeacherId={selectedTeacherId}
        setSelectedTeacherId={setSelectedTeacherId}
        availableTeachers={availableTeachers}
        onSubmit={handleAssignAdviser}
        currentAdviserName={section?.adviser_name ?? null}
      />
    </div>
  );
};
