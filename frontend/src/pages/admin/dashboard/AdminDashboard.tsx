import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap,
  Users,
  BookOpen,
  FileSpreadsheet,
  ArrowRight,
  UserPlus,
  History,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from "lucide-react";
import {
  useAdminDashboardStats,
  useAdminUsers,
  useAdminGradeLogs,
  AdminUserAccount,
  AdminGradeLog,
} from "../../../hooks/useAdminData";

// ---------------- Types ----------------

type GradeLogType = "Update" | "Create";

// ---------------- Helpers ----------------

function formatNameFromUser(u: AdminUserAccount) {
  const name = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
  return name || u.email || "—";
}

function getInitials(u: AdminUserAccount) {
  const first = u.first_name?.charAt(0) || "";
  const last = u.last_name?.charAt(0) || "";
  return (first + last).toUpperCase() || u.email?.charAt(0).toUpperCase() || "U";
}

function formatTimestamp(ts?: string) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function safeText(v: any, fallback = "—") {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : fallback;
}

// ---------------- Component ----------------

const AdminDashboard: React.FC = () => {
  const { data: statsData, isLoading: statsLoading, error: statsError } = useAdminDashboardStats();
  const { data: usersData, isLoading: usersLoading, error: usersError } = useAdminUsers();
  const { data: rawLogs, isLoading: logsLoading } = useAdminGradeLogs(6);

  const loading = (statsLoading && !statsData) || (usersLoading && !usersData);
  const errorMsg = statsError?.message || usersError?.message || null;

  const users = usersData ?? [];
  const stats = {
    students: Number(statsData?.students ?? 0),
    teachers: Number(statsData?.teachers ?? 0),
    subjects: Number(statsData?.subjects ?? 0),
  };

  const gradeLogs: AdminGradeLog[] = (rawLogs ?? []).slice(0, 6).map((x: any) => ({
    timestamp: safeText(x.timestamp),
    teacher: safeText(x.teacher),
    student: safeText(x.student),
    subject: safeText(x.subject),
    activity: safeText(x.activity, ""),
    previousGrade: safeText(x.previousGrade, "N/A"),
    newGrade: safeText(x.newGrade),
    change: safeText(x.change),
    changeType: x.changeType === "Create" ? "Create" : "Update",
  }));

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-slate-200 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white border border-slate-200/80 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-white border border-slate-200/80 rounded-xl" />
          <div className="h-96 bg-white border border-slate-200/80 rounded-xl" />
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-6 text-rose-700">
        <h2 className="text-base font-bold">Failed to load admin dashboard</h2>
        <p className="mt-1 text-sm">{errorMsg}</p>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Students",
      value: stats.students,
      subtitle: "Active enrolled learners",
      icon: GraduationCap,
      accent: "text-blue-600 bg-blue-50 border-blue-100",
      link: "/admin/students",
    },
    {
      title: "Total Faculty",
      value: stats.teachers,
      subtitle: "Assigned teaching staff",
      icon: Users,
      accent: "text-emerald-600 bg-emerald-50 border-emerald-100",
      link: "/admin/faculty",
    },
    {
      title: "Academic Departments",
      value: stats.subjects,
      subtitle: "Active curriculum subjects",
      icon: BookOpen,
      accent: "text-indigo-600 bg-indigo-50 border-indigo-100",
      link: "/admin/faculty",
    },
    {
      title: "Grade Audit Trail",
      value: gradeLogs.length,
      subtitle: "Recent grading events",
      icon: FileSpreadsheet,
      accent: "text-amber-600 bg-amber-50 border-amber-100",
      link: "/admin/gradelogs",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1) Page Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            System Administration
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time status overview of institution accounts, departments, and grading activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/accounts"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            <span>Manage Accounts</span>
          </Link>
        </div>
      </div>

      {/* 2) Four Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link
              key={idx}
              to={card.link}
              className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {card.title}
                  </p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                    {card.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{card.subtitle}</p>
                </div>
                <div className={`p-3 rounded-xl border ${card.accent}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 3) Main Content Grid: Recent Accounts & Recent Grade Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Recent Accounts Panel */}
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-800">Recent User Accounts</h2>
            </div>
            <Link
              to="/admin/accounts"
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="p-6 divide-y divide-slate-100 flex-1">
            {users.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No user accounts found.
              </div>
            ) : (
              users.slice(0, 6).map((user) => {
                const roleUpper = (user.role || "").toUpperCase();
                const roleBadgeClass =
                  roleUpper === "ADMIN"
                    ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                    : roleUpper === "TEACHER"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : "bg-blue-50 text-blue-700 border-blue-100";

                return (
                  <div key={user.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200">
                        {getInitials(user)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {formatNameFromUser(user)}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${roleBadgeClass}`}
                    >
                      {user.role}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Recent Grade Logs Panel */}
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-800">Recent Grade Activity</h2>
            </div>
            <Link
              to="/admin/gradelogs"
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              Audit log
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="p-6 divide-y divide-slate-100 flex-1">
            {gradeLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No recent grade changes recorded.
              </div>
            ) : (
              gradeLogs.slice(0, 6).map((log, i) => {
                const isCreate = log.changeType === "Create";
                return (
                  <div key={i} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="font-semibold text-slate-900">{log.teacher}</span>
                        <span className="text-slate-400">
                          {isCreate ? "posted grade for" : "updated grade for"}
                        </span>
                        <span className="font-semibold text-slate-900">{log.student}</span>
                      </div>

                      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                        <span className="font-medium text-slate-600">{log.subject}</span>
                        {log.activity && <span>• {log.activity}</span>}
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>

                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-slate-700 border border-slate-200">
                          {log.change}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isCreate
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : "bg-amber-50 text-amber-700 border-amber-100"
                      }`}
                    >
                      {log.changeType}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
