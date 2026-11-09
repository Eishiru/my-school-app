import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useParams,
} from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Menu,
  X,
} from "lucide-react";

import { useTeacherSubject } from "../../../hooks/useTeacherSubjects";

export default function SubjectLayout() {
  const { id } = useParams<{ id: string }>();
  const subjectId = Number(id || 0);

  const [tabsOpen, setTabsOpen] = useState(false);

  const {
    data: offering,
    isLoading,
    isError,
    error,
  } = useTeacherSubject(subjectId);

  useEffect(() => {
    setTabsOpen(false);
  }, [subjectId]);

  if (!subjectId) {
    return (
      <div className="p-6 sm:p-10">
        Invalid subject ID.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 sm:p-10">
        Loading subject...
      </div>
    );
  }

  if (isError || !offering) {
    return (
      <div className="p-6 sm:p-10">
        {error instanceof Error
          ? error.message
          : "Failed to load subject offering."}
      </div>
    );
  }

  const tabClass = ({
    isActive,
  }: {
    isActive: boolean;
  }) =>
    [
      "inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors",
      isActive
        ? "bg-indigo-600 text-white shadow-xs"
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
    ].join(" ");

  const mobileTabClass = ({
    isActive,
  }: {
    isActive: boolean;
  }) =>
    [
      "w-full inline-flex items-center justify-between rounded-lg px-3.5 py-2.5 text-xs font-semibold transition-colors",
      isActive
        ? "bg-indigo-600 text-white"
        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    ].join(" ");

  return (
    <div className="space-y-6">
      {/* Subject Header Card */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
        {/* Top row */}
        <div className="flex items-center gap-3">
          <Link
            to="/teacher/subject"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Back</span>
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 min-w-0 flex-wrap">
              <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">
                {offering.name}
              </h1>

              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                {offering.grade} • Section {offering.section}
              </span>
            </div>

            <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 min-w-0 flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={13} className="text-slate-400 shrink-0" />
                Room: <span className="font-semibold text-slate-700">{offering.room_number || "TBA"}</span>
              </span>

              {offering.teacher_name && (
                <span>
                  • Instructor: <span className="font-semibold text-slate-700">{offering.teacher_name}</span>
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setTabsOpen(true)}
            className="sm:hidden inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50"
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>
        </div>

        {/* Desktop / Tablet tabs */}
        <nav className="mt-5 hidden sm:flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 w-fit">
          <NavLink
            end
            to=""
            className={tabClass}
          >
            Overview
          </NavLink>

          <NavLink
            to="files"
            className={tabClass}
          >
            Files
          </NavLink>

          <NavLink
            to="activities"
            className={tabClass}
          >
            Activities
          </NavLink>

          <NavLink
            to="grades"
            className={tabClass}
          >
            Grades
          </NavLink>

          <NavLink
            to="classlist"
            className={tabClass}
          >
            Classlist
          </NavLink>
        </nav>

        {/* Mobile quick tabs */}
        <nav className="mt-4 grid grid-cols-2 gap-1.5 sm:hidden">
          <NavLink
            end
            to=""
            className={tabClass}
          >
            Overview
          </NavLink>

            <NavLink
              to="files"
              className={tabClass}
            >
              Files
            </NavLink>

            <NavLink
              to="activities"
              className={tabClass}
            >
              Activities
            </NavLink>

            <NavLink
              to="grades"
              className={tabClass}
            >
              Grades
            </NavLink>

            <NavLink
              to="classlist"
              className={tabClass}
            >
              Classlist
            </NavLink>
          </nav>
      </div>

      {/* Mobile Drawer */}
      {tabsOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div
            className="absolute inset-0 bg-slate-900/60"
            onClick={() => setTabsOpen(false)}
          />

          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white border-t border-slate-200 p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  Navigate
                </div>

                <div className="font-black text-slate-900">
                  {offering.name}
                </div>
              </div>

              <button
                onClick={() => setTabsOpen(false)}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-700"
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <NavLink
                end
                to=""
                className={mobileTabClass}
                onClick={() => setTabsOpen(false)}
              >
                Overview
                <span className="text-xs opacity-70">
                  →
                </span>
              </NavLink>

              <NavLink
                to="files"
                className={mobileTabClass}
                onClick={() => setTabsOpen(false)}
              >
                Files
                <span className="text-xs opacity-70">
                  →
                </span>
              </NavLink>

              <NavLink
                to="activities"
                className={mobileTabClass}
                onClick={() => setTabsOpen(false)}
              >
                Activities
                <span className="text-xs opacity-70">
                  →
                </span>
              </NavLink>

              <NavLink
                to="grades"
                className={mobileTabClass}
                onClick={() => setTabsOpen(false)}
              >
                Grades
                <span className="text-xs opacity-70">
                  →
                </span>
              </NavLink>

              <NavLink
                to="classlist"
                className={mobileTabClass}
                onClick={() => setTabsOpen(false)}
              >
                Classlist
                <span className="text-xs opacity-70">
                  →
                </span>
              </NavLink>
            </div>
          </div>
        </div>
      )}

      {/* Page body */}
      <div>
        <Outlet />
      </div>
    </div>
  );
}