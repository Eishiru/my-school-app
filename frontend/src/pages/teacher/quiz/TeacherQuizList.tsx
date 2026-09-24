import EditQuizTitleDialog from "./EditQuizTitleDialog";
import DuplicateQuizDialog from "./DuplicateQuizDialog";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  Plus,
  Search,
  ArrowUpDown,
  Filter,
  CalendarClock,
  ClipboardList,
  Layers,
  Settings2,
  Trash2,
  ExternalLink,
  RefreshCw,
  Download,
  MoreVertical,
  Edit3,
  Copy,
  Clock,
  BookOpen,
} from "lucide-react";

import {
  useDeleteTeacherQuiz,
  useTeacherQuizzes,
  useTeacherSubjects,
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
  if (quiz.is_open) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Open
      </span>
    );
  }

  if (quiz.is_upcoming) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Upcoming
      </span>
    );
  }

  if (quiz.is_closed) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        Closed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
      {quiz.status || "Status"}
    </span>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  accent = "bg-indigo-50 text-indigo-600 border-indigo-100",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm hover:border-indigo-200 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
            {label}
          </span>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 font-mono">
            {value}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">{hint}</p>
        </div>
        <div className={`p-2.5 rounded-xl border ${accent}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function QuizActions({
  quiz,
  deleting,
  isOpen,
  isBottom,
  onToggle,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  quiz: { id: number; title: string };
  deleting: boolean;
  isOpen: boolean;
  isBottom: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="relative inline-block text-left" data-quiz-menu={quiz.id}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`p-1.5 rounded-lg border transition-colors ${
          isOpen
            ? "border-slate-300 bg-slate-100 text-slate-800 shadow-inner"
            : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100"
        }`}
        aria-label={`Actions for ${quiz.title}`}
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100 ${
            isBottom
              ? "bottom-full mb-1.5 origin-bottom-right"
              : "top-full mt-1.5 origin-top-right"
          }`}
        >
          <Link
            to={`/teacher/activities/${quiz.id}`}
            onClick={onToggle}
            className="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium transition-colors"
          >
            <ExternalLink size={14} className="text-indigo-600 shrink-0" />
            <span>Manage Activity</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              onToggle();
              onEdit();
            }}
            className="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium transition-colors"
          >
            <Edit3 size={14} className="text-slate-600 shrink-0" />
            <span>Edit Title</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onToggle();
              onDuplicate();
            }}
            className="w-full text-left px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 font-medium transition-colors"
          >
            <Copy size={14} className="text-slate-600 shrink-0" />
            <span>Duplicate</span>
          </button>

          <div className="my-1 border-t border-slate-100" />

          <button
            type="button"
            disabled={deleting}
            onClick={() => {
              onToggle();
              onDelete();
            }}
            className="w-full text-left px-3.5 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 font-medium transition-colors disabled:opacity-50"
          >
            <Trash2 size={14} className="text-rose-600 shrink-0" />
            <span>{deleting ? "Deleting…" : "Delete Activity"}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function TeacherQuizList() {
  const [editingTitle, setEditingTitle] = useState<{ id: number; title: string } | null>(null);
  const [duplicateQuiz, setDuplicateQuiz] = useState<{ id: number; title: string } | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // UI state
  const [query, setQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");

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

  const { data: teacherSubjects = [] } = useTeacherSubjects();

  useEffect(() => {
    if (openMenuId === null) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-quiz-menu]")) {
        setOpenMenuId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenuId(null);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuId]);

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
        if (selectedSubject !== "ALL") {
          const matchId =
            quiz.SubjectOffering !== undefined &&
            String(quiz.SubjectOffering) === selectedSubject;
          const matchName =
            quiz.subject_name?.toLowerCase() === selectedSubject.toLowerCase();
          if (!matchId && !matchName) return false;
        }

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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-7 w-48 rounded-lg bg-slate-200 animate-pulse" />
            <div className="h-4 w-72 rounded-lg bg-slate-100 animate-pulse" />
          </div>
          <div className="h-9 w-32 rounded-lg bg-slate-200 animate-pulse" />
        </div>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-24 rounded-xl border border-slate-200/80 bg-white animate-pulse"
            />
          ))}
        </div>

        <div className="h-11 rounded-xl border border-slate-200/80 bg-white animate-pulse" />

        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-20 rounded-xl border border-slate-200/80 bg-white animate-pulse"
            />
          ))}
        </div>
        {duplicateQuiz && (
          <DuplicateQuizDialog
            key={duplicateQuiz.id}
            quiz={duplicateQuiz}
            onClose={() => setDuplicateQuiz(null)}
            onCreated={() => {
              void refetch();
            }}
          />
        )}
        {editingTitle && (
          <EditQuizTitleDialog
            key={editingTitle.id}
            quiz={editingTitle}
            onClose={() => setEditingTitle(null)}
            onSaved={() => {
              void refetch();
            }}
          />
        )}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-8 text-center max-w-xl mx-auto">
          <h2 className="text-base font-semibold text-rose-800">
            Unable to load activities
          </h2>

          <p className="mt-1.5 text-xs text-rose-600">
            {error instanceof Error
              ? error.message
              : "Something went wrong while loading your quizzes."}
          </p>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
          >
            {isFetching ? "Retrying..." : "Try again"}
          </button>
        </div>
        {duplicateQuiz && (
          <DuplicateQuizDialog
            key={duplicateQuiz.id}
            quiz={duplicateQuiz}
            onClose={() => setDuplicateQuiz(null)}
            onCreated={() => {
              void refetch();
            }}
          />
        )}
        {editingTitle && (
          <EditQuizTitleDialog
            key={editingTitle.id}
            quiz={editingTitle}
            onClose={() => setEditingTitle(null)}
            onSaved={() => {
              void refetch();
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Activity Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Create, schedule, monitor and manage quiz assessments across your subjects.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw
              size={14}
              className={isFetching ? "animate-spin text-indigo-600" : "text-slate-500"}
            />
            <span>{isFetching ? "Refreshing..." : "Refresh"}</span>
          </button> */}

          <Link
            to="/teacher/activities/create"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
          >
            <Plus size={15} />
            <span>Create Activity</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Layers size={18} />}
          label="Total Activities"
          value={stats.total}
          hint="All created quizzes"
          accent="bg-indigo-50 text-indigo-600 border-indigo-100/80"
        />
        <StatCard
          icon={<CalendarClock size={18} />}
          label="Active & Open"
          value={stats.open}
          hint="Available for students"
          accent="bg-emerald-50 text-emerald-600 border-emerald-100/80"
        />
        <StatCard
          icon={<ClipboardList size={18} />}
          label="Upcoming"
          value={stats.upcoming}
          hint="Scheduled for later"
          accent="bg-amber-50 text-amber-600 border-amber-100/80"
        />
        <StatCard
          icon={<Clock size={18} />}
          label="Closed"
          value={stats.closed}
          hint="Ended / locked"
          accent="bg-slate-100 text-slate-600 border-slate-200/80"
        />
      </div>

      {/* Search & Sort Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search activities"
            placeholder="Search by title, subject, or quiz ID..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200/80 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Subject Filter Dropdown */}
          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 shadow-xs">
            <Filter size={14} className="text-slate-400" />
            <span className="text-xs font-medium text-slate-500">Subject:</span>
            <select
              aria-label="Filter activities by subject"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-transparent outline-none cursor-pointer max-w-[160px] truncate"
            >
              <option value="ALL">All Subjects</option>
              {teacherSubjects.map((sub) => (
                <option key={sub.id} value={String(sub.id)}>
                  {sub.name} {sub.section ? `(${sub.section})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 shadow-xs">
            <ArrowUpDown size={14} className="text-slate-400" />
            <span className="text-xs font-medium text-slate-500">Sort:</span>
            <select
              aria-label="Sort activities"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="text-xs font-semibold text-slate-700 bg-transparent outline-none cursor-pointer"
            >
              <option value="status">Status (Open → Upcoming → Closed)</option>
              <option value="open_desc">Open Time (Newest First)</option>
              <option value="open_asc">Open Time (Oldest First)</option>
              <option value="title">Title (A–Z)</option>
              <option value="subject">Subject (A–Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activities Table/List Container */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs relative">
        <div className="rounded-t-xl border-b border-slate-100 px-5 py-4 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              Activities & Assessments
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {visibleQuizzes.length} of {quizzes.length} total quizzes
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Settings2 size={14} className="text-slate-400" />
            <span>{visibleQuizzes.length} shown</span>
          </div>
        </div>

        {visibleQuizzes.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <ClipboardList size={22} />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">
              No activities found
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              {quizzes.length === 0
                ? "You have not created any quizzes yet. Click below to create your first activity."
                : "No quizzes match your current search and filter criteria."}
            </p>
            {quizzes.length === 0 && (
              <div className="mt-4">
                <Link
                  to="/teacher/activities/create"
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
                >
                  <Plus size={14} />
                  <span>Create Activity</span>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleQuizzes.map((quiz, index) => {
              const isDeleting =
                deleteQuiz.isPending && deleteQuiz.variables === quiz.id;

              return (
                <div
                  key={quiz.id}
                  className="p-4 hover:bg-slate-50/75 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2.5 font-semibold text-sm text-indigo-600 transition-colors">
                        
                        {quiz.title}
                        
                        {statusChip(quiz)}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                          <BookOpen size={13} className="text-slate-400" />
                          {quiz.subject_name}
                        </span>

                        <span className="inline-flex items-center gap-1.5">
                          <Clock size={13} className="text-slate-400" />
                          <span>Opens:</span>
                          <span className="font-medium text-slate-700">
                            {fmtDT(quiz.open_time)}
                          </span>
                        </span>

                        <span className="inline-flex items-center gap-1.5">
                          <Clock size={13} className="text-slate-400" />
                          <span>Closes:</span>
                          <span className="font-medium text-slate-700">
                            {fmtDT(quiz.close_time)}
                          </span>
                        </span>

                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                          {quiz.question_count} {quiz.question_count === 1 ? "question" : "questions"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <QuizActions
                        quiz={quiz}
                        deleting={isDeleting}
                        isOpen={openMenuId === quiz.id}
                        isBottom={index >= visibleQuizzes.length - 2 && visibleQuizzes.length > 2}
                        onToggle={() =>
                          setOpenMenuId(openMenuId === quiz.id ? null : quiz.id)
                        }
                        onEdit={() =>
                          setEditingTitle({ id: quiz.id, title: quiz.title })
                        }
                        onDuplicate={() =>
                          setDuplicateQuiz({ id: quiz.id, title: quiz.title })
                        }
                        onDelete={() => handleDelete(quiz.id)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="rounded-b-xl border-t border-slate-100 bg-slate-50/50 px-5 py-3 flex flex-wrap items-center justify-between text-xs text-slate-500">
          <span>{visibleQuizzes.length} of {quizzes.length} activities shown</span>
          <span>
            Sorted by:{" "}
            <strong className="font-semibold text-slate-700">
              {sort === "status"
                ? "Status"
                : sort === "title"
                ? "Title"
                : sort === "subject"
                ? "Subject"
                : "Open Time"}
            </strong>
          </span>
        </div>
      </div>

      {duplicateQuiz && (
        <DuplicateQuizDialog
          key={duplicateQuiz.id}
          quiz={duplicateQuiz}
          onClose={() => setDuplicateQuiz(null)}
          onCreated={() => {
            void refetch();
          }}
        />
      )}
      {editingTitle && (
        <EditQuizTitleDialog
          key={editingTitle.id}
          quiz={editingTitle}
          onClose={() => setEditingTitle(null)}
          onSaved={() => {
            void refetch();
          }}
        />
      )}
    </div>
  );
}