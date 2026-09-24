import React from 'react';

interface StatCardProps {
  label: string;
  value: number | null | undefined;
}

export default function StatCard({ label, value }: StatCardProps) {
  const hasValue = typeof value === 'number' && !Number.isNaN(value);
  const safeValue = hasValue ? value : 0;
  const ringDegrees = Math.max(0, Math.min(360, safeValue * 3.6));

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
        <span className="text-xs font-medium text-slate-400">DepEd 100-pt scale</span>
      </div>

      <div className="my-6 flex justify-center">
        <div
          className="relative grid size-44 place-items-center rounded-full p-2.5 transition-all"
          style={{
            background: hasValue
              ? `conic-gradient(#4f46e5 0deg ${ringDegrees * 0.72}deg, #6366f1 ${ringDegrees * 0.72}deg ${ringDegrees}deg, #e2e8f0 ${ringDegrees}deg 360deg)`
              : '#f1f5f9',
          }}
        >
          <div className="grid size-full place-items-center rounded-full bg-white shadow-xs">
            <div className="text-center">
              <div className="font-mono text-3xl font-bold tracking-tight text-slate-900">
                {hasValue ? value.toFixed(1) : '—'}
              </div>
              <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                Out of 100
              </div>

              {hasValue && (
                <div className="mt-1.5">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider ${
                      value >= 75
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                        : 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20'
                    }`}
                  >
                    {value >= 75 ? 'Passing' : 'Needs Attention'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-slate-500">
        Based on graded activities and semester assessments
      </p>
    </div>
  );
}