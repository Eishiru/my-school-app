import { useAdminGradeLogs, AdminGradeLog } from "../../../hooks/useAdminData";

function formatTimestamp(ts?: string) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts; // fallback raw
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function GradeLogs() {
  const { data: list, isLoading, error } = useAdminGradeLogs();
  const errorMsg = error?.message || null;

  if (isLoading && !list) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading audit logs...</div>;
  }

  const logs: AdminGradeLog[] = (list ?? []).map((x: any) => ({
    timestamp: x.timestamp,
    teacher: x.teacher,
    student: x.student,
    subject: x.subject,
    activity: x.activity,
    previousGrade: x.previousGrade ?? x.previous_grade ?? "N/A",
    newGrade: x.newGrade ?? x.new_grade ?? "—",
    change: x.change ?? `${x.previousGrade ?? "N/A"} → ${x.newGrade ?? "—"}`,
    changeType: x.changeType,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Grade Audit Trail
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Chronological record of grade entries and score adjustments made by teaching faculty
        </p>
      </div>

      {errorMsg ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-xs font-semibold text-rose-700">
          {errorMsg}
        </div>
      ) : null}

      {/* Table Container */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  Date & Time
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Teacher
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  Previous
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  New Value
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Delta / Summary
                </th>
                <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {logs.length === 0 ? (
                <tr>
                  <td className="px-6 py-12 text-center text-xs text-slate-400" colSpan={9}>
                    No grade change logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => {
                  const isCreate = log.changeType === "Create";
                  return (
                    <tr
                      key={index}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="px-5 py-3.5 text-slate-400 whitespace-nowrap">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900">
                        {log.teacher}
                      </td>
                      <td className="px-5 py-3.5 text-slate-700">
                        {log.student}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-indigo-700">
                        {log.subject}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {log.activity || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-slate-400 font-mono">
                        {log.previousGrade}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-medium text-slate-900">
                        {log.newGrade}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 font-mono text-[11px]">
                        {log.change}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                            isCreate
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {log.changeType}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
