import React from "react";
import { useLocation } from "react-router-dom";
import { Menu, Calendar, Shield, GraduationCap, User as UserIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useActiveAcademicTerm } from "../hooks/useAdminData";
import { SchoolLogo } from "./SchoolLogo";

interface TopbarProps {
  onOpenMobileSidebar: () => void;
  isDesktop: boolean;
}

export default function Topbar({ onOpenMobileSidebar, isDesktop }: TopbarProps) {
  const { user } = useAuth();
  const location = useLocation();
  const { data: activeTerm } = useActiveAcademicTerm();

  // Determine friendly page title from path
  const getPageTitle = (path: string) => {
    const p = path.toLowerCase();
    if (p.includes("/dashboard")) return "Dashboard Overview";
    if (p.includes("/academic-setup")) return "Academic Setup";
    if (p.includes("/accounts")) return "User Accounts";
    if (p.includes("/faculty")) return "Faculty & Departments";
    if (p.includes("/students")) return "Student Masterlist";
    if (p.includes("/gradelogs")) return "Grade Audit Logs";
    if (p.includes("/advisory-class")) return "Advisory Class";
    if (p.includes("/grades/semester")) return "Semester Gradebook";
    if (p.includes("/submissions")) return "Student Submissions";
    if (p.includes("/activities")) return "Activities & Assessments";
    if (p.includes("/report-card")) return "Official Report Card";
    if (p.includes("/subject")) return "Academic Subjects";
    return "Portal";
  };

  const role = user?.role?.toUpperCase() || "USER";

  const getRoleBadge = () => {
    switch (role) {
      case "ADMIN":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800">
            <Shield size={12} className="text-slate-600" />
            Administrator
          </span>
        );
      case "TEACHER":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
            <GraduationCap size={12} className="text-indigo-600" />
            Faculty
          </span>
        );
      case "STUDENT":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            <UserIcon size={12} className="text-emerald-600" />
            Student
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            {role}
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur sm:px-6">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {!isDesktop && (
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
        )}

        {!isDesktop ? (
          <div className="flex items-center">
            <SchoolLogo />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {role.charAt(0) + role.slice(1).toLowerCase()} Portal
            </span>
            <span className="text-slate-300">/</span>
            <h1 className="text-base font-bold text-slate-900">
              {getPageTitle(location.pathname)}
            </h1>
          </div>
        )}
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Active Academic Year & Semester Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 shadow-xs">
          <Calendar size={13} className="text-indigo-600" />
          <span>
            {activeTerm?.school_year ? `A.Y. ${activeTerm.school_year.name}` : "A.Y. ---"}
          </span>
          <span className="text-slate-300">•</span>
          <span className="font-semibold text-slate-900">
            {activeTerm?.active_semester
              ? activeTerm.active_semester.name_display || activeTerm.active_semester.name
              : "No Active Term"}
          </span>
          {activeTerm?.active_semester && (
            <span
              className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 ml-0.5 animate-pulse"
              title="Active Semester"
            />
          )}
        </div>

        {/* Role Pill */}
        {getRoleBadge()}

        {/* User initials bubble */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-xs">
            {user?.first_name ? user.first_name.charAt(0).toUpperCase() : "U"}
          </div>
          {/* <span className="hidden text-xs font-semibold text-slate-700 md:inline-block">
            {user?.first_name} {user?.last_name}
          </span> */}
        </div>
      </div>
    </header>
  );
}
