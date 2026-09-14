import { createPortal } from "react-dom";
import EditQuizTitleDialog from "./EditQuizTitleDialog";
import DuplicateQuizDialog from "./DuplicateQuizDialog";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import {
  Plus,
  Search,
  ArrowUpDown,
  CalendarClock,
  ClipboardList,
  Layers,
  Settings2,
  Trash2,
  ExternalLink,
  RefreshCw,
  Download,
} from "lucide-react";

import {
  useDeleteTeacherQuiz,
  useTeacherQuizzes,
} from "../../../hooks/useTeacherSubjects";

import type { TeacherQuiz } from "../../../types/teacherTypes";

type SortKey =
  | "status"
  | "open_desc"
  | "open_asc"
  | "title"
  | "subject";

function fmtDT(iso: string | null | undefined) {
  if (!iso) return "—";

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusRank(quiz: TeacherQuiz) {
  if (quiz.is_open) return 0;
  if (quiz.is_upcoming) return 1;
  if (quiz.is_closed) return 2;

  return 3;
}

function statusChip(quiz: TeacherQuiz) {
  const base =
    "inline-flex items-center gap-2 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wider";

  if (quiz.is_open) {
    return (
      <span
        className={`${base} bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200`}
      >
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Open
      </span>
    );
  }

  if (quiz.is_upcoming) {
    return (
      <span
        className={`${base} bg-amber-50 text-amber-700 ring-1 ring-amber-200`}
      >
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        Upcoming
      </span>
    );
  }

  if (quiz.is_closed) {
    return (
      <span
        className={`${base} bg-slate-50 text-slate-600 ring-1 ring-slate-200`}
      >
        <span className="h-2 w-2 rounded-full bg-slate-400" />
        Closed
      </span>
    );
  }

  return (
    <span
      className={`${base} bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200`}
    >
      <span className="h-2 w-2 rounded-full bg-indigo-500" />

      {quiz.status || "Status"}
    </span>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint: string;
}) {
  return (
    <div className="activity-stat relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="p-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="activity-stat-label text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
              {label}
            </div>

            <div className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              {value}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              {hint}
            </div>
          </div>

          <div className="h-9 w-9 shrink-0 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700">
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuizActions({ quiz, deleting, onEdit, onDuplicate, onDelete }: {
  quiz: { id: number; title: string }; deleting: boolean;
  onEdit: () => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, maxHeight: 240 });
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const close = () => { setOpen(false); trigger.current?.focus(); };
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const anchor = trigger.current?.getBoundingClientRect();
      if (!anchor) return;
      const height = window.innerHeight;
      const below = height - anchor.bottom - 12;
      const above = anchor.top - 12;
      const useBelow = below >= 200 || below >= above;
      const maxHeight = Math.max(60, Math.min(240, useBelow ? below : above));
      const actualHeight = Math.min(menu.current?.scrollHeight ?? 200, maxHeight);
      setPosition({
        top: useBelow ? anchor.bottom + 6 : Math.max(6, anchor.top - actualHeight - 6),
        left: Math.max(8, Math.min(anchor.right - 184, window.innerWidth - 192)),
        maxHeight,
      });
    };
    place();
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menu.current?.contains(target) && !trigger.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);
  const itemClass = 'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none';
  return <>
    <button ref={trigger} type="button" aria-haspopup="menu" aria-expanded={open}
      aria-controls={open ? menuId : undefined} aria-label={`Actions for ${quiz.title}`}
      onClick={() => setOpen(value => !value)}
      onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); } }}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
      Actions <span aria-hidden="true">▾</span>
    </button>
    {open && createPortal(<div ref={menu} id={menuId} role="menu" aria-label={`Actions for ${quiz.title}`}
      style={{ position: 'fixed', top: position.top, left: position.left, maxHeight: position.maxHeight, width: 184, zIndex: 1000 }}
      className="overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null) && event.relatedTarget !== trigger.current) setOpen(false); }}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); close(); return; }
        if (event.key === 'Tab') { close(); return; }
        const items = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? []);
        const current = items.indexOf(document.activeElement as HTMLElement);
        let next = current;
        if (event.key === 'ArrowDown') next = (current + 1) % items.length;
        else if (event.key === 'ArrowUp') next = (current - 1 + items.length) % items.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = items.length - 1;
        else return;
        event.preventDefault(); items[next]?.focus();
      }}>
      <Link role="menuitem" tabIndex={-1} to={`/teacher/activities/${quiz.id}`} onClick={close} className={itemClass}><ExternalLink size={15} />Manage</Link>
      <button role="menuitem" tabIndex={-1} type="button" onClick={() => { close(); onEdit(); }} className={itemClass}>Edit title</button>
      <button role="menuitem" tabIndex={-1} type="button" onClick={() => { close(); onDuplicate(); }} className={itemClass}>Duplicate</button>
      <div className="my-1 border-t border-slate-100" />
      <button role="menuitem" tabIndex={-1} type="button" disabled={deleting} onClick={() => { close(); onDelete(); }}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50 focus:bg-rose-50 focus:outline-none disabled:opacity-50">
        <Trash2 size={15} />{deleting ? 'Deleting…' : 'Delete'}
      </button>
    </div>, document.body)}
  </>;
}

export default function TeacherQuizList() {
  const [editingTitle, setEditingTitle] = useState<{ id: number; title: string } | null>(null);
  const [duplicateQuiz, setDuplicateQuiz] = useState<{ id: number; title: string } | null>(null);
  // UI state
  const [query, setQuery] = useState("");

  const [sort, setSort] =
    useState<SortKey>("status");

  // Server state
  const {
    data: quizzes = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useTeacherQuizzes();

  useEffect(() => {
    let pending = false;
    const refresh = async () => {
      if (pending || document.hidden) return;
      pending = true;
      try { await refetch(); } finally { pending = false; }
    };
    const timer = window.setInterval(() => void refresh(), 5000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [refetch]);

  const pageRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const measure = () => {
      const element = pageRef.current;
      if (element) {
        element.style.setProperty("--activity-top", `${Math.max(0, element.getBoundingClientRect().top)}px`);
      }
    };
    measure();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, [isLoading, isError]);

  const deleteQuiz = useDeleteTeacherQuiz();

  const handleDelete = (quizId: number) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this quiz?"
    );

    if (!confirmed) return;

    deleteQuiz.mutate(quizId, {
      onError: (error) => {
        console.error(
          "Error deleting quiz:",
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : "Failed to delete quiz."
        );
      },
    });
  };

  const stats = useMemo(() => {
    const open = quizzes.filter(
      (quiz) => quiz.is_open
    ).length;

    const upcoming = quizzes.filter(
      (quiz) => quiz.is_upcoming
    ).length;

    const closed = quizzes.filter(
      (quiz) => quiz.is_closed
    ).length;

    return {
      total: quizzes.length,
      open,
      upcoming,
      closed,
    };
  }, [quizzes]);

  const visibleQuizzes = useMemo(() => {
    const needle =
      query.trim().toLowerCase();

    const filtered = quizzes.filter(
      (quiz) => {
        if (!needle) return true;

        return (
          quiz.title
            ?.toLowerCase()
            .includes(needle) ||
          quiz.subject_name
            ?.toLowerCase()
            .includes(needle) ||
          quiz.quiz_id
            ?.toLowerCase()
            .includes(needle)
        );
      }
    );

    return [...filtered].sort((a, b) => {
      if (sort === "status") {
        const rankA = statusRank(a);
        const rankB = statusRank(b);

        if (rankA !== rankB) {
          return rankA - rankB;
        }

        return (
          new Date(b.open_time).getTime() -
          new Date(a.open_time).getTime()
        );
      }

      if (sort === "open_desc") {
        return (
          new Date(b.open_time).getTime() -
          new Date(a.open_time).getTime()
        );
      }

      if (sort === "open_asc") {
        return (
          new Date(a.open_time).getTime() -
          new Date(b.open_time).getTime()
        );
      }

      if (sort === "title") {
        return a.title.localeCompare(b.title);
      }

      if (sort === "subject") {
        return a.subject_name.localeCompare(
          b.subject_name
        );
      }

      return 0;
    });
  }, [quizzes, query, sort]);

  if (isLoading) {
    return (
      <main className="min-h-[70vh] bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-10">
          <div className="h-8 w-64 rounded-2xl bg-slate-200/80 animate-pulse" />

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-28 rounded-3xl border border-slate-200 bg-white animate-pulse"
                />
              )
            )}
          </div>

          <div className="mt-6 h-14 rounded-3xl border border-slate-200 bg-white animate-pulse" />

          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-20 rounded-3xl border border-slate-200 bg-white animate-pulse"
                />
              )
            )}
          </div>
        </div>
        {duplicateQuiz && <DuplicateQuizDialog key={duplicateQuiz.id} quiz={duplicateQuiz} onClose={() => setDuplicateQuiz(null)} onCreated={() => { void refetch(); }} />}
      {editingTitle && <EditQuizTitleDialog key={editingTitle.id} quiz={editingTitle} onClose={() => setEditingTitle(null)} onSaved={() => { void refetch(); }} />}
    </main>
    );
  }

  if (isError) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center">
          <h1 className="font-black text-rose-800">
            Unable to load activities
          </h1>

          <p className="mt-2 text-sm text-rose-600">
            {error instanceof Error
              ? error.message
              : "Something went wrong while loading your quizzes."}
          </p>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="mt-5 rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {isFetching
              ? "Retrying..."
              : "Try again"}
          </button>
        </div>
        {duplicateQuiz && <DuplicateQuizDialog key={duplicateQuiz.id} quiz={duplicateQuiz} onClose={() => setDuplicateQuiz(null)} onCreated={() => { void refetch(); }} />}
      {editingTitle && <EditQuizTitleDialog key={editingTitle.id} quiz={editingTitle} onClose={() => setEditingTitle(null)} onSaved={() => { void refetch(); }} />}
    </main>
    );
  }

  return (
    <main ref={pageRef} className="teacher-activity-page bg-slate-50">
      <style>{`
        .teacher-activity-page { width: 100%; min-width: 0; }
        .teacher-activity-page, .teacher-activity-page * { box-sizing: border-box; }
        .teacher-activity-page .activity-header { flex-shrink: 0; }
        .teacher-activity-page .activity-header-inner { padding: 12px 16px; }
        .teacher-activity-page .activity-filters { margin-top: 10px; gap: 8px; }
        .teacher-activity-page .activity-filters input { padding-top: 8px; padding-bottom: 8px; font-size: 13px; }
        .teacher-activity-page .activity-sort { min-width: 0; padding: 8px 10px; }
        .teacher-activity-page .activity-sort select { min-width: 0; max-width: 100%; font-size: 12px; }
        .teacher-activity-page .activity-content { display: flex; flex-direction: column; gap: 12px; min-height: 0; padding: 12px 16px; }
        .teacher-activity-page .activity-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; flex-shrink: 0; }
        .teacher-activity-page .activity-list { display: flex; flex-direction: column; min-height: 0; border-radius: 16px; }
        .teacher-activity-page .activity-list-heading { flex-shrink: 0; padding: 10px 14px; }
        .teacher-activity-page .activity-list-heading .activity-list-title { margin-top: 2px; font-size: 18px; line-height: 1.3; }
        .teacher-activity-page .activity-list-heading .activity-list-description { margin-top: 3px; font-size: 12px; }
        .teacher-activity-page .activity-rows { min-height: 0; }
        .teacher-activity-page .activity-row { padding: 12px 14px; }
        .teacher-activity-page .activity-row-layout { gap: 12px; }
        .teacher-activity-page .activity-row-title { font-size: 15px; line-height: 1.4; overflow-wrap: anywhere; }
        .teacher-activity-page .activity-row-subject { margin-top: 4px; font-size: 12px; overflow-wrap: anywhere; }
        .teacher-activity-page .activity-row-details { display: flex; flex-wrap: wrap; gap: 8px 18px; margin-top: 8px; }
        .teacher-activity-page .activity-row-details > div { border: 0; border-radius: 0; padding: 0; }
        .teacher-activity-page .activity-row-details > div > div:last-child { margin-top: 2px; }
        .teacher-activity-page .activity-row-actions { flex-shrink: 0; }
        .teacher-activity-page .activity-row-actions a,
        .teacher-activity-page .activity-row-actions button { padding: 7px 10px; font-size: 12px; border-radius: 9px; }
        .teacher-activity-page .activity-list-footer { flex-shrink: 0; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 4px 12px; border-top: 1px solid #e2e8f0; padding: 8px 14px; font-size: 12px; color: #64748b; background: #f8fafc; }
        @media (min-width: 768px) {
          .teacher-activity-page .activity-stats { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        }
        @media (min-width: 1024px) and (min-height: 600px) {
          .teacher-activity-page { display: flex; flex-direction: column; height: calc(100dvh - var(--activity-top, 80px) - 16px); overflow: hidden; }
          .teacher-activity-page .activity-content, .teacher-activity-page .activity-list { flex: 1; }
          .teacher-activity-page .activity-rows, .teacher-activity-page .activity-empty { flex: 1; overflow-y: auto; scrollbar-gutter: stable; overscroll-behavior: contain; }
        }
        @media (max-width: 639px) {
          .teacher-activity-page .activity-header-inner, .teacher-activity-page .activity-content { padding: 10px; }
          .teacher-activity-page .activity-stat .activity-stat-label { letter-spacing: normal; }
        }
      `}</style>
      {/* Header */}
      <div className="activity-header border-b border-slate-200 bg-slate-50">
        <div className="activity-header-inner">
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                Teacher
              </div>

              <h1 className="truncate text-xl md:text-2xl font-black tracking-tight text-slate-900">
                My Activities
              </h1>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="hidden sm:inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={
                    isFetching
                      ? "animate-spin"
                      : ""
                  }
                />

                {isFetching
                  ? "Refreshing"
                  : "Refresh"}
              </button>

              <Link
                to="/teacher/activities/create"
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-800 transition"
              >
                <Plus size={16} />

                Create Activity
              </Link>
            </div>
          </div>

          {/* Search + sort */}
          <div className="activity-filters flex flex-col sm:flex-row sm:items-center">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />

              <input
                value={query}
                onChange={(e) =>
                  setQuery(e.target.value)
                }
                aria-label="Search activities"
                placeholder="Search by title, subject, or quiz ID…"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="activity-sort inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white">
                <ArrowUpDown
                  size={18}
                  className="text-slate-500"
                />

                <select
                  aria-label="Sort activities"
                  value={sort}
                  onChange={(e) =>
                    setSort(
                      e.target.value as SortKey
                    )
                  }
                  className="text-sm font-black text-slate-700 outline-none bg-transparent"
                >
                  <option value="status">
                    Status (Open → Upcoming → Closed)
                  </option>

                  <option value="open_desc">
                    Open time (Newest)
                  </option>

                  <option value="open_asc">
                    Open time (Oldest)
                  </option>

                  <option value="title">
                    Title (A–Z)
                  </option>

                  <option value="subject">
                    Subject (A–Z)
                  </option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="sm:hidden inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={
                    isFetching
                      ? "animate-spin"
                      : ""
                  }
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="activity-content">
        {/* Stats */}
        <div className="activity-stats">
          <StatCard
            icon={<Layers size={18} />}
            label="Total"
            value={stats.total}
            hint="All activities"
          />

          <StatCard
            icon={
              <CalendarClock size={18} />
            }
            label="Open"
            value={stats.open}
            hint="Available now"
          />

          <StatCard
            icon={
              <ClipboardList size={18} />
            }
            label="Upcoming"
            value={stats.upcoming}
            hint="Scheduled"
          />

          <StatCard
            icon={<Download size={18} />}
            label="Closed"
            value={stats.closed}
            hint="Ended / locked"
          />
        </div>

        {/* Activity list */}
        <div className="activity-list border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="activity-list-heading border-b border-slate-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Activities
                </div>

                <div className="activity-list-title font-black text-slate-900">
                  Quiz List
                </div>

                <div className="activity-list-description text-slate-600">
                  Manage your quizzes,
                  schedules, and questions.
                </div>
              </div>

              <div className="hidden md:flex">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-black text-slate-700">
                  <Settings2 size={16} />

                  {visibleQuizzes.length} shown
                </div>
              </div>
            </div>
          </div>

          {visibleQuizzes.length === 0 ? (
            <div className="activity-empty p-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <div className="font-black text-slate-900">
                  No activities found
                </div>

                <div className="mt-1 text-sm text-slate-600">
                  {quizzes.length === 0
                    ? "No quizzes yet. Create your first activity!"
                    : "Try a different search keyword or sorting option."}
                </div>

                <Link
                  to="/teacher/activities/create"
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-600"
                >
                  <Plus size={16} />

                  Create Activity
                </Link>
              </div>
            </div>
          ) : (
            <div className="activity-rows divide-y divide-slate-100">
              {visibleQuizzes.map(
                (quiz) => {
                  const isDeleting =
                    deleteQuiz.isPending &&
                    deleteQuiz.variables ===
                      quiz.id;

                  return (
                    <div
                      key={quiz.id}
                      className="activity-row hover:bg-slate-50 transition"
                    >
                      <div className="activity-row-layout flex flex-col md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="activity-row-title font-black text-slate-900">
                              {quiz.title}
                            </div>

                            {statusChip(quiz)}
                          </div>

                          <div className="activity-row-subject text-slate-600">
                            Subject:{" "}
                            <span className="font-bold text-slate-800">
                              {
                                quiz.subject_name
                              }
                            </span>
                          </div>

                          <div className="activity-row-details text-xs text-slate-600">
                            <div className="rounded-2xl border border-slate-200 px-3 py-2">
                              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Opens
                              </div>

                              <div className="mt-1 font-bold text-slate-800">
                                {fmtDT(
                                  quiz.open_time
                                )}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 px-3 py-2">
                              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Closes
                              </div>

                              <div className="mt-1 font-bold text-slate-800">
                                {fmtDT(
                                  quiz.close_time
                                )}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 px-3 py-2">
                              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Questions
                              </div>

                              <div className="mt-1 font-bold text-slate-800">
                                {
                                  quiz.question_count
                                }
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="activity-row-actions">
                          <QuizActions quiz={quiz} deleting={isDeleting}
                            onEdit={() => setEditingTitle({ id: quiz.id, title: quiz.title })}
                            onDuplicate={() => setDuplicateQuiz({ id: quiz.id, title: quiz.title })}
                            onDelete={() => handleDelete(quiz.id)} />
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
          <div className="activity-list-footer">
            <span>{visibleQuizzes.length} of {quizzes.length} activities</span>
            <span>Sorted by {sort === "status" ? "status" : sort === "title" ? "title" : sort === "subject" ? "subject" : "opening time"}</span>
          </div>
        </div>
      </div>
      {duplicateQuiz && <DuplicateQuizDialog key={duplicateQuiz.id} quiz={duplicateQuiz} onClose={() => setDuplicateQuiz(null)} onCreated={() => { void refetch(); }} />}
      {editingTitle && <EditQuizTitleDialog key={editingTitle.id} quiz={editingTitle} onClose={() => setEditingTitle(null)} onSaved={() => { void refetch(); }} />}
    </main>
  );
}