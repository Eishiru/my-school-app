import { useParams } from "react-router-dom";
import {
  RefreshCw,
  UserRound,
} from "lucide-react";

import {
  useTeacherSubjectStudents,
} from "../../../hooks/useTeacherSubjects";

export default function SubjectClassListTab() {
  const { id } = useParams<{ id: string }>();

  const subjectId = Number(id || 0);

  const {
    data: students = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useTeacherSubjectStudents(subjectId);

  if (!subjectId) {
    return (
      <div className="p-6 text-rose-600">
        Invalid subject ID.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 text-slate-600">
        Loading class list…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <div className="font-bold text-rose-700">
          Failed to load class list.
        </div>

        <p className="mt-1 text-sm text-rose-600">
          {error instanceof Error
            ? error.message
            : "Something went wrong."}
        </p>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="mt-4 text-sm font-bold text-rose-700 hover:underline disabled:opacity-50"
        >
          {isFetching
            ? "Retrying..."
            : "Try again"}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">
            Class List
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            {students.length}{" "}
            {students.length === 1
              ? "student"
              : "students"}{" "}
            enrolled
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={14}
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
      </div>

      {/* Empty State */}
      {students.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
            <UserRound size={20} />
          </div>

          <div className="mt-3 font-bold text-slate-900">
            No students found
          </div>

          <p className="mt-1 text-sm text-slate-500">
            There are currently no students
            assigned to this subject.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {students.map((student) => (
            <div
              key={student.id}
              className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
            >
              {/* Avatar */}
              <div className="h-10 w-10 shrink-0 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm">
                {student.first_name
                  ?.charAt(0)
                  .toUpperCase()}

                {student.last_name
                  ?.charAt(0)
                  .toUpperCase()}
              </div>

              {/* Student Info */}
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-800 truncate">
                  {student.last_name},{" "}
                  {student.first_name}
                </div>

                <div className="mt-0.5 text-xs text-slate-500 truncate">
                  {student.school_id} •{" "}
                  {student.email}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}