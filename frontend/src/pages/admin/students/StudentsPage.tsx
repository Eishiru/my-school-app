import { useEffect, useState } from "react";
import { 
  ArrowRight, 
  Users,  
  Plus,
  GraduationCap,
  Trash2,
  MoreVertical
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  useAdminSections,
  useDeleteAdminSection,
  AdminSection,
} from "../../../hooks/useAdminData";

export const StudentAccountsPage = () => {
  const navigate = useNavigate();
  const { data: sections = [], isLoading: loading } = useAdminSections();
  const deleteMutation = useDeleteAdminSection();
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // Close menu on outside click or Escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-section-menu]")) {
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

  /* =========================
     HELPERS
  ========================= */
  const formatGrade = (grade: string) =>
    grade.replace("_", " ").replace("GRADE", "Grade");

  /* =========================
     GROUP BY GRADE LEVEL
  ========================= */
  const sectionsByGrade = sections.reduce((acc, section) => {
    const gradeLabel = formatGrade(section.grade_level);
    if (!acc[gradeLabel]) acc[gradeLabel] = [];
    acc[gradeLabel].push(section);
    return acc;
  }, {} as Record<string, AdminSection[]>);

  if (loading && sections.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        Loading sections...
      </div>
    );
  }

  const handleDeleteSection = async (section: AdminSection) => {
    if (!window.confirm(`Are you sure you want to delete section "${section.name}"? This cannot be undone.`)) return;

    try {
      await deleteMutation.mutateAsync(section.id);
    } catch {
      alert("Failed to delete section");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Student Sections
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse grade level cohorts and manage classroom section rosters
          </p>
        </div>
        
        <button
          onClick={() => navigate('/admin/students/add-section')}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Create New Section</span>
        </button>
      </div>

      {/* Render Groups (Grade 7, Grade 8, etc.) */}
      {Object.entries(sectionsByGrade).map(([gradeLabel, gradeSections]) => (
        <div key={gradeLabel} className="space-y-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              {gradeLabel}
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              ({gradeSections.length} {gradeSections.length === 1 ? "Section" : "Sections"})
            </span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {gradeSections.map((section) => (
              <div
                key={section.id}
                className="group rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        Section {section.name.toUpperCase()}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Adviser: <span className="font-medium text-slate-700">{section.adviser_name ? section.adviser_name.toUpperCase() : "UNASSIGNED"}</span>
                      </p>
                    </div>

                    <div className="relative inline-block text-left" data-section-menu>
                      <button
                        onClick={() => setOpenMenuId(openMenuId === section.id ? null : section.id)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          openMenuId === section.id
                            ? "border-slate-300 bg-slate-100 text-slate-800 shadow-inner"
                            : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        }`}
                        aria-label="Open actions"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {openMenuId === section.id && (
                        <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100">
                          <Link
                            to={`/admin/students/${section.id}`}
                            onClick={() => setOpenMenuId(null)}
                            className="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium transition-colors"
                          >
                            <Users size={14} className="text-indigo-600 shrink-0" />
                            <span>Manage Section Roster</span>
                          </Link>

                          <div className="my-1 border-t border-slate-100" />

                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              handleDeleteSection(section);
                            }}
                            className="w-full text-left px-3.5 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 font-medium transition-colors"
                          >
                            <Trash2 size={14} className="text-rose-600 shrink-0" />
                            <span>Delete Section</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
                    <Users size={15} className="text-slate-400" />
                    <span className="font-medium">{section.student_count} Enrolled Students</span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
                  <Link
                    to={`/admin/students/${section.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors group/link"
                  >
                    <span>Manage Section Roster</span>
                    <ArrowRight size={14} className="group-hover/link:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};