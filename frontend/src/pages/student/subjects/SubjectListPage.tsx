import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ChevronRight,
  GraduationCap,
  User,
  Users,
  CalendarDays,
  DoorOpen,
  BookOpen,
} from 'lucide-react';

import { useStudentSubjects } from '../../../hooks/useStudentSubjects';

type FilterKey = 'ALL' | 'PASSING' | 'NEEDS' | 'NOGRADE';

function safeNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function badgeMeta(grade: number | null) {
  if (grade === null) {
    return {
      label: 'No Grade',
      pill: 'bg-slate-50 text-slate-500 ring-1 ring-slate-200',
    };
  }
  if (grade >= 75) {
    return {
      label: 'Passing',
      pill: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
    };
  }
  return {
    label: 'Needs Attention',
    pill: 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20',
  };
}

export default function SubjectsPage() {
  const {
    data: offerings = [],
    isLoading,
    error,
  } = useStudentSubjects();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('ALL');

  const cards = useMemo(() => {
    const normalizedQ = query.trim().toLowerCase();

    const mapped = offerings.map((o) => {
      const grade = typeof o.average === 'number' ? Math.round(o.average) : null;
      const progress = clamp(safeNumber(o.progress, 0));
      const meta = badgeMeta(grade);
      const teacher = (o.teacher_name ?? '—').trim();

      return {
        ...o,
        grade,
        progress,
        teacher,
        statusLabel: meta.label,
        statusPill: meta.pill,
      };
    });

    const filteredBySearch = normalizedQ
      ? mapped.filter((x) => {
          const hay = `${x.subject_name} ${x.teacher}`.toLowerCase();
          return hay.includes(normalizedQ);
        })
      : mapped;

    const filteredByChip =
      filter === 'ALL'
        ? filteredBySearch
        : filter === 'PASSING'
        ? filteredBySearch.filter((x) => x.grade !== null && x.grade >= 75)
        : filter === 'NEEDS'
        ? filteredBySearch.filter((x) => x.grade !== null && x.grade < 75)
        : filteredBySearch.filter((x) => x.grade === null);

    filteredByChip.sort((a, b) => {
      const ga = a.grade ?? -1;
      const gb = b.grade ?? -1;
      if (gb !== ga) return gb - ga;
      return a.subject_name.localeCompare(b.subject_name);
    });

    const counts = {
      ALL: filteredBySearch.length,
      PASSING: filteredBySearch.filter((x) => x.grade !== null && x.grade >= 75).length,
      NEEDS: filteredBySearch.filter((x) => x.grade !== null && x.grade < 75).length,
      NOGRADE: filteredBySearch.filter((x) => x.grade === null).length,
    };

    return { list: filteredByChip, counts };
  }, [offerings, query, filter]);

  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Loading enrolled subjects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-6 text-center">
        <h3 className="text-sm font-semibold text-rose-900">Failed to load subjects</h3>
        <p className="mt-1 text-xs text-rose-600">Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Curriculum
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            My Enrolled Subjects
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Access learning modules, submit activities, and track your semester marks.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subject or teacher..."
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-8 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 shadow-xs outline-none transition-colors hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { key: 'ALL', label: 'All', count: cards.counts.ALL },
              { key: 'PASSING', label: 'Passing', count: cards.counts.PASSING },
              { key: 'NEEDS', label: 'Needs Attention', count: cards.counts.NEEDS },
              { key: 'NOGRADE', label: 'No Grade', count: cards.counts.NOGRADE },
            ] as const
          ).map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setFilter(chip.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                filter === chip.key
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{chip.label}</span>
              <span
                className={`font-mono text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                  filter === chip.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {chip.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Subject Cards Grid */}
      {cards.list.length === 0 ? (
        <div className="rounded-xl border border-slate-200/80 bg-white p-12 text-center shadow-xs">
          <GraduationCap className="mx-auto h-10 w-10 text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-700">No subject offerings found</p>
          <p className="text-xs text-slate-400 mt-1">Try clearing your search query or changing filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.list.map((subject) => {
            return (
              <Link
                to={`/student/subject-offering/${subject.id}`}
                key={subject.id}
                className="group flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-indigo-300 hover:shadow-sm"
              >
                <div>
                  {/* Top: Initial Icon + Status Pill */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold text-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <BookOpen size={18} />
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${subject.statusPill}`}>
                      {subject.statusLabel}
                    </span>
                  </div>

                  {/* Subject Name & Teacher */}
                  <div className="mt-3">
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {subject.subject_name}
                    </h3>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                      <User size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{subject.teacher}</span>
                    </div>
                  </div>

                  {/* Grade Metric Panel */}
                  <div className="mt-4 rounded-lg bg-slate-50 p-3 border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Average
                      </span>
                      <span className="font-mono text-lg font-bold text-slate-900">
                        {subject.grade !== null ? `${subject.grade}%` : '—'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Progress
                      </span>
                      <span className="font-mono text-xs font-semibold text-slate-700">
                        {subject.progress}%
                      </span>
                    </div>
                  </div>

                  {/* Class Info Pills */}
                  <div className="mt-3 grid grid-cols-3 gap-1.5 pt-2 text-[11px] text-slate-600">
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                        <Users size={11} /> Sec
                      </span>
                      <div className="truncate font-semibold text-slate-700">
                        {subject.section_name || 'N/A'}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                        <CalendarDays size={11} /> Sched
                      </span>
                      <div className="truncate font-semibold text-slate-700">
                        {subject.schedule || 'N/A'}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                        <DoorOpen size={11} /> Room
                      </span>
                      <div className="truncate font-semibold text-slate-700">
                        {subject.room_number || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500 group-hover:text-indigo-600 transition-colors">
                  <span>Enter workspace</span>
                  <ChevronRight
                    size={14}
                    className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
