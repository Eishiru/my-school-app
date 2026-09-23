import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Users,
  BarChart,
  Plus,
  AlertCircle,
  Trash2,
  Search,
  MoreVertical,
  FileCheck2,
  ArrowRight,
} from "lucide-react";

import {
  useTeacherSubjects,
  useDeleteTeacherSubject,
} from "../../../hooks/useTeacherSubjects";

export default function SubjectListPage() {
  // UI state only
  const [q, setQ] = useState("");
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const [sort, setSort] =
    useState<"name" | "students" | "average">("name");

  // React Query
  const {
    data: offerings = [],
    isLoading,
    isError,
    error,
  } = useTeacherSubjects();

  const deleteSubject = useDeleteTeacherSubject();

  // Close menu on outside click or Escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-offering-menu]")) {
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

  const handleDelete = (id: number) => {
    const ok = window.confirm(
      "Delete this subject offering? This cannot be undone."
    );

    if (!ok) return;

    deleteSubject.mutate(id, {
      onError: (error) => {
        console.error("Delete failed:", error);
        alert("Failed to delete offering.");
      },
    });
  };

  const totalClasses = offerings.length;

  const totalStudents = offerings.reduce(
    (sum, offering) =>
      sum + (offering.students ?? 0),
    0
  );

  const filteredAndSorted = useMemo(() => {
    const needle = q.trim().toLowerCase();

    const filtered = !needle
      ? offerings
      : offerings.filter((o) => {
          const hay = `
            ${o.name ?? ""}
            ${o.grade ?? ""}
            ${o.section ?? ""}
            ${o.room_number ?? ""}
            ${o.nextClass ?? ""}
          `.toLowerCase();

          return hay.includes(needle);
        });

    return [...filtered].sort((a, b) => {
      if (sort === "students") {
        return (b.students ?? 0) - (a.students ?? 0);
      }

      if (sort === "average") {
        return (
          (Number(b.average ?? -1) || -1) -
          (Number(a.average ?? -1) || -1)
        );
      }

      return String(a.name ?? "").localeCompare(
        String(b.name ?? "")
      );
    });
  }, [offerings, q, sort]);

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        Loading subject offerings…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-6 text-rose-700">
        <div className="flex items-center gap-2">
          <AlertCircle size={18} className="text-rose-500" />
          <h2 className="text-base font-bold">Unable to load subject offerings</h2>
        </div>
        <p className="mt-1 text-sm text-rose-600">
          {error instanceof Error ? error.message : "Something went wrong while loading the subjects."}
        </p>
      </div>
    );
  }

  if (offerings.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-12 text-center shadow-sm max-w-md mx-auto">
        <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
          <BookOpen size={22} />
        </div>
        <h2 className="mt-4 text-base font-bold text-slate-900">
          No subject offerings yet
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Create an offering to start configuring your classes and grading criteria.
        </p>
        <Link
          to="/teacher/subject/create-subject"
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus size={15} />
          <span>Create Subject Offering</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Subject Offerings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {totalClasses} teaching {totalClasses === 1 ? 'offering' : 'offerings'} • {totalStudents} enrolled students
          </p>
        </div>

        <Link
          to="/teacher/subject/create-subject"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>New Subject Offering</span>
        </Link>
      </div>

      {/* Filter / Search Bar */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search offerings by name, grade, section, or room..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>

        <select
          value={sort}
          onChange={(e) =>
            setSort(e.target.value as "name" | "students" | "average")
          }
          className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-colors"
        >
          <option value="name">Sort by Subject Name</option>
          <option value="students">Sort by Enrolled Students</option>
          <option value="average">Sort by Class Average</option>
        </select>
      </div>

      {/* Offerings Grid */}
      {filteredAndSorted.length === 0 ? (
        <div className="rounded-xl border border-slate-200/80 bg-white p-10 text-center text-xs text-slate-400">
          No subject offerings match <span className="font-semibold text-slate-700">“{q.trim()}”</span>.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAndSorted.map((o) => {
            const avg = typeof o.average === "number" ? o.average : null;
            const isDeleting = deleteSubject.isPending && deleteSubject.variables === o.id;

            return (
              <div
                key={o.id}
                className="group rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                        <BookOpen size={17} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                          {o.name ?? "Untitled"}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {o.grade ?? "—"} • Section {o.section ?? "—"}
                        </p>
                      </div>
                    </div>

                    <div className="relative inline-block text-left" data-offering-menu>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === o.id ? null : o.id);
                        }}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          openMenuId === o.id
                            ? "border-slate-300 bg-slate-100 text-slate-800 shadow-inner"
                            : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        }`}
                        aria-label="Open actions"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {openMenuId === o.id && (
                        <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100">
                          <Link
                            to={`/teacher/subject/${o.id}`}
                            onClick={() => setOpenMenuId(null)}
                            className="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium transition-colors"
                          >
                            <BookOpen size={14} className="text-indigo-600 shrink-0" />
                            <span>Open Workspace</span>
                          </Link>

                          <Link
                            to={`/teacher/subject/${o.id}/classlist`}
                            onClick={() => setOpenMenuId(null)}
                            className="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium transition-colors"
                          >
                            <Users size={14} className="text-blue-600 shrink-0" />
                            <span>View Class List</span>
                          </Link>

                          <Link
                            to={`/teacher/subject/${o.id}/grades`}
                            onClick={() => setOpenMenuId(null)}
                            className="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium transition-colors"
                          >
                            <FileCheck2 size={14} className="text-emerald-600 shrink-0" />
                            <span>Subject Gradebook</span>
                          </Link>

                          <div className="my-1 border-t border-slate-100" />

                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setOpenMenuId(null);
                              handleDelete(o.id);
                            }}
                            disabled={isDeleting}
                            className="w-full text-left px-3.5 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 font-medium transition-colors disabled:opacity-50"
                          >
                            <Trash2 size={14} className="text-rose-600 shrink-0" />
                            <span>Delete Offering</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Room & Schedule */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-50/70 border border-slate-200/60 p-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Room
                      </span>
                      <span className="font-semibold text-slate-800 truncate block mt-0.5">
                        {o.room_number ?? "TBA"}
                      </span>
                    </div>

                    <div className="rounded-lg bg-slate-50/70 border border-slate-200/60 p-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Schedule
                      </span>
                      <span className="font-semibold text-slate-800 truncate block mt-0.5">
                        {o.nextClass ?? "TBA"}
                      </span>
                    </div>
                  </div>

                  {/* Metrics bar */}
                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-slate-500 font-medium">
                        <Users size={14} className="text-slate-400" />
                        Students
                      </span>
                      <span className="font-semibold text-slate-900">{o.students ?? 0}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-slate-500 font-medium">
                        <BarChart size={14} className="text-slate-400" />
                        Average
                      </span>
                      <span
                        className={`font-semibold ${
                          avg !== null && avg >= 85 ? "text-emerald-700" : "text-slate-700"
                        }`}
                      >
                        {avg !== null ? `${avg}%` : "—"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-slate-500 font-medium">
                        <AlertCircle size={14} className="text-amber-500" />
                        Pending Grading
                      </span>
                      <span className="font-semibold text-amber-700">{o.pendingTasks ?? 0}</span>
                    </div>

                    {isDeleting && (
                      <div className="pt-1 text-[11px] text-rose-500 font-medium">
                        Deleting offering...
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
                  <Link
                    to={`/teacher/subject/${o.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors group/link"
                  >
                    <span>Manage Offering</span>
                    <ArrowRight size={14} className="group-hover/link:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}