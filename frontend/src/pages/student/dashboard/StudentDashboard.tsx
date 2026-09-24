import { useStudentProfile } from '../../../hooks/useStudentProfile';
import { useStudentSubjects } from '../../../hooks/useStudentSubjects';
import { useStudentQuizzes } from '../../../hooks/useStudentQuizzes';
import { useStudentQuizAttempts } from '../../../hooks/useStudentSemesterGrades';
import type { StudentQuiz, QuizStatus } from '../../../types/studentTypes';

import StatCard from '../../../components/studentcomponents/StatCard';

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  Award,
  AlertCircle,
  Calendar,
} from 'lucide-react';

// ---------------- Helpers ----------------

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function safeNumber(v: any, fallback = 0) {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
}

function dueIso(q: StudentQuiz) {
  return q.close_time ?? q.open_time ?? null;
}

function urgencyFromDate(iso?: string | null) {
  if (!iso) return 'low' as const;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'low' as const;
  const now = new Date();
  const diffDays = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 1) return 'high' as const;
  if (diffDays <= 3) return 'medium' as const;
  return 'low' as const;
}

function canTakeQuiz(q: StudentQuiz) {
  const isOpen = q.is_open;
  if (!isOpen) return false;

  const allow = q.allow_multiple_attempts ?? true;
  const attempts = safeNumber(q.user_attempts, 0);
  if (!allow && attempts > 0) return false;

  return true;
}

function StatusPill({ status }: { status?: QuizStatus }) {
  const s = status ?? 'SCHEDULED';
  const cls =
    s === 'OPEN'
      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
      : s === 'CLOSED'
      ? 'bg-slate-50 text-slate-600 ring-1 ring-slate-200'
      : s === 'SCHEDULED'
      ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20'
      : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${cls}`}>
      {s}
    </span>
  );
}

// ---------------- Component ----------------

export default function StudentDashboard() {
  const {
    data: student,
    isLoading,
    error,
  } = useStudentProfile();

  const {
    data: offerings = [],
    isLoading: subjectsLoading,
    error: subjectsError,
  } = useStudentSubjects();

  const {
    data: quizzes = [],
    isLoading: quizzesLoading,
    error: quizzesError,
  } = useStudentQuizzes();

  const {
    data: quizAttempts = [],
  } = useStudentQuizAttempts();

  const [selectedSemester, setSelectedSemester] = useState(1);

  const attemptsByQuizId = useMemo(() => {
    const map = new Map<number, (typeof quizAttempts)[0]>();
    for (const att of quizAttempts) {
      map.set(att.quiz, att);
    }
    return map;
  }, [quizAttempts]);

  const getSubjectSemesterGrade = (o: any, sem: number): number | null => {
    const semKey = `SEMESTER_${sem}`;
    const altKey = `SEM${sem}`;
    const val = o.semesters?.[semKey] ?? o.semesters?.[altKey] ?? (o.quarters as any)?.[sem];
    if (typeof val === 'number' && !Number.isNaN(val)) return val;
    if (sem === 1 && typeof o.average === 'number' && !Number.isNaN(o.average)) return o.average;
    return null;
  };

  const isOpen = (q: StudentQuiz) => q.is_open === true;
  const isUpcoming = (q: StudentQuiz) => q.is_upcoming === true;

  const upcoming = useMemo(() => {
    const items = quizzes
      .filter((q) => isOpen(q) || isUpcoming(q))
      .map((q) => {
        const status: QuizStatus = q.is_open
          ? 'OPEN'
          : q.is_upcoming
          ? 'SCHEDULED'
          : q.is_closed
          ? 'CLOSED'
          : 'SCHEDULED';
        const iso = dueIso(q);
        const urgency = urgencyFromDate(iso);
        const attempt = attemptsByQuizId.get(q.id);
        const isCompleted =
          !!attempt &&
          (attempt.status === 'SUBMITTED' ||
            attempt.status === 'GRADED' ||
            (attempt.score !== null && attempt.score !== undefined));
        const takeable = !isCompleted && canTakeQuiz(q);

        return {
          key: `Q-${q.id}`,
          title: q.title,
          subject: q.subject_name ?? '—',
          dueLabel: iso ? formatDate(iso) : '—',
          urgency,
          status,
          quizId: q.id,
          takeable,
          isCompleted,
          attempt,
          link: takeable ? `/student/activities/${q.id}/take` : `/student/activities`,
        };
      });

    const rank = { high: 0, medium: 1, low: 2 } as const;
    items.sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      return rank[a.urgency] - rank[b.urgency];
    });

    return items.slice(0, 8);
  }, [quizzes, attemptsByQuizId]);

  const stats = useMemo(() => {
    const semGrades = offerings
      .map((o) => getSubjectSemesterGrade(o, selectedSemester))
      .filter((v): v is number => v !== null);

    const overallAvg = semGrades.length
      ? semGrades.reduce((a, b) => a + b, 0) / semGrades.length
      : null;

    const openCount = quizzes.filter((q) => q.is_open).length;
    const scheduledCount = quizzes.filter((q) => q.is_upcoming).length;

    let completedCount = 0;
    for (const q of quizzes) {
      const att = attemptsByQuizId.get(q.id);
      if (att && (att.status === 'SUBMITTED' || att.status === 'GRADED' || att.score !== null)) {
        completedCount++;
      }
    }

    const pendingCount = Math.max(0, openCount - completedCount);

    return {
      subjectCount: offerings.length,
      overallAvg,
      openScheduled: openCount + scheduledCount,
      openCount,
      scheduledCount,
      completedCount,
      pendingCount,
    };
  }, [offerings, quizzes, selectedSemester, attemptsByQuizId]);

  if (isLoading || subjectsLoading || quizzesLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Loading student dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || subjectsError || quizzesError) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-6 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
        <h3 className="mt-2 text-sm font-semibold text-rose-900">Failed to load dashboard data</h3>
        <p className="mt-1 text-xs text-rose-600">
          We encountered an issue retrieving your student record. Please refresh to try again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {getGreeting()}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {student?.first_name} {student?.last_name}!
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
            <span>{student?.grade_level || 'Grade Level'}</span>
            <span>•</span>
            <span>Section {student?.section_name || student?.section || 'General'}</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-slate-600">
              <Calendar size={12} /> A.Y. {student?.academic_year || '2024–2025'}
            </span>
          </div>
        </div>

        {/* Semester Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label htmlFor="semester" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Semester:
          </label>
          <select
            id="semester"
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-xs outline-none transition-colors hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value={1}>Semester 1</option>
            <option value={2}>Semester 2</option>
            <option value={3}>Semester 3</option>
          </select>
        </div>
      </div>

      {/* 4 Unified Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Stat 1: Semester Average */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Sem {selectedSemester} Average</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Award size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-mono text-2xl font-bold tracking-tight text-slate-900">
              {stats.overallAvg !== null ? stats.overallAvg.toFixed(1) : '—'}
            </span>
          </div>
          <div className="mt-1">
            {stats.overallAvg !== null && stats.overallAvg >= 75 ? (
              <span className="text-xs font-medium text-emerald-600">Passing Standing</span>
            ) : stats.overallAvg !== null ? (
              <span className="text-xs font-medium text-rose-600">Needs Improvement</span>
            ) : (
              <span className="text-xs text-slate-400">No grades recorded</span>
            )}
          </div>
        </div>

        {/* Stat 2: Enrolled Subjects */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Enrolled Subjects</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <BookOpen size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-mono text-2xl font-bold tracking-tight text-slate-900">
              {stats.subjectCount}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-400">Active enrollments</div>
        </div>

        {/* Stat 3: Pending Activities */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending Activities</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-mono text-2xl font-bold tracking-tight text-slate-900">
              {stats.pendingCount}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-400">Quizzes to complete</div>
        </div>

        {/* Stat 4: Completed Activities */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Completed Quizzes</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-mono text-2xl font-bold tracking-tight text-slate-900">
              {stats.completedCount}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-400">Submitted attempts</div>
        </div>
      </div>

      {/* Main Section: Circular Grade Gauge & My Subjects */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Radial Grade Gauge Card */}
        <StatCard
          label={`Semester ${selectedSemester} Average`}
          value={stats.overallAvg}
        />

        {/* My Subjects Card */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs xl:col-span-2">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Enrolled Subjects</h2>
              <p className="text-xs text-slate-500">Quick access to learning resources and grades</p>
            </div>
            <Link
              to="/student/subject"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              View all ({offerings.length})
            </Link>
          </div>

          {offerings.length === 0 ? (
            <div className="py-12 text-center text-xs font-medium text-slate-400">
              No subjects enrolled for this academic year.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {offerings.map((o) => {
                const semGrade = getSubjectSemesterGrade(o, selectedSemester);

                return (
                  <Link
                    key={o.id}
                    to={`/student/subject-offering/${o.id}`}
                    className="group flex items-center justify-between gap-4 py-3.5 px-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    {/* Subject Icon / Initials */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                      {o.subject_name?.charAt(0).toUpperCase() || '?'}
                    </div>

                    {/* Subject & Instructor Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-xs text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                          {o.subject_name}
                        </span>
                        <span className="hidden sm:inline text-xs text-slate-400">•</span>
                        <span className="hidden sm:inline text-xs text-slate-500 truncate">
                          {o.teacher_name || 'Unassigned'}
                        </span>
                      </div>
                      <div className="sm:hidden text-[11px] text-slate-500 truncate mt-0.5">
                        {o.teacher_name || 'Unassigned'}
                      </div>
                    </div>

                    {/* Grade Chip & Chevron */}
                    <div className="flex shrink-0 items-center gap-2.5">
                      {semGrade !== null ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono text-xs font-semibold ${
                            semGrade >= 75
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                              : 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20'
                          }`}
                        >
                          {semGrade.toFixed(1)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-400 ring-1 ring-slate-200">
                          Pending
                        </span>
                      )}

                      <ChevronRight
                        size={16}
                        className="text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Activities Table / Feed */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Upcoming & Active Quizzes</h2>
            <p className="text-xs text-slate-500">Activities requiring your submission or review</p>
          </div>
          <Link
            to="/student/activities"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
          >
            View all activities
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <div className="py-12 text-center text-xs font-medium text-slate-400">
            No active or upcoming quizzes scheduled right now.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-3">Subject</th>
                  <th className="py-3 px-3">Activity</th>
                  <th className="py-3 px-3">Due Date</th>
                  <th className="py-3 px-3">Status / Score</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {upcoming.map((t) => (
                  <tr key={t.key} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-3 font-semibold text-slate-800">
                      {t.subject}
                    </td>
                    <td className="py-3.5 px-3 font-medium text-slate-900">
                      {t.title}
                    </td>
                    <td className="py-3.5 px-3 text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className="text-slate-400" />
                        <span>{t.dueLabel}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      {t.isCompleted && t.attempt ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20">
                          Score: {t.attempt.score ?? 0}/{t.attempt.total ?? 0}
                        </span>
                      ) : (
                        <StatusPill status={t.status} />
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {t.takeable ? (
                        <Link
                          to={t.link}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
                        >
                          Start
                        </Link>
                      ) : (
                        <Link
                          to={t.link}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
                        >
                          Details <ChevronRight size={14} />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
