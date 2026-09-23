import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Download,
  FileText,
  Search,
  ArrowUpDown,
  PlayCircle,
  RefreshCw,
  Layers,
  FolderOpen,
  CalendarClock,
  BarChart2,
  Award,
  CheckCircle2,
  Eye,
  X,
  Clock,
} from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';

// STUDENT HOOKS
import { useStudentSubject } from '../../../hooks/useStudentSubject';
import { useStudentSubjectQuizzes } from '../../../hooks/useStudentSubjectQuizzes';
import { useStudentSubjectFiles } from '../../../hooks/useStudentSubjectFiles';
import {
  useStudentSubjectGrades,
  useStudentQuizAttempts,
} from '../../../hooks/useStudentSemesterGrades';

import type { StudentQuiz } from '../../../types/studentTypes';

type QuizStatus = 'DRAFT' | 'SCHEDULED' | 'OPEN' | 'CLOSED';

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

function formatDateTime(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getQuizStatus(q: StudentQuiz): QuizStatus {
  if (q.is_open) return 'OPEN';
  if (q.is_upcoming) return 'SCHEDULED';
  if (q.is_closed) return 'CLOSED';
  return 'SCHEDULED';
}

function statusMeta(s: QuizStatus) {
  if (s === 'OPEN')
    return {
      chip: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
      dot: 'bg-emerald-500',
      label: 'OPEN',
    };
  if (s === 'SCHEDULED')
    return {
      chip: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
      dot: 'bg-amber-500',
      label: 'SCHEDULED',
    };
  if (s === 'CLOSED')
    return {
      chip: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200',
      dot: 'bg-slate-400',
      label: 'CLOSED',
    };
  return {
    chip: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200',
    dot: 'bg-slate-400',
    label: 'DRAFT',
  };
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let num = bytes;
  while (num >= 1024 && i < units.length - 1) {
    num /= 1024;
    i++;
  }
  return `${num.toFixed(num >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function isPreviewable(contentType: string, url: string) {
  const lower = (url || '').toLowerCase();
  if ((contentType || '').startsWith('image/')) {
    return 'image' as const;
  }
  if (contentType === 'application/pdf' || lower.endsWith('.pdf')) {
    return 'pdf' as const;
  }
  if (lower.match(/\.(png|jpg|jpeg|webp)$/)) {
    return 'image' as const;
  }
  return null;
}

export default function StudentSubjectpage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const offeringId = Number(id || 0);
  const [activeTab, setActiveTab] = useState<'activities' | 'files' | 'grades'>('activities');

  const [preview, setPreview] = useState<{
    kind: 'pdf' | 'image';
    url: string;
    title: string;
  } | null>(null);

  const {
    data: offering,
    isLoading: subjectLoading,
    error: subjectError,
  } = useStudentSubject(offeringId);

  const {
    data: quizzes = [],
    isLoading: quizzesLoading,
    error: quizzesError,
  } = useStudentSubjectQuizzes(offeringId);

  const {
    data: files = [],
    isLoading: filesLoading,
    error: filesError,
    refetch: refetchFiles,
    isFetching: filesFetching,
  } = useStudentSubjectFiles(offeringId);

  const { data: subjectGrades = [] } = useStudentSubjectGrades(offeringId);

  const { data: quizAttempts = [] } = useStudentQuizAttempts();

  const attemptsByQuizId = useMemo(() => {
    const map = new Map<number, (typeof quizAttempts)[0]>();
    for (const att of quizAttempts) {
      map.set(att.quiz, att);
    }
    return map;
  }, [quizAttempts]);

  // Semester grade breakdown map (1, 2, 3)
  const semesterBreakdown = useMemo(() => {
    const map: Record<number, any> = {};
    for (const g of subjectGrades) {
      let semNum: number | null = null;
      const semStr = String((g as any).semester?.name ?? (g as any).semester ?? '');
      if (semStr.includes('1')) semNum = 1;
      else if (semStr.includes('2')) semNum = 2;
      else if (semStr.includes('3')) semNum = 3;
      else if (g.quarter) semNum = g.quarter;

      if (semNum && (!map[semNum] || g.final_grade !== null)) {
        map[semNum] = g;
      }
    }
    return map;
  }, [subjectGrades]);

  const computedFinalGrade = useMemo(() => {
    const sem1 =
      semesterBreakdown[1]?.final_grade ??
      offering?.semesters?.['SEMESTER_1'] ??
      offering?.semesters?.['SEM1'];
    const sem2 =
      semesterBreakdown[2]?.final_grade ??
      offering?.semesters?.['SEMESTER_2'] ??
      offering?.semesters?.['SEM2'];
    const sem3 =
      semesterBreakdown[3]?.final_grade ??
      offering?.semesters?.['SEMESTER_3'] ??
      offering?.semesters?.['SEM3'];

    const validSems = [sem1, sem2, sem3].filter(
      (v): v is number => typeof v === 'number' && !Number.isNaN(v)
    );
    if (validSems.length === 0) {
      return typeof offering?.final_grade === 'number' ? offering.final_grade : null;
    }
    return Math.round((validSems.reduce((a, b) => a + b, 0) / validSems.length) * 100) / 100;
  }, [semesterBreakdown, offering]);

  // files UI state
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'name'>('newest');

  const stats = useMemo(() => {
    const grade =
      computedFinalGrade !== null
        ? Math.round(computedFinalGrade)
        : typeof offering?.final_grade === 'number'
        ? Math.round(offering.final_grade)
        : null;
    return { grade, activityCount: quizzes.length, fileCount: files.length };
  }, [computedFinalGrade, offering, quizzes, files]);

  // Sort quizzes: OPEN first → SCHEDULED → CLOSED → DRAFT
  const sortedQuizzes = useMemo(() => {
    const order = { OPEN: 0, SCHEDULED: 1, CLOSED: 2, DRAFT: 3 } as const;

    return [...quizzes]
      .map((qq) => ({ ...qq, _status: getQuizStatus(qq) }))
      .sort((a, b) => {
        const sa = order[a._status];
        const sb = order[b._status];
        if (sa !== sb) return sa - sb;

        const da = new Date(a.close_time ?? a.open_time ?? 0).getTime();
        const db = new Date(b.close_time ?? b.open_time ?? 0).getTime();
        return da - db;
      });
  }, [quizzes]);

  // Files filtering + sorting
  const visibleFiles = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let arr = [...files].filter((f) => (needle ? f.title.toLowerCase().includes(needle) : true));

    if (sort === 'name') {
      arr.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === 'oldest') {
      arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else {
      arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return arr;
  }, [files, q, sort]);

  if (filesLoading || subjectLoading || quizzesLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Loading subject workspace...</p>
        </div>
      </div>
    );
  }

  if (subjectError || quizzesError || filesError || !offering) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-6 text-center">
        <h3 className="text-sm font-semibold text-rose-900">Failed to load subject workspace</h3>
        <p className="mt-1 text-xs text-rose-600">
          {subjectError
            ? 'Unable to load subject.'
            : quizzesError
            ? 'Unable to load subject activities.'
            : filesError
            ? 'Unable to load subject files.'
            : 'Subject offering not found.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/student/subject')}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition"
        >
          <ArrowLeft size={13} /> Back to Subjects
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* File Preview Modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="flex flex-col w-full max-w-4xl max-h-[90vh] rounded-xl bg-white shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 bg-slate-50/80">
              <div className="font-semibold text-sm text-slate-900 truncate">
                {preview.title}
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
                aria-label="Close preview"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 bg-slate-100 p-2 overflow-auto min-h-[60vh]">
              {preview.kind === 'image' ? (
                <div className="flex h-full items-center justify-center p-4">
                  <img
                    src={preview.url}
                    alt={preview.title}
                    className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-xs"
                  />
                </div>
              ) : (
                <iframe
                  title={preview.title}
                  src={preview.url}
                  className="w-full h-full min-h-[65vh] rounded-lg border border-slate-200 bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            to="/student/subject"
            className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
            title="Back to subjects"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Subject Workspace
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {offering.subject_name}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Instructor: <span className="font-semibold text-slate-700">{offering.teacher_name ?? '—'}</span>
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('activities')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'activities'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Layers size={14} />
            <span>Activities</span>
            <span
              className={`font-mono text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                activeTab === 'activities' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {stats.activityCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'files'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <FolderOpen size={14} />
            <span>Files</span>
            <span
              className={`font-mono text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                activeTab === 'files' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {stats.fileCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('grades')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === 'grades'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Award size={14} />
            <span>Grades</span>
          </button>
        </div>
      </div>

      {/* 3 Quick Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Stat 1: Final Grade */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Current Grade</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <BarChart2 size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="font-mono text-2xl font-bold tracking-tight text-slate-900">
              {stats.grade ?? '—'}
            </span>
            {stats.grade !== null && <span className="text-xs font-semibold text-slate-400">/ 100</span>}
          </div>
          <div className="mt-1 text-xs text-slate-400">Official SF9 entry</div>
        </div>

        {/* Stat 2: Activities Count */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Activities</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Layers size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-mono text-2xl font-bold tracking-tight text-slate-900">
              {stats.activityCount}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-400">Quizzes & assessments</div>
        </div>

        {/* Stat 3: Files Count */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Learning Materials</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <FolderOpen size={18} />
            </div>
          </div>
          <div className="mt-3">
            <span className="font-mono text-2xl font-bold tracking-tight text-slate-900">
              {stats.fileCount}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-400">Handouts & modules</div>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        {/* Tab 1: Activities */}
        {activeTab === 'activities' && (
          <div>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Assigned Activities</h2>
                <p className="text-xs text-slate-500">Quizzes and formal assessments for this subject</p>
              </div>
            </div>

            {sortedQuizzes.length === 0 ? (
              <div className="p-12 text-center">
                <CalendarClock className="mx-auto h-8 w-8 text-slate-300" />
                <h3 className="mt-2 text-sm font-semibold text-slate-900">No activities posted yet</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Your instructor has not published any quizzes or exams for this class.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-5">Activity</th>
                      <th className="py-3 px-4">Opens</th>
                      <th className="py-3 px-4">Closes</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-5 text-right">Action / Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {sortedQuizzes.map((qq) => {
                      const status = getQuizStatus(qq);
                      const attempt = attemptsByQuizId.get(qq.id);
                      const isCompleted =
                        !!attempt &&
                        (attempt.status === 'SUBMITTED' ||
                          attempt.status === 'GRADED' ||
                          (attempt.score !== null && attempt.score !== undefined));
                      const canStart = !isCompleted && status === 'OPEN';
                      const meta = statusMeta(status);

                      return (
                        <tr key={qq.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="font-semibold text-slate-900">{qq.title}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {qq.time_limit ? `${qq.time_limit} mins` : 'No time limit'} •{' '}
                              {qq.total_points ?? 0} pts
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                            {formatDateTime(qq.open_time)}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                            {formatDateTime(qq.close_time)}
                          </td>
                          <td className="py-3.5 px-4">
                            {isCompleted ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20">
                                <CheckCircle2 size={11} /> COMPLETED
                              </span>
                            ) : (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${meta.chip}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                                {meta.label}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            {isCompleted ? (
                              <div className="inline-flex flex-col items-end">
                                <span className="font-mono text-xs font-bold text-slate-900">
                                  {attempt?.score ?? 0} / {attempt?.total ?? qq.total_points ?? 0}
                                </span>
                                <span className="font-mono text-[10px] font-semibold text-emerald-600">
                                  {Math.round(attempt?.percentage ?? 0)}%
                                </span>
                              </div>
                            ) : canStart ? (
                              <Link
                                to={`/student/activities/${qq.id}/take`}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-xs transition-colors"
                              >
                                <PlayCircle size={13} /> Start
                              </Link>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium">Unavailable</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Files */}
        {activeTab === 'files' && (
          <div>
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Learning Materials & Handouts</h2>
                <p className="text-xs text-slate-500">Download or preview lecture materials</p>
              </div>

              {/* Search & Sort Controls */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search files..."
                    className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none transition-colors hover:border-slate-300 focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1">
                  <ArrowUpDown size={12} className="text-slate-400" />
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as any)}
                    className="text-xs font-semibold text-slate-700 outline-none bg-transparent"
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="name">Name</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => refetchFiles()}
                  disabled={filesFetching}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  title="Refresh files"
                >
                  <RefreshCw size={12} className={filesFetching ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {visibleFiles.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="mx-auto h-8 w-8 text-slate-300" />
                <h3 className="mt-2 text-sm font-semibold text-slate-900">No files found</h3>
                <p className="mt-1 text-xs text-slate-500">
                  No learning materials uploaded match your search query.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {visibleFiles.map((f) => {
                  const previewKind = isPreviewable(f.content_type, f.file_url);

                  return (
                    <div
                      key={f.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                          <FileText size={16} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-xs text-slate-900 truncate">
                            {f.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {formatBytes(f.file_size)} • Uploaded {formatDateTime(f.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        {previewKind && (
                          <button
                            type="button"
                            onClick={() =>
                              setPreview({
                                kind: previewKind,
                                url: f.file_url,
                                title: f.title,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                          >
                            <Eye size={13} /> Preview
                          </button>
                        )}
                        <a
                          href={f.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-600 shadow-xs transition"
                        >
                          <Download size={13} /> Download
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Grades */}
        {activeTab === 'grades' && (
          <div className="p-5 space-y-6">
            {/* 3 Semesters + Final Grade Summary Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[1, 2, 3].map((sNum) => {
                const semGradeRec = semesterBreakdown[sNum];
                const semVal =
                  semGradeRec?.final_grade ??
                  offering?.semesters?.[`SEMESTER_${sNum}`] ??
                  offering?.semesters?.[`SEM${sNum}`];
                const hasVal = typeof semVal === 'number' && !Number.isNaN(semVal);

                return (
                  <div key={sNum} className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Semester {sNum}
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="font-mono text-2xl font-bold tracking-tight text-slate-900">
                        {hasVal ? semVal.toFixed(1) : '—'}
                      </span>
                      {hasVal && <span className="text-xs font-semibold text-slate-400">/ 100</span>}
                    </div>
                    <div className="mt-1">
                      {hasVal ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                            semVal >= 75
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                              : 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20'
                          }`}
                        >
                          {semVal >= 75 ? 'Passed' : 'Needs Attention'}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Pending</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Final Grade Card */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  Final Grade
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-mono text-2xl font-bold tracking-tight text-indigo-950">
                    {computedFinalGrade !== null ? computedFinalGrade.toFixed(1) : '—'}
                  </span>
                  {computedFinalGrade !== null && (
                    <span className="text-xs font-semibold text-indigo-400">/ 100</span>
                  )}
                </div>
                <div className="mt-1">
                  {computedFinalGrade !== null ? (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                        computedFinalGrade >= 75
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                          : 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20'
                      }`}
                    >
                      {computedFinalGrade >= 75 ? 'Passed Subject' : 'Failed'}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Awaiting marks</span>
                  )}
                </div>
              </div>
            </div>

            {/* Assessment Component Breakdown */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">
                DepEd Standard Grading Breakdown
              </h3>

              {subjectGrades.length === 0 ? (
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-8 text-center">
                  <p className="text-xs font-semibold text-slate-600">
                    No detailed assessment components recorded yet for this subject.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Scores for Written Works, Performance Tasks, and Semester Assessments will appear here once submitted.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {[1, 2, 3].map((sNum) => {
                    const gradeRec = semesterBreakdown[sNum];
                    if (!gradeRec) return null;

                    const wwScore = gradeRec.written_work_score ?? 0;
                    const wwTotal = gradeRec.written_work_total ?? 0;
                    const wwWeight = gradeRec.ww_weight ? gradeRec.ww_weight * 100 : 30;

                    const ptScore = gradeRec.performance_task_score ?? 0;
                    const ptTotal = gradeRec.performance_task_total ?? 0;
                    const ptWeight = gradeRec.pt_weight ? gradeRec.pt_weight * 100 : 50;

                    const saScore =
                      gradeRec.semester_assessment_score ??
                      gradeRec.quarterly_assessment_score ??
                      0;
                    const saTotal =
                      gradeRec.semester_assessment_total ??
                      gradeRec.quarterly_assessment_total ??
                      0;
                    const saWeight = (gradeRec.sa_weight ?? gradeRec.qa_weight)
                      ? (gradeRec.sa_weight ?? gradeRec.qa_weight) * 100
                      : 20;

                    return (
                      <div key={sNum} className="rounded-xl border border-slate-200/80 overflow-hidden">
                        <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">Semester {sNum} Breakdown</h4>
                            <p className="text-[11px] text-slate-500">Written Works, Performance Tasks, Assessment</p>
                          </div>
                          {gradeRec.final_grade !== null && (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                                gradeRec.final_grade >= 75
                                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                                  : 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20'
                              }`}
                            >
                              Grade: {gradeRec.final_grade} ({gradeRec.remarks || (gradeRec.final_grade >= 75 ? 'Passed' : 'Failed')})
                            </span>
                          )}
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-white">
                                <th className="py-2.5 px-4">Component</th>
                                <th className="py-2.5 px-4">Weight</th>
                                <th className="py-2.5 px-4">Raw Score</th>
                                <th className="py-2.5 px-4">Percentage</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                              <tr>
                                <td className="py-3 px-4 font-semibold text-slate-900">
                                  Written Works (WW)
                                </td>
                                <td className="py-3 px-4 text-slate-600 font-mono">{wwWeight}%</td>
                                <td className="py-3 px-4 text-slate-700 font-mono">
                                  {wwScore} / {wwTotal}
                                </td>
                                <td className="py-3 px-4 font-mono font-bold text-slate-900">
                                  {wwTotal > 0 ? `${((wwScore / wwTotal) * 100).toFixed(1)}%` : '—'}
                                </td>
                              </tr>
                              <tr>
                                <td className="py-3 px-4 font-semibold text-slate-900">
                                  Performance Tasks (PT)
                                </td>
                                <td className="py-3 px-4 text-slate-600 font-mono">{ptWeight}%</td>
                                <td className="py-3 px-4 text-slate-700 font-mono">
                                  {ptScore} / {ptTotal}
                                </td>
                                <td className="py-3 px-4 font-mono font-bold text-slate-900">
                                  {ptTotal > 0 ? `${((ptScore / ptTotal) * 100).toFixed(1)}%` : '—'}
                                </td>
                              </tr>
                              <tr>
                                <td className="py-3 px-4 font-semibold text-slate-900">
                                  Semester Assessment (SA)
                                </td>
                                <td className="py-3 px-4 text-slate-600 font-mono">{saWeight}%</td>
                                <td className="py-3 px-4 text-slate-700 font-mono">
                                  {saScore} / {saTotal}
                                </td>
                                <td className="py-3 px-4 font-mono font-bold text-slate-900">
                                  {saTotal > 0 ? `${((saScore / saTotal) * 100).toFixed(1)}%` : '—'}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
