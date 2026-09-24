import { API_BASE_URL } from "../../../api/config";
// SubjectQuizAnalytics.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Search, Filter, RefreshCcw } from "lucide-react";

type RecentQuizGrade = {
  student: string; // "First Last"
  quiz: string;    // quiz title
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

export default function SubjectQuizAnalytics() {
  const { id } = useParams<{ id: string }>();
  const subjectId = Number(id || 0);

  const token = localStorage.getItem("access");
  const base = API_BASE_URL;

  const [rows, setRows] = useState<RecentQuizGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // UI state
  const [query, setQuery] = useState("");
  const [quizFilter, setQuizFilter] = useState<string>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [limit, setLimit] = useState(50);

  const fetchAll = async () => {
    if (!token) {
      setErrorMsg("Not authenticated. Please log in again.");
      setLoading(false);
      return;
    }
    if (!subjectId) {
      setErrorMsg("Invalid subject offering id.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const res = await fetch(`${base}/subject-offerings/${subjectId}/recent-quiz-grades/`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("recent-quiz-grades failed", err);
        setRows([]);
        setErrorMsg("Failed to load analytics.");
        return;
      }

      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setRows([]);
      setErrorMsg("Network error while loading analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, token]);

  const quizOptions = useMemo(() => {
    const uniq = Array.from(new Set(rows.map((r) => r.quiz).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );
    return ["ALL", ...uniq];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesQuery = !q
        ? true
        : `${r.student} ${r.quiz}`.toLowerCase().includes(q);

      const matchesQuiz = quizFilter === "ALL" ? true : r.quiz === quizFilter;

      return matchesQuery && matchesQuiz;
    });
  }, [rows, query, quizFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];

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
  }, [filtered, sortKey, sortDir]);

  const visible = useMemo(() => sorted.slice(0, limit), [sorted, limit]);

  const avgPercent = useMemo(() => {
    if (filtered.length === 0) return "—";
    const sum = filtered.reduce((acc, r) => acc + (Number(r.percent) || 0), 0);
    return (sum / filtered.length).toFixed(1);
  }, [filtered]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <p className="text-slate-600 font-bold">Loading analytics…</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <Link
          to={`/teacher/subject/${subjectId}`}
          className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-indigo-600"
        >
          <ArrowLeft size={16} className="mr-2" /> Back
        </Link>
        <p className="mt-4 text-rose-600 font-bold">{errorMsg}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div>
            <Link
              to={`/teacher/subject/${subjectId}`}
              className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-indigo-600 uppercase tracking-widest"
            >
              <ArrowLeft size={16} className="mr-2" /> Back to Subject
            </Link>

            <h1 className="text-3xl font-black text-slate-900 mt-3">
              Detailed Quiz Analytics
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Showing <span className="font-bold text-slate-700">{filtered.length}</span> records •
              Avg %: <span className="font-bold text-slate-700">{avgPercent}</span>
            </p>
          </div>

          <button
            onClick={fetchAll}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-50"
          >
            <RefreshCcw size={16} /> Refresh
          </button>
        </div>

        {/* Controls */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Search
              </label>
              <div className="flex items-center gap-2 bg-slate-50 border rounded-xl px-3 py-2">
                <Search size={16} className="text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search student or quiz…"
                  className="w-full bg-transparent outline-none text-sm text-slate-700"
                />
              </div>
            </div>

            {/* Quiz filter */}
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Quiz
              </label>
              <div className="flex items-center gap-2 bg-slate-50 border rounded-xl px-3 py-2">
                <Filter size={16} className="text-slate-400" />
                <select
                  value={quizFilter}
                  onChange={(e) => setQuizFilter(e.target.value)}
                  className="w-full bg-transparent outline-none text-sm text-slate-700"
                >
                  {quizOptions.map((q) => (
                    <option key={q} value={q}>
                      {q === "ALL" ? "All quizzes" : q}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Sort
              </label>
              <div className="flex gap-2">
                <select
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm text-slate-700"
                >
                  <option value="date">Date</option>
                  <option value="percent">Percent</option>
                  <option value="student">Student</option>
                  <option value="quiz">Quiz</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                  className="px-3 py-2 bg-white border rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
                  title="Toggle sort direction"
                >
                  {sortDir === "asc" ? "↑" : "↓"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    Submitted
                  </th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    Student
                  </th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    Quiz
                  </th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    Score
                  </th>
                  <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    Percent
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  visible.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                        {formatDateTime(r.submitted_at)}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-800">
                        {r.student}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">{r.quiz}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {r.score}/{r.total}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-black ${
                            r.percent < 80
                              ? "bg-rose-50 text-rose-600"
                              : "bg-emerald-50 text-emerald-600"
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

          {/* Footer / show more */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
            <p className="text-xs text-slate-500">
              Showing <span className="font-bold">{Math.min(limit, sorted.length)}</span> of{" "}
              <span className="font-bold">{sorted.length}</span>
            </p>

            {limit < sorted.length ? (
              <button
                onClick={() => setLimit((n) => n + 50)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-indigo-600 transition-all"
              >
                Show More
              </button>
            ) : (
              <button
                onClick={() => setLimit(50)}
                className="px-4 py-2 bg-white border text-slate-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-all"
              >
                Show Less
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
