import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, MoreVertical, UserPlus, Trash2, ExternalLink } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AddTeacherModal from "./AddTeacherModal";
import {
  useAdminSubjectDetail,
  useAdminSubjectTeachers,
  useAdminTeachers,
  useAssignTeacherToSubject,
  useRemoveTeacherFromSubject,
  AdminSubject,
  AdminTeacher,
} from "../../../hooks/useAdminData";

export const FacultyList = () => {
  const navigate = useNavigate();
  const { department } = useParams();
  const subjectId = Number(department);

  const { data: subject = null } = useAdminSubjectDetail(subjectId);
  const { data: teachers = [] } = useAdminSubjectTeachers(subjectId);
  const { data: availableTeachers = [] } = useAdminTeachers();

  const assignMutation = useAssignTeacherToSubject();
  const removeMutation = useRemoveTeacherFromSubject();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // Close menu on outside click or Escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-faculty-menu]")) {
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

  /* ---------------- FILTER AVAILABLE TEACHERS ---------------- */
  const filteredAvailableTeachers = useMemo(() => {
    const assignedIds = new Set(teachers.map((t) => t.id));

    return availableTeachers
      .filter((t) => !assignedIds.has(t.id))
      .filter((t) => {
        if (!subject) return true;
        const subs = Array.isArray(t.subjects) ? t.subjects : [];
        return !subs.some((s) => s.id === subject.id);
      });
  }, [availableTeachers, teachers, subject]);

  /* ---------------- ASSIGN TEACHER ---------------- */
  const handleAssignTeacher = async (teacherId: number) => {
    try {
      await assignMutation.mutateAsync({ subjectId, teacherId });
      setIsModalOpen(false);
    } catch {
      alert("Failed to assign teacher");
    }
  };

  /* ---------------- REMOVE TEACHER FROM SUBJECT ---------------- */
  const handleRemove = async (faculty: AdminTeacher) => {
    const deptName = subject?.name ?? "this";
    const ok = window.confirm(
      `Remove ${faculty.first_name} ${faculty.last_name} from the ${deptName} department?`
    );
    if (!ok) return;

    try {
      await removeMutation.mutateAsync({ subjectId, teacherId: faculty.id });
      setOpenMenuId(null);
    } catch {
      alert("Failed to remove teacher from department");
    }
  };

  if (!subject) {
    return <div className="p-8 text-center text-xs text-slate-400">Subject department not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Navigation & Header */}
      <div>
        <Link
          to="/admin/faculty"
          className="inline-flex items-center text-slate-500 hover:text-indigo-600 transition-colors text-xs font-medium group mb-3"
        >
          <ArrowLeft
            size={14}
            className="mr-1.5 group-hover:-translate-x-1 transition-transform"
          />
          Back to All Departments
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {subject.name} Department Faculty
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage instructors assigned to teach this curriculum subject
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors self-start sm:self-auto"
          >
            <UserPlus size={16} />
            <span>Add Faculty Member</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden min-h-[320px]">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/80 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Instructor Name
              </th>
              <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Email Address
              </th>
              <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Advisory Class
              </th>
              <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {teachers.map((faculty, index) => {
              const advisoryLabel = faculty.advisory?.section ?? "None";
              const initials =
                (faculty.first_name?.charAt(0) || "") + (faculty.last_name?.charAt(0) || "");

              return (
                <tr
                  key={faculty.id}
                  className="hover:bg-slate-50/60 transition-colors group"
                >
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-700 border border-emerald-100">
                        {initials || "T"}
                      </div>
                      <span className="font-semibold text-sm text-slate-900">
                        {faculty.last_name}, {faculty.first_name}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-3.5 text-xs text-slate-600">
                    {faculty.email}
                  </td>

                  <td className="px-6 py-3.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                        advisoryLabel === "None"
                          ? "bg-slate-50 text-slate-400 border-slate-200"
                          : "bg-indigo-50 text-indigo-700 border-indigo-100"
                      }`}
                    >
                      {advisoryLabel === "None" ? "No Advisory" : `Section ${advisoryLabel}`}
                    </span>
                  </td>

                  <td className="px-6 py-3.5 text-right">
                    <div className="relative inline-block text-left" data-faculty-menu>
                      <button
                        onClick={() =>
                          setOpenMenuId(openMenuId === faculty.id ? null : faculty.id)
                        }
                        className={`p-1.5 rounded-lg border transition-colors ${
                          openMenuId === faculty.id
                            ? "border-slate-300 bg-slate-100 text-slate-800 shadow-inner"
                            : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        }`}
                        aria-label="Open actions"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {openMenuId === faculty.id && (
                        <div
                          className={`absolute right-0 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100 ${
                            index >= teachers.length - 2 && teachers.length > 2
                              ? "bottom-full mb-1.5 origin-bottom-right"
                              : "top-full mt-1.5 origin-top-right"
                          }`}
                        >
                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              navigate("/admin/accounts", { state: { activeTab: "teacher" } });
                            }}
                            className="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium transition-colors"
                          >
                            <ExternalLink size={14} className="text-indigo-600 shrink-0" />
                            <span>View in Accounts</span>
                          </button>

                          <div className="my-1 border-t border-slate-100" />

                          <button
                            onClick={() => handleRemove(faculty)}
                            className="w-full text-left px-3.5 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 font-medium transition-colors"
                          >
                            <Trash2 size={14} className="text-rose-600 shrink-0" />
                            <span>Remove from Department</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {teachers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-xs text-slate-400">
                  No faculty assigned to this subject department yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- ADD TEACHER MODAL --- */}
      <AddTeacherModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        teachers={filteredAvailableTeachers}
        onSelect={handleAssignTeacher}
      />
    </div>
  );
};
