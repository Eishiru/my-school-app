import { ArrowRight, Plus, Users, X, Trash2, BookOpen, MoreVertical } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  useAdminSubjects,
  useCreateAdminSubject,
  useDeleteAdminSubject,
  AdminSubject,
} from "../../../hooks/useAdminData";

export const FacultyPage = () => {
  const { data: subjects = [], isLoading } = useAdminSubjects();
  const createMutation = useCreateAdminSubject();
  const deleteMutation = useDeleteAdminSubject();

  const [issubjectModalOpen, setIssubjectModalOpen] = useState(false);
  const [newsubjectName, setNewsubjectName] = useState("");
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // Close menu on outside click or Escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-dept-menu]")) {
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

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createMutation.mutateAsync(newsubjectName);
      setIssubjectModalOpen(false);
      setNewsubjectName("");
    } catch {
      alert("Failed to create subject");
    }
  };

  const handleDeleteSubject = async (subjectId: number, subjectName: string) => {
    const ok = window.confirm(`Delete "${subjectName}"? This cannot be undone.`);
    if (!ok) return;

    try {
      await deleteMutation.mutateAsync(subjectId);
    } catch {
      alert("Failed to delete subject");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Faculty & Departments
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse curriculum departments and manage instructor assignments
          </p>
        </div>

        <button
          onClick={() => setIssubjectModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Add Subject Department</span>
        </button>
      </div>

      {/* Create Subject Modal */}
      {issubjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIssubjectModalOpen(false)}
          />

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Create New Subject Department</h3>
              </div>
              <button
                onClick={() => setIssubjectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddDepartment} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Department / Subject Name
                </label>
                <input
                  autoFocus
                  required
                  type="text"
                  value={newsubjectName}
                  onChange={(e) => setNewsubjectName(e.target.value)}
                  placeholder="e.g. Mathematics, Science, English"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIssubjectModalOpen(false)}
                  className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm transition-colors"
                >
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grid Section */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((subject) => (
          <div
            key={subject.id}
            className="group rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {subject.name}
                    </h2>
                    <p className="text-xs text-slate-400">Department</p>
                  </div>
                </div>

                <div className="relative inline-block text-left" data-dept-menu>
                  <button
                    onClick={() => setOpenMenuId(openMenuId === subject.id ? null : subject.id)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      openMenuId === subject.id
                        ? "border-slate-300 bg-slate-100 text-slate-800 shadow-inner"
                        : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    }`}
                    aria-label="Open actions"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {openMenuId === subject.id && (
                    <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100">
                      <Link
                        to={`/admin/faculty/${subject.id}`}
                        onClick={() => setOpenMenuId(null)}
                        className="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium transition-colors"
                      >
                        <Users size={14} className="text-indigo-600 shrink-0" />
                        <span>View Faculty Members</span>
                      </Link>

                      <div className="my-1 border-t border-slate-100" />

                      <button
                        onClick={() => {
                          setOpenMenuId(null);
                          handleDeleteSubject(subject.id, subject.name);
                        }}
                        className="w-full text-left px-3.5 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 font-medium transition-colors"
                      >
                        <Trash2 size={14} className="text-rose-600 shrink-0" />
                        <span>Delete Department</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
                <Users size={15} className="text-slate-400" />
                <span className="font-medium">{subject.faculty_count} Assigned Faculty</span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <Link
                to={`/admin/faculty/${subject.id}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors group/link"
              >
                <span>View Faculty Members</span>
                <ArrowRight size={14} className="group-hover/link:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
