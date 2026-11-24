import { API_BASE_URL } from "../../../api/config";
// SubjectQuizAnalytics.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Filter,
  RefreshCcw,
  Sparkles,
  BarChart2,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Award,
  Target,
  Compass,
  Layers,
  Lightbulb,
  Users,
} from "lucide-react";
import { useSubjectOfferingForecasts } from "../../../hooks/useTeacherGradeForecasts";

type RecentQuizGrade = {
  student: string; // "First Last"
  quiz: string; // quiz title
  score: number;
  total: number;
  percent: number; // 0..100
  submitted_at?: string | null;
};

type SortKey = "date" | "percent" | "student" | "quiz";

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function getDescriptorBadge(desc: string) {
  switch (desc) {
    case "Advancing":
      return {
        icon: <Award size={13} className="text-emerald-600" />,
        style: "bg-emerald-50 text-emerald-800 border-emerald-200",
      };
    case "Benchmarking":
      return {
        icon: <Target size={13} className="text-indigo-600" />,
        style: "bg-indigo-50 text-indigo-800 border-indigo-200",
      };
    case "Developing":
      return {
        icon: <Compass size={13} className="text-amber-600" />,
        style: "bg-amber-50 text-amber-800 border-amber-200",
      };
    case "Connecting":
      return {
        icon: <Layers size={13} className="text-orange-600" />,
        style: "bg-orange-50 text-orange-800 border-orange-200",
      };
    case "Emerging":
    default:
      return {
        icon: <AlertTriangle size={13} className="text-rose-600" />,
        style: "bg-rose-50 text-rose-800 border-rose-200",
      };
  }
}

function getRiskBadge(risk: string) {
  switch (risk) {
    case "LOW":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20";
    case "MEDIUM":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20";
    case "HIGH":
      return "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20";
    default:
      return "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
  }
}

function renderTrendIcon(t: string) {
  switch (t) {
    case "IMPROVING":
      return (
        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
          <TrendingUp size={13} className="text-emerald-600" />
          Improving
        </span>
      );
    case "DECLINING":
      return (
        <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
          <TrendingDown size={13} className="text-rose-600" />
          Declining
        </span>
      );
    case "STABLE":
    default:
      return (
        <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
          <Minus size={13} className="text-slate-500" />
          Stable
        </span>
      );
  }
}

export default function SubjectQuizAnalytics() {
  const { id } = useParams<{ id: string }>();
  const subjectId = Number(id || 0);

  const [activeTab, setActiveTab] = useState<"forecasts" | "submissions">("forecasts");

  // Forecast query
  const {
    data: forecasts = [],
    isLoading: loadingForecasts,
    refetch: refetchForecasts,
    error: forecastError,
  } = useSubjectOfferingForecasts(subjectId > 0 ? subjectId : undefined);

  // Submissions state
  const token = localStorage.getItem("access");
  const base = API_BASE_URL;

  const [rows, setRows] = useState<RecentQuizGrade[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Sorting for Submissions
  const [query, setQuery] = useState("");
  const [quizFilter, setQuizFilter] = useState<string>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [limit, setLimit] = useState(50);

  // Filters for Forecasts
  const [forecastQuery, setForecastQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("ALL");

  const fetchSubmissions = async () => {
    if (!token || !subjectId) return;
    try {
      setLoadingSubmissions(true);
      setErrorMsg(null);
      const res = await fetch(`${base}/subject-offerings/${subjectId}/recent-quiz-grades/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setRows([]);
        setErrorMsg("Failed to load quiz attempts.");
        return;
      }
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setRows([]);
      setErrorMsg("Network error while loading submissions.");
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, token]);

  const quizOptions = useMemo(() => {
    const uniq = Array.from(new Set(rows.map((r) => r.quiz).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );
    return ["ALL", ...uniq];
  }, [rows]);

  const filteredSubmissions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesQuery = !q ? true : `${r.student} ${r.quiz}`.toLowerCase().includes(q);
      const matchesQuiz = quizFilter === "ALL" ? true : r.quiz === quizFilter;
      return matchesQuery && matchesQuiz;
    });
  }, [rows, query, quizFilter]);

  const sortedSubmissions = useMemo(() => {
    const copy = [...filteredSubmissions];
    const getDate = (r: RecentQuizGrade) =>
      r.submitted_at ? new Date(r.submitted_at).getTime() : 0;

    copy.sort((a, b) => {
      let v = 0;
      if (sortKey === "date") v = getDate(a) - getDate(b);
      if (sortKey === "percent") v = (a.percent ?? 0) - (b.percent ?? 0);
      if (sortKey === "student") v = a.student.localeCompare(b.student);
      if (sortKey === "quiz") v = a.quiz.localeCompare(b.quiz);
      return sortDir === "asc" ? v : -v;
    });
    return copy;
  }, [filteredSubmissions, sortKey, sortDir]);

  const visibleSubmissions = useMemo(
    () => sortedSubmissions.slice(0, limit),
    [sortedSubmissions, limit]
  );

  // Forecast Metrics
  const forecastStats = useMemo(() => {
    const total = forecasts.length;
    let high = 0;
    let medium = 0;
    let low = 0;
    let ineligible = 0;

    forecasts.forEach((f: any) => {
      if (f.eligible === false || f.is_eligible === false) {
        ineligible++;
      } else if (f.risk_level === "HIGH") {
        high++;
      } else if (f.risk_level === "MEDIUM") {
        medium++;
      } else {
        low++;
      }
    });

    return { total, high, medium, low, ineligible };
  }, [forecasts]);

  const filteredForecasts = useMemo(() => {
    const q = forecastQuery.trim().toLowerCase();
    return forecasts.filter((f: any) => {
      const nameMatch = !q ? true : (f.student_name || "").toLowerCase().includes(q);
      if (!nameMatch) return false;

      if (riskFilter === "ALL") return true;
      if (riskFilter === "INELIGIBLE") return f.eligible === false || f.is_eligible === false;
      return f.risk_level === riskFilter && (f.eligible !== false && f.is_eligible !== false);
    });
  }, [forecasts, forecastQuery, riskFilter]);

  return (
    <div className="w-full space-y-4 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base font-bold text-slate-900">
              AI Grade Forecasting & Academic Trajectory
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Sparkles size={12} /> GBR Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Predictive diagnostic risk model tracking term grades against DepEd standards (DepEd Order No. 8, s. 2015).
          </p>
        </div>

        <button
          onClick={() => {
            if (activeTab === "forecasts") refetchForecasts();
            else fetchSubmissions();
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200/80 rounded-lg text-slate-700 font-semibold text-xs hover:bg-slate-50 shadow-2xs self-start sm:self-auto transition-colors"
        >
          <RefreshCcw size={13} />
          <span>Refresh Diagnostics</span>
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2">
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
          <button
            onClick={() => setActiveTab("forecasts")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "forecasts"
                ? "bg-white text-indigo-700 shadow-xs border border-slate-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles size={13} className="text-indigo-600" />
            <span>AI Grade Forecasts ({forecasts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("submissions")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "submissions"
                ? "bg-white text-indigo-700 shadow-xs border border-slate-200/60"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BarChart2 size={13} className="text-slate-500" />
            <span>Quiz Submissions ({rows.length})</span>
          </button>
        </div>
      </div>

      {/* ==================== TAB 1: AI FORECASTS ==================== */}
      {activeTab === "forecasts" && (
        <div className="space-y-4">
          {/* KPI Stat Cards (Full Width Grid) */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total Enrolled
              </p>
              <p className="text-2xl font-black text-slate-900 mt-1">{forecastStats.total}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Students in section</p>
            </div>

            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 shadow-2xs">
              <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                High Risk (At-Risk)
              </p>
              <p className="text-2xl font-black text-rose-700 mt-1">{forecastStats.high}</p>
              <p className="text-[10px] text-rose-600 mt-0.5">Predicted &lt; 75.0%</p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 shadow-2xs">
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                Medium Risk
              </p>
              <p className="text-2xl font-black text-amber-700 mt-1">{forecastStats.medium}</p>
              <p className="text-[10px] text-amber-600 mt-0.5">Borderline (75–79%)</p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-2xs">
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                Low Risk (On Track)
              </p>
              <p className="text-2xl font-black text-emerald-700 mt-1">{forecastStats.low}</p>
              <p className="text-[10px] text-emerald-600 mt-0.5">Mastery (80%+)</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 shadow-2xs">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Awaiting Baseline
              </p>
              <p className="text-2xl font-black text-slate-700 mt-1">{forecastStats.ineligible}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">&lt; 1 WW, PT, or FA</p>
            </div>
          </div>

          {/* Controls (Streamlined single-line bar) */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 w-full flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                <Search size={14} className="text-slate-400 shrink-0" />
                <input
                  value={forecastQuery}
                  onChange={(e) => setForecastQuery(e.target.value)}
                  placeholder="Search student name…"
                  className="w-full bg-transparent outline-none text-xs text-slate-700 font-medium"
                />
                {forecastQuery && (
                  <button
                    type="button"
                    onClick={() => setForecastQuery("")}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="w-full sm:w-auto flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 shrink-0">
                  <Filter size={13} className="text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Risk:</span>
                  <select
                    value={riskFilter}
                    onChange={(e) => setRiskFilter(e.target.value)}
                    className="bg-transparent outline-none text-xs text-slate-700 font-semibold cursor-pointer"
                  >
                    <option value="ALL">All ({forecasts.length})</option>
                    <option value="HIGH">High Risk ({forecastStats.high})</option>
                    <option value="MEDIUM">Medium Risk ({forecastStats.medium})</option>
                    <option value="LOW">Low Risk ({forecastStats.low})</option>
                    <option value="INELIGIBLE">Awaiting Baseline ({forecastStats.ineligible})</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Forecasts Table (Full Width) */}
          <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500">
                    <th className="px-4 py-3 font-bold text-slate-700">
                      Student
                    </th>
                    <th className="px-4 py-3 font-bold text-slate-700">
                      Predicted Final Grade
                    </th>
                    <th className="px-4 py-3 font-bold text-slate-700">
                      DepEd Descriptor
                    </th>
                    <th className="px-4 py-3 font-bold text-slate-700">
                      Risk Level
                    </th>
                    <th className="px-4 py-3 font-bold text-slate-700">
                      Trajectory
                    </th>
                    <th className="px-4 py-3 font-bold text-slate-700">
                      Competencies & Areas of Focus
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loadingForecasts ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                          <span className="text-xs font-semibold">
                            Generating section AI forecasts with Gradient Boosting...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredForecasts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-slate-500 text-xs">
                        No student forecast records matching the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredForecasts.map((f: any, idx: number) => {
                      const isEligible = f.eligible !== false && f.is_eligible !== false;
                      const pred = f.predicted_grade ?? f.baseline_grade ?? 75.0;
                      const desc = f.performance_descriptor || "Developing";
                      const descMeta = getDescriptorBadge(desc);
                      const risk = f.risk_level || "LOW";

                      return (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          {/* Student */}
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-900">{f.student_name}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Completed: {f.quiz_count || 0} activities
                            </p>
                          </td>

                          {/* Predicted Grade */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isEligible ? (
                              <div>
                                <div className="flex items-baseline gap-1.5">
                                  <span className="font-mono text-base font-extrabold text-indigo-700">
                                    {pred.toFixed(1)}%
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    (Base: {f.baseline_grade?.toFixed(1) || "—"}%)
                                  </span>
                                </div>
                                <div className="w-28 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      pred >= 75 ? "bg-indigo-600" : "bg-rose-500"
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(0, pred))}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                <ShieldAlert size={12} /> Awaiting Baseline
                              </span>
                            )}
                          </td>

                          {/* Descriptor */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isEligible ? (
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${descMeta.style}`}
                              >
                                {descMeta.icon}
                                {desc}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>

                          {/* Risk Level */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${getRiskBadge(
                                risk
                              )}`}
                            >
                              {risk}
                            </span>
                          </td>

                          {/* Trajectory */}
                          <td className="px-4 py-3 whitespace-nowrap text-xs">
                            {renderTrendIcon(f.performance_trend || "STABLE")}
                          </td>

                          {/* Topics & Recommendations */}
                          <td className="px-4 py-3 max-w-sm">
                            {isEligible ? (
                              <div className="space-y-0.5">
                                {f.weak_topics && f.weak_topics.length > 0 && (
                                  <div className="text-[10px] text-amber-900 font-medium">
                                    <span className="font-bold text-amber-700">Focus: </span>
                                    {f.weak_topics.join(", ")}
                                  </div>
                                )}
                                {f.recommendations && (
                                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-tight">
                                    {f.recommendations}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-[11px] text-amber-800 line-clamp-2 italic">
                                {f.reason || "Complete at least 1 WW, 1 PT, and 1 FA."}
                              </p>
                            )}
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
      )}

      {/* ==================== TAB 2: RECENT SUBMISSIONS ==================== */}
      {activeTab === "submissions" && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 text-xs">
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                  <Search size={14} className="text-slate-400 shrink-0" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search student or quiz…"
                    className="w-full bg-transparent outline-none text-xs text-slate-700"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                  <Filter size={13} className="text-slate-400" />
                  <select
                    value={quizFilter}
                    onChange={(e) => setQuizFilter(e.target.value)}
                    className="w-full bg-transparent outline-none text-xs text-slate-700 font-semibold cursor-pointer"
                  >
                    {quizOptions.map((q) => (
                      <option key={q} value={q}>
                        {q === "ALL" ? "All quizzes" : q}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex gap-1.5">
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-semibold cursor-pointer"
                  >
                    <option value="date">Date</option>
                    <option value="percent">Percent</option>
                    <option value="student">Student</option>
                    <option value="quiz">Quiz</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
                    title="Toggle sort direction"
                  >
                    {sortDir === "asc" ? "↑" : "↓"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500">
                    <th className="px-4 py-3 font-bold text-slate-700">
                      Submitted
                    </th>
                    <th className="px-4 py-3 font-bold text-slate-700">
                      Student
                    </th>
                    <th className="px-4 py-3 font-bold text-slate-700">
                      Quiz
                    </th>
                    <th className="px-4 py-3 font-bold text-slate-700">
                      Score
                    </th>
                    <th className="px-4 py-3 font-bold text-slate-700">
                      Percent
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loadingSubmissions ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                        Loading submissions...
                      </td>
                    </tr>
                  ) : visibleSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    visibleSubmissions.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {formatDateTime(r.submitted_at)}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800">{r.student}</td>
                        <td className="px-4 py-3 text-slate-700">{r.quiz}</td>
                        <td className="px-4 py-3 text-slate-700 font-mono font-semibold">
                          {r.score}/{r.total}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                              r.percent < 75
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {Number(r.percent).toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/60 border-t border-slate-200 text-xs">
              <p className="text-slate-500">
                Showing <span className="font-bold">{Math.min(limit, sortedSubmissions.length)}</span> of{" "}
                <span className="font-bold">{sortedSubmissions.length}</span>
              </p>

              {limit < sortedSubmissions.length ? (
                <button
                  onClick={() => setLimit((n) => n + 50)}
                  className="px-3 py-1 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-indigo-600 transition-all"
                >
                  Show More
                </button>
              ) : (
                <button
                  onClick={() => setLimit(50)}
                  className="px-3 py-1 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-all"
                >
                  Show Less
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
