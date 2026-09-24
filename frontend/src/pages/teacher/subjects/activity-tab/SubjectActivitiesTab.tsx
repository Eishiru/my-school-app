import { useMemo } from "react";
import {
  Link,
  useParams,
} from "react-router-dom";
import {
  Plus,
  FileQuestion,
  Calendar,
  Trash2,
} from "lucide-react";

import {
  useDeleteTeacherQuizActivity,
  useTeacherSubjectActivities,
} from "../../../../hooks/useTeacherSubjects";

export default function SubjectActivitiesTab() {
  const { id } = useParams<{ id: string }>();

  const subjectId = Number(id || 0);

  const {
    data: activities = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useTeacherSubjectActivities(subjectId);

  const deleteActivity =
    useDeleteTeacherQuizActivity();

  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) =>
      (a.open_time || "").localeCompare(
        b.open_time || ""
      )
    );
  }, [activities]);

  const handleDelete = (
    activityId: number
  ) => {
    const ok = window.confirm(
      "Delete this activity?"
    );

    if (!ok) return;

    deleteActivity.mutate(
      {
        subjectId,
        activityId,
      },
      {
        onError: (error) => {
          console.error(
            "Failed to delete activity:",
            error
          );

          alert(
            error instanceof Error
              ? error.message
              : "Failed to delete activity."
          );
        },
      }
    );
  };

  if (!subjectId) {
    return (
      <div className="p-6 text-rose-600">
        Invalid subject ID.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">
            Activities
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Manage quizzes for this subject.
          </p>
        </div>

        <Link
          to={`/teacher/subject/${subjectId}/activities/create`}
          className="inline-flex items-center px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow hover:bg-indigo-700 transition-colors"
        >
          <Plus
            size={18}
            className="mr-2"
          />

          Create Quiz
        </Link>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 text-slate-600">
          Loading activities...
        </div>
      ) : null}

      {/* Error */}
      {!isLoading && isError ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6">
          <div className="font-bold text-rose-700">
            Failed to load activities.
          </div>

          <div className="mt-1 text-sm text-rose-600">
            {error instanceof Error
              ? error.message
              : "Something went wrong."}
          </div>

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
      ) : null}

      {/* Activities */}
      {!isLoading && !isError ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {sortedActivities.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-500">
                <FileQuestion size={20} />
              </div>

              <div className="mt-3 font-bold text-slate-900">
                No quizzes yet
              </div>

              <div className="mt-1 text-sm text-slate-500">
                Create one using the button above.
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sortedActivities.map(
                (activity) => {
                  const isDeleting =
                    deleteActivity.isPending &&
                    deleteActivity.variables
                      ?.activityId ===
                      activity.id;

                  return (
                    <div
                      key={activity.id}
                      className="p-5 flex items-start justify-between gap-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 h-9 w-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 shrink-0">
                            <FileQuestion
                              size={16}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                to={`/teacher/activities/${activity.id}`}
                                className="font-black text-slate-900 truncate hover:underline"
                                title={
                                  activity.title
                                }
                              >
                                {
                                  activity.title
                                }
                              </Link>

                              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                                Quiz
                              </span>

                              {activity.status ? (
                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                                  {
                                    activity.status
                                  }
                                </span>
                              ) : null}
                            </div>

                            {activity.description ? (
                              <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                                {
                                  activity.description
                                }
                              </p>
                            ) : null}

                            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-2">
                                <Calendar
                                  size={14}
                                />

                                {activity.open_time
                                  ? new Date(
                                      activity.open_time
                                    ).toLocaleString()
                                  : "No date"}
                              </span>

                              {typeof activity.total_points ===
                              "number" ? (
                                <span className="inline-flex items-center gap-1">
                                  <span className="h-1 w-1 rounded-full bg-slate-300" />

                                  {
                                    activity.total_points
                                  }{" "}
                                  pts
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(
                              activity.id
                            )
                          }
                          disabled={
                            isDeleting
                          }
                          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2
                            size={18}
                          />
                        </button>

                        {isDeleting ? (
                          <div className="mt-1 text-[10px] text-slate-400 text-center">
                            Deleting...
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}