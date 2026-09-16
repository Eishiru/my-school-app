import {useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  ChevronRight,
  GraduationCap,
  User,
  AlertTriangle,
  CheckCircle2,
  MinusCircle,
  Users,
  CalendarDays,
  DoorOpen,
} from "lucide-react";

import { useStudentSubjects } from "../../../hooks/useStudentSubjects";



type FilterKey = "ALL" | "PASSING" | "NEEDS" | "NOGRADE";

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
      label: "No Grade",
      Icon: MinusCircle,
      pill: "bg-slate-50 text-slate-600 border-slate-200",
      ring: "bg-slate-200",
    };
  }
  if (grade >= 75) {
    return {
      label: "Passing",
      Icon: CheckCircle2,
      pill: "bg-emerald-50 text-emerald-700 border-emerald-100",
      ring: "bg-emerald-500",
    };
  }
  return {
    label: "Needs Attention",
    Icon: AlertTriangle,
    pill: "bg-rose-50 text-rose-700 border-rose-100",
    ring: "bg-rose-500",
  };
}

export default function SubjectsPage() {
  const {
    data: offerings = [],
    isLoading,
    error,
  } = useStudentSubjects();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("ALL");


  

  
  const cards = useMemo(() => {
    const normalizedQ = query.trim().toLowerCase();

    const mapped = offerings.map((o) => {
      const grade = typeof o.average === "number" ? Math.round(o.average) : null;
      const progress = clamp(safeNumber(o.progress, 0)); // keep your current meaning
      const meta = badgeMeta(grade);

      const teacher = (o.teacher_name ?? "—").trim();

      return {
        ...o,
        grade,
        progress,
        teacher,
        statusLabel: meta.label,
        statusPill: meta.pill,
        StatusIcon: meta.Icon,
        ringColor: meta.ring,
      };
    });

    const filteredBySearch = normalizedQ
      ? mapped.filter((x) => {
          const hay = `${x.subject_name} ${x.teacher}`.toLowerCase();
          return hay.includes(normalizedQ);
        })
      : mapped;

    const filteredByChip =
      filter === "ALL"
        ? filteredBySearch
        : filter === "PASSING"
        ? filteredBySearch.filter((x) => x.grade !== null && x.grade >= 75)
        : filter === "NEEDS"
        ? filteredBySearch.filter((x) => x.grade !== null && x.grade < 75)
        : filteredBySearch.filter((x) => x.grade === null);

    // optional: sort by grade desc, then name
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
      <main className="p-6">
        <h1 className="text-3xl font-black tracking-tight">Subjects</h1>
        <p className="text-slate-500 text-sm mt-2">Loading from backend…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6">
        <h1 className="text-3xl font-black tracking-tight">Subjects</h1>
        <p className="text-rose-600 text-sm font-bold mt-2">Failed to load subjects.</p>
      </main>
    );
  }

  return (
    <main className="sm:pt-4 md:p-6 mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="inline-flex px-2.5 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-lg">
            Enrolled Classes
          </span>
          <h1 className="mt-2 text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
            My Subjects
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            View your classes, grades, learning materials, and course activities.
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subject or teacher..."
            className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-10 py-2.5 text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 font-bold text-sm"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { key: "ALL", label: "All", count: cards.counts.ALL },
              { key: "PASSING", label: "Passing", count: cards.counts.PASSING },
              { key: "NEEDS", label: "Needs Attention", count: cards.counts.NEEDS },
              { key: "NOGRADE", label: "No Grade", count: cards.counts.NOGRADE },
            ] as const
          ).map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setFilter(chip.key)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition shrink-0 ${
                filter === chip.key
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>{chip.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  filter === chip.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {chip.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {cards.list.length === 0 ? (
        <div className="bg-white p-10 rounded-3xl border border-slate-200 text-center text-slate-500 shadow-xs">
          <GraduationCap className="mx-auto h-10 w-10 text-slate-300 mb-2" />
          <p className="font-bold text-slate-700">No subject offerings found</p>
          <p className="text-xs text-slate-400 mt-1">Try clearing your search query or changing filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {cards.list.map((subject) => {
            return (
              <Link
                to={`/student/subject-offering/${subject.id}`}
                key={subject.id}
                className="group"
              >
                <div className="h-full rounded-3xl p-5 border border-slate-200 bg-white shadow-xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col justify-between overflow-hidden">
                  <div>
                    {/* Top: Subject + Grade Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-lg font-black text-slate-900 truncate group-hover:text-indigo-700 transition-colors">
                          {subject.subject_name}
                        </div>
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                          <User size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate font-semibold">{subject.teacher}</span>
                        </div>
                      </div>
                      <span className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${subject.statusPill}`}>
                        {subject.statusLabel}
                      </span>
                    </div>

                    {/* Grade & Progress */}
                    <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Current Grade
                        </span>
                        <span className="text-xl font-black text-slate-900">
                          {subject.grade !== null ? `${subject.grade}%` : "—"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Progress
                        </span>
                        <span className="text-sm font-bold text-slate-700">
                          {subject.progress}%
                        </span>
                      </div>
                    </div>

                    {/* Subject Details */}
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                          <Users size={12} />
                          Section
                        </div>
                        <div className="mt-0.5 text-xs font-bold text-slate-700 truncate">
                          {subject.section_name || "N/A"}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                          <CalendarDays size={12} />
                          Schedule
                        </div>
                        <div className="mt-0.5 text-xs font-bold text-slate-700 truncate">
                          {subject.schedule || "N/A"}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                          <DoorOpen size={12} />
                          Room
                        </div>
                        <div className="mt-0.5 text-xs font-bold text-slate-700 truncate">
                          {subject.room_number || "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 group-hover:text-indigo-600 transition-colors">
                      Open workspace
                    </span>
                    <ChevronRight
                      size={16}
                      className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all"
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
