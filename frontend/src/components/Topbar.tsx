import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, Calendar, Shield, GraduationCap, User as UserIcon, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useActiveAcademicTerm } from "../hooks/useAdminData";
import { SchoolLogo } from "./SchoolLogo";

interface TopbarProps {
  onOpenMobileSidebar: () => void;
  isDesktop: boolean;
}

export default function Topbar({ onOpenMobileSidebar, isDesktop }: TopbarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: activeTerm } = useActiveAcademicTerm();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate("/login", { replace: true });
  };

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

        {/* User profile avatar with always-accessible Logout dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="group flex items-center gap-1.5 rounded-full p-0.5 hover:ring-2 hover:ring-indigo-500/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
            aria-expanded={dropdownOpen}
            aria-label="User account menu"
          >
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white shadow-xs group-hover:bg-indigo-600 transition-colors">
              {user?.first_name ? user.first_name.charAt(0).toUpperCase() : "U"}
            </div>
            <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180 text-slate-700" : "group-hover:text-slate-600"}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 ring-1 ring-black/5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* User details */}
              <div className="px-3 py-2.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {user?.first_name ? `${user.first_name} ${user.last_name || ""}` : "Authenticated User"}
                </p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {user?.email || "user@claroed.edu"}
                </p>
                <div className="mt-2">
                  {getRoleBadge()}
                </div>
              </div>

              {/* Mobile Academic Term Indicator (for when screen < sm) */}
              <div className="px-3 py-2 sm:hidden border-b border-slate-100 bg-slate-50/70 rounded-lg my-1">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                  <Calendar size={12} className="text-indigo-600 shrink-0" />
                  <span className="truncate">
                    {activeTerm?.school_year ? `A.Y. ${activeTerm.school_year.name}` : "A.Y. ---"}
                  </span>
                  <span>•</span>
                  <span className="font-semibold text-slate-900 truncate">
                    {activeTerm?.active_semester?.name_display || activeTerm?.active_semester?.name || "Term"}
                  </span>
                </div>
              </div>

              {/* Action: Sign Out */}
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50/80 active:bg-rose-100 transition-colors mt-0.5 cursor-pointer"
              >
                <span>Sign Out</span>
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
