'use client';

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Users,
  BarChart3,
  Clock,
  MapPin,
  ArrowRight,
  AlertCircle,
  Calendar,
  Plus,
  FileCheck2,
  UsersRound,
  GraduationCap,
} from 'lucide-react';

import { useTeacherPendingGrading, useTeacherSubjects } from '../../../hooks/useTeacherSubjects';
import { useActiveAcademicTerm } from '../../../hooks/useAdminData';

export default function TeacherDashboard() {
  const {
    data: subjects = [],
    isLoading,
    error,
  } = useTeacherSubjects();

  const { data: pendingGradingTasks = [] } = useTeacherPendingGrading();
  const { data: activeTerm } = useActiveAcademicTerm();

  const { totalClasses, totalStudents, totalPendingTasks, overallAvg } = useMemo(() => {
    const totalClasses = subjects.length;
    const totalStudents = subjects.reduce((sum, s) => sum + (s.students || 0), 0);
    const subjectsPending = subjects.reduce((sum, s) => sum + (s.pendingTasks || 0), 0);
    const gradingTasksPending = pendingGradingTasks.reduce((sum, t) => sum + (t.pending_grading_count || 0), 0);
    const totalPendingTasks = Math.max(subjectsPending, gradingTasksPending);

    const overallAvg =
      totalClasses > 0
        ? (subjects.reduce((sum, s) => sum + (Number(s.average) || 0), 0) / totalClasses).toFixed(1)
        : 'N/A';

    return { totalClasses, totalStudents, totalPendingTasks, overallAvg };
  }, [subjects, pendingGradingTasks]);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    []
  );

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-slate-200 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-white border border-slate-200/80 rounded-xl" />
          ))}
        </div>
        <div className="h-96 bg-white border border-slate-200/80 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-6 text-rose-700">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-rose-500" />
          <h2 className="text-base font-bold">Unable to load subject offerings</h2>
        </div>
        <p className="mt-1 text-sm text-rose-600">
          Please check your session or internet connection and try refreshing the page.
        </p>
      </div>
    );
  }

  const statCards = [
    {
      title: "Assigned Classes",
      value: totalClasses,
      subtitle: "Active subject offerings",
      icon: BookOpen,
      accent: "text-indigo-600 bg-indigo-50 border-indigo-100",
      link: "/teacher/subject",
    },
    {
      title: "Total Students",
      value: totalStudents,
      subtitle: "Learners across all classes",
      icon: Users,
      accent: "text-blue-600 bg-blue-50 border-blue-100",
      link: "/teacher/subject",
    },
    {
      title: "Pending Tasks",
      value: totalPendingTasks,
      subtitle: "Submissions awaiting grading",
      icon: Clock,
      accent: "text-amber-600 bg-amber-50 border-amber-100",
      link: "/teacher/submissions",
    },
    {
      title: "Overall Class Average",
      value: overallAvg === 'N/A' ? '—' : `${overallAvg}%`,
      subtitle: "Combined performance index",
      icon: BarChart3,
      accent: "text-emerald-600 bg-emerald-50 border-emerald-100",
      link: "/teacher/grades/semester",
    },
  ];



  return (
    <div className="space-y-6">
      {/* 1) Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Instructor Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Welcome back! Here is your daily teaching schedule and subject performance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200/80 px-3.5 py-2 rounded-lg shadow-xs">
            <Calendar className="h-4 w-4 text-indigo-600" />
            <span>{today}</span>
          </div>

          <Link
            to="/teacher/activities/create"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Plus size={15} />
            <span>Create Activity</span>
          </Link>
        </div>
      </div>

      {/* 2) Stat Cards */}
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
                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 font-mono">
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

      {/* 2.5) Pending Manual Grading Tasks Section */}
      {pendingGradingTasks.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/70">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                <Clock size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-amber-950">
                  Activities Awaiting Manual Grading
                </h2>
                <p className="text-xs text-amber-800">
                  Student submissions contain essay or short answer questions that need teacher evaluation.
                </p>
              </div>
            </div>
            <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-200/80 text-amber-900">
              <span className="h-2 w-2 rounded-full bg-amber-600 animate-pulse" />
              {pendingGradingTasks.length} {pendingGradingTasks.length === 1 ? "Activity" : "Activities"} Pending
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingGradingTasks.map((task) => (
              <div
                key={task.id}
                className="flex flex-col justify-between rounded-xl border border-amber-200/80 bg-white p-4 shadow-2xs hover:border-amber-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 truncate">
                      {task.subject_name}
                    </span>
                    <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60 shrink-0">
                      {task.pending_grading_count} {task.pending_grading_count === 1 ? "submission" : "submissions"}
                    </span>
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-slate-900 line-clamp-1">
                    {task.title}
                  </h3>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Needs review</span>
                  <Link
                    to={`/teacher/activities/${task.id}/grading`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    <span>Grade Now</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3) Subjects List Section */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Active Subject Offerings</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              You are assigned to {totalClasses} teaching {totalClasses === 1 ? 'offering' : 'offerings'} this academic term
            </p>
          </div>
          <Link
            to="/teacher/subject"
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Manage offerings
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="p-6">
          {subjects.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No subject offerings currently assigned to your account.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {subjects.map((s) => {
                const avg = Number(s.average) || 0;
                const hasStudents = (s.students || 0) > 0;
                const pending = s.pendingTasks || 0;

                return (
                  <Link
                    to={`/teacher/subject/${s.id}`}
                    key={s.id}
                    className="group flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-indigo-200 hover:shadow-md transition-all"
                  >
                    <div>
                      {/* Section & Grade badge */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 border border-indigo-100">
                          {s.grade} • Section {s.section}
                        </span>
                        {pending > 0 ? (
                          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-100 uppercase">
                            {pending} Pending
                          </span>
                        ) : (
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100 uppercase">
                            Up to date
                          </span>
                        )}
                      </div>

                      {/* Subject Name */}
                      <h3 className="mt-3 text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                        {s.name}
                      </h3>

                      {/* Meta Information */}
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg bg-slate-50/70 border border-slate-200/60 p-2.5">
                          <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
                            <MapPin size={12} />
                            <span>Room</span>
                          </div>
                          <p className="mt-1 font-semibold text-slate-800 truncate">
                            {s.room_number || 'TBA'}
                          </p>
                        </div>

                        <div className="rounded-lg bg-slate-50/70 border border-slate-200/60 p-2.5">
                          <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
                            <Clock size={12} />
                            <span>Schedule</span>
                          </div>
                          <p className="mt-1 font-semibold text-slate-800 truncate">
                            {s.nextClass || 'TBA'}
                          </p>
                        </div>
                      </div>

                      {/* Metrics bar */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                          <Users size={14} className="text-slate-400" />
                          <span>{s.students ?? 0} Students</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 text-[11px]">Avg:</span>
                          <span className={`font-semibold font-mono ${hasStudents && avg >= 85 ? 'text-emerald-700' : 'text-slate-700'}`}>
                            {!hasStudents ? '—' : `${avg}%`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600 group-hover:text-indigo-800 transition-colors">
                      <span>Open Workspace</span>
                      <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
