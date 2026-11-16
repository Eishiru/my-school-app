import React, { useState } from "react";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Clock,
  ShieldCheck,
  RefreshCw,
  Layers,
  HelpCircle,
} from "lucide-react";
import {
  useAdminAIRiskSummary,
  useTriggerAdminAIDiagnostic,
} from "../../../hooks/useAdminData";

export default function AIRiskOverviewCard() {
  const { data: summary, isLoading, error } = useAdminAIRiskSummary();
  const triggerMutation = useTriggerAdminAIDiagnostic();
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const handleAction = async (action: "scan" | "seed_sample" | "reset") => {
    setActionSuccessMsg(null);
    try {
      const res = await triggerMutation.mutateAsync(action);
      setActionSuccessMsg(res.message || "Diagnostic action executed successfully.");
      setTimeout(() => setActionSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error("Diagnostic action failed:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs animate-pulse">
        <div className="h-6 w-72 bg-slate-200 rounded mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 text-slate-600 shadow-xs">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Sparkles className="h-4 w-4 text-indigo-600" />
          <span>Institutional AI Academic Risk & Forecast Overview</span>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          AI forecasting service is initializing or awaiting connectivity.
        </p>
      </div>
    );
  }

  const isOperational = summary.status === "OPERATIONAL" && summary.forecast_count > 0;
  const isPending = triggerMutation.isPending;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-start gap-3.5">
          <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 shrink-0 mt-0.5 border border-indigo-100">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base font-bold text-slate-900">
                Institutional AI Academic Risk & Forecast Overview
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {summary.model_name || "Gradient Boosting Regressor"}
              </span>
              {isOperational ? (
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="h-3 w-3" />
                  Diagnostic Scan Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  <Clock className="h-3 w-3" />
                  Awaiting Graded Activities
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Predictive learning trajectory model aligned with DepEd Order No. 015, s. 2026 & Order No. 8, s. 2015
            </p>
          </div>
        </div>

        {/* Action Controls for Admin */}
        <div className="flex items-center gap-2 shrink-0">
          {isOperational ? (
            <button
              onClick={() => handleAction("reset")}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
              title="Clear active forecast records"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
              <span>Reset Data</span>
            </button>
          ) : (
            <button
              onClick={() => handleAction("seed_sample")}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/80 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors disabled:opacity-50"
              title="Simulate representative term diagnostics for demonstration"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Simulate Term Diagnostics</span>
            </button>
          )}

          <button
            onClick={() => handleAction("scan")}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors disabled:opacity-50"
            title="Scan active offerings across the system"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
            <span>{isPending ? "Scanning..." : "Run System Scan"}</span>
          </button>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* 2. Key Metrics 4-Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* At-Risk Learners Card */}
        <div className="rounded-xl border border-rose-200/90 bg-rose-50/40 p-4 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
              High Risk (At-Risk)
            </span>
            <div className="rounded-lg bg-rose-100 p-2 text-rose-700">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-rose-950">
              {summary.high_risk_count}
            </span>
            <span className="text-xs font-medium text-rose-700">Learners</span>
          </div>
          <p className="mt-1 text-[11px] text-rose-700 leading-tight">
            Projected final grade &lt; 75.0 • Immediate remediation required
          </p>
        </div>

        {/* Medium Risk Learners Card */}
        <div className="rounded-xl border border-amber-200/90 bg-amber-50/40 p-4 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Moderate Risk
            </span>
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-amber-950">
              {summary.medium_risk_count}
            </span>
            <span className="text-xs font-medium text-amber-700">Learners</span>
          </div>
          <p className="mt-1 text-[11px] text-amber-700 leading-tight">
            Projected 75.0 – 79.9 • Near passing boundary threshold
          </p>
        </div>

        {/* On-Track Learners Card */}
        <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/40 p-4 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              On-Track Learners
            </span>
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-emerald-950">
              {summary.low_risk_count}
            </span>
            <span className="text-xs font-medium text-emerald-700">Learners</span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-700 leading-tight">
            Projected final grade &ge; 80.0 • Satisfying curriculum targets
          </p>
        </div>

        {/* School-Wide Projected Performance Average */}
        <div className="rounded-xl border border-indigo-200/90 bg-indigo-50/40 p-4 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-800">
              Projected School Average
            </span>
            <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-indigo-950">
              {summary.average_predicted_grade !== null ? `${summary.average_predicted_grade}%` : "—"}
            </span>
            <span className="text-xs font-medium text-indigo-700">DepEd Transmuted</span>
          </div>
          <p className="mt-1 text-[11px] text-indigo-700 leading-tight">
            Based on {summary.forecast_count} active forecast evaluations
          </p>
        </div>
      </div>

      {/* 3. Section-Level Remediation Priority Table / Status */}
      {isOperational && summary.at_risk_sections.length > 0 ? (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-slate-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Section-Level Intervention Priorities (Academic Guidance)
              </h3>
            </div>
            <span className="text-xs text-slate-500">
              Ranked by urgent remediation necessity
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Section & Grade Level</th>
                  <th className="py-2.5 px-4 text-center">Evaluated</th>
                  <th className="py-2.5 px-4 text-center">High Risk</th>
                  <th className="py-2.5 px-4 text-center">Moderate Risk</th>
                  <th className="py-2.5 px-4 text-center">Average Forecast</th>
                  <th className="py-2.5 px-4 text-right">Intervention Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {summary.at_risk_sections.map((sec, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {sec.section_name}
                    </td>
                    <td className="py-2.5 px-4 text-center text-slate-600">
                      {sec.total_evaluated}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {sec.high_risk > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                          {sec.high_risk} learners
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {sec.medium_risk > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                          {sec.medium_risk}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono font-medium text-slate-700">
                      {sec.avg_grade ? `${sec.avg_grade}%` : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {sec.high_risk > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700">
                          <AlertTriangle className="h-3 w-3" />
                          Remedial Session Needed
                        </span>
                      ) : sec.medium_risk > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
                          <Clock className="h-3 w-3" />
                          Formative Monitoring
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          On Target
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-4 text-xs text-slate-600 flex items-start gap-3">
          <HelpCircle className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-800">Baseline Assessment Period Active</p>
            <p className="leading-relaxed">
              {summary.status_message}
            </p>
            <p className="text-[11px] text-slate-500 pt-0.5">
              Tip: Click &quot;Simulate Term Diagnostics&quot; above to preview live institutional risk tracking with sample data for demonstration.
            </p>
          </div>
        </div>
      )}

      {/* 4. Statutory Advisory Safeguard Note */}
      <div className="flex items-center gap-2 rounded-lg bg-slate-50/80 border border-slate-200/60 px-3.5 py-2.5 text-[11px] text-slate-500">
        <ShieldCheck className="h-4 w-4 shrink-0 text-slate-400" />
        <span>
          <strong>DepEd Advisory Safeguard:</strong> AI grade forecasts serve strictly as proactive, diagnostic indicators for instructional intervention and resource allocation. Forecasts never overwrite official DepEd transmuted grades.
        </span>
      </div>
    </div>
  );
}
