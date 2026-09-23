import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Clock,
  Filter,
  ClipboardList,
  CheckCircle2,
  Eye,
  BookOpen,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { useStudentQuizzes, useStudentQuizAttempts } from '../../../hooks/useStudentQuizzes';
import { StudentQuiz, StudentQuizAttempt } from '../../../types/studentTypes';

type Tab = 'ALL' | 'OPEN' | 'UPCOMING' | 'CLOSED';

function badge(status: Tab) {
  const cls =
    status === 'OPEN'
      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
      : status === 'UPCOMING'
      ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/20'
      : status === 'CLOSED'
      ? 'bg-slate-50 text-slate-600 ring-1 ring-slate-200'
      : 'bg-slate-50 text-slate-700 ring-1 ring-slate-200';

  return `inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${cls}`;
}

function statusOf(q: StudentQuiz): Tab {
  if (q.is_open) return 'OPEN';
  if (q.is_upcoming) return 'UPCOMING';
  if (q.is_closed) return 'CLOSED';
  return 'ALL';
}

function fmt(dt?: string) {
  if (!dt) return '—';
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function StudentQuizList() {
  const {
    data: quizzes = [],
    isLoading: loadingQuizzes,
    isError: isQuizError,
    error: quizError,
    refetch: refetchQuizzes,
  } = useStudentQuizzes();

  const {
    data: attempts = [],
    isLoading: loadingAttempts,
  } = useStudentQuizAttempts();

  // UI state
  const [tab, setTab] = useState<Tab>('ALL');
  const [query, setQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');

  const subjects = useMemo(() => {
    const set = new Set<string>();
    quizzes.forEach((q) => {
      if (q.subject_name) set.add(q.subject_name);
    });
    return Array.from(set).sort();
  }, [quizzes]);

  const latestAttemptByQuizId = useMemo(() => {
    const map = new Map<number, StudentQuizAttempt>();
    const sorted = [...attempts].sort((a, b) => {
      const ta = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
      const tb = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
      return tb - ta;
    });
    for (const a of sorted) {
      if (!map.has(a.quiz)) map.set(a.quiz, a);
    }
    return map;
  }, [attempts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    let list = [...quizzes];

    if (tab !== 'ALL') {
      list = list.filter((x) => statusOf(x) === tab);
    }

    if (selectedSubject !== 'ALL') {
      list = list.filter((x) => x.subject_name === selectedSubject);
    }

    if (q) {
      list = list.filter((x) => {
        const hay = `${x.title} ${x.subject_name} ${x.teacher_name}`.toLowerCase();
        return hay.includes(q);
      });
    }

    list.sort((a, b) => {
      const da = new Date(a.close_time || a.open_time).getTime();
      const db = new Date(b.close_time || b.open_time).getTime();
      return da - db;
    });

    return list;
  }, [quizzes, tab, selectedSubject, query]);

  const canTakeQuiz = (quiz: StudentQuiz) => {
    if (!quiz.is_open) return false;
    if (!quiz.allow_multiple_attempts && quiz.user_attempts > 0) return false;
    return true;
  };

  const renderScoreChip = (quiz: StudentQuiz) => {
    const a = latestAttemptByQuizId.get(quiz.id);
    if (!a && quiz.user_attempts === 0) return null;

    if (a?.status === 'SUBMITTED' || a?.requires_manual_grading) {
      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 ring-1 ring-amber-600/20 text-amber-700">
          <Clock size={11} />
          Pending Grading
        </span>
      );
    }

    if (a) {
      const score = a.score;
      const total = a.total ?? a.total_points ?? quiz.total_points;
      const percent =
        a.percentage != null
          ? a.percentage
          : score != null && total
          ? (score / total) * 100
          : null;

      return (
        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 ring-1 ring-emerald-600/20 text-emerald-700">
          <CheckCircle2 size={11} />
          {score == null || total == null ? 'Submitted' : `${score}/${total}`}
          {percent != null && ` (${percent.toFixed(0)}%)`}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 ring-1 ring-emerald-600/20 text-emerald-700">
        <CheckCircle2 size={11} />
        Attempted
      </span>
    );
  };

  if (loadingQuizzes && quizzes.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Loading student activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Assessments
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Assigned Activities
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Take online quizzes, review submitted answers, and track your performance records.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search activity or subject..."
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 shadow-xs outline-none transition-colors hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Filter Tabs & Subject Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">
            <Filter size={13} /> Filter:
          </span>

          {(['ALL', 'OPEN', 'UPCOMING', 'CLOSED'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                tab === t
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Subject Filter Dropdown */}
        {subjects.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <BookOpen size={13} /> Subject:
            </span>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">All Subjects ({quizzes.length})</option>
              {subjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isQuizError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 text-xs font-medium text-rose-700">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <p>{(quizError as Error)?.message || 'Unable to load quizzes.'}</p>
          </div>
          <button
            type="button"
            onClick={() => void refetchQuizzes()}
            className="mt-2 font-semibold underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Quiz List Cards */}
      <div className="grid gap-3">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-200/80 bg-white p-12 text-center shadow-xs">
            <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
            <h3 className="mt-2 text-sm font-semibold text-slate-900">
              {quizzes.length === 0
                ? 'No activities published for your section yet.'
                : 'No activities match your current filter.'}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Check back later or adjust your filter options.
            </p>
          </div>
        ) : (
          filtered.map((quiz) => {
            const s = statusOf(quiz);
            const takeable = canTakeQuiz(quiz);
            const hasAttempt = (quiz.user_attempts && quiz.user_attempts > 0) || latestAttemptByQuizId.has(quiz.id);

            return (
              <div
                key={quiz.id}
                className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-slate-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm font-bold text-slate-900 truncate">
                        {quiz.title}
                      </h2>
                      <span className={badge(s)}>{s}</span>
                      {renderScoreChip(quiz)}
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{quiz.subject_name}</span>
                      <span>•</span>
                      <span>{quiz.teacher_name}</span>
                      <span>•</span>
                      <span className="font-mono">
                        {quiz.question_count} items ({quiz.total_points} pts)
                      </span>
                      <span>•</span>
                      <span className="font-mono">
                        {quiz.time_limit ? `${quiz.time_limit} mins` : 'No limit'}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-500">
                        <Clock size={12} className="text-slate-400" />
                        {quiz.is_upcoming ? `Opens: ${fmt(quiz.open_time)}` : `Closes: ${fmt(quiz.close_time)}`}
                      </span>

                      {quiz.user_attempts > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            Attempts: {quiz.user_attempts}
                            {!quiz.allow_multiple_attempts ? ' (max reached)' : ''}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 self-start sm:self-center flex items-center gap-2 flex-wrap">
                    {/* Review Button if student submitted an attempt */}
                    {hasAttempt && (
                      <Link
                        to={`/student/activities/${quiz.id}/review`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-colors"
                      >
                        <Eye size={13} className="text-slate-500" />
                        Review
                      </Link>
                    )}

                    {takeable ? (
                      <Link
                        to={`/student/activities/${quiz.id}/take`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
                      >
                        <span>{hasAttempt ? 'Retake' : 'Take Quiz'}</span>
                        <ArrowRight size={13} />
                      </Link>
                    ) : quiz.is_upcoming ? (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-100 text-slate-400 text-xs font-medium cursor-not-allowed">
                        Scheduled
                      </span>
                    ) : quiz.is_closed ? (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-100 text-slate-400 text-xs font-medium cursor-not-allowed">
                        Closed
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-100 text-slate-400 text-xs font-medium cursor-not-allowed">
                        Completed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

