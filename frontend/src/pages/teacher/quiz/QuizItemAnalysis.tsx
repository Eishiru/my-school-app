'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authFetch } from '../../../api/apiClient';
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Layers,
  Users,
  Percent,
  Sparkles,
} from 'lucide-react';
import { useGenerateQuizAIAnalysis, useQuizItemAnalysis } from '../../../hooks/useTeacherSubjects';

function SkeletonLine({ w = 'w-full' }: { w?: string }) {
  return <div className={`h-3 ${w} rounded-full bg-slate-200/80 animate-pulse`} />;
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
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs hover:border-indigo-200 transition-all">
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

function statusMetaFromPct(pct: number) {
  if (pct >= 75) {
    return {
      icon: <CheckCircle2 className="text-emerald-600" size={18} />,
      chip: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
      label: 'STRONG',
      tip: 'Well understood',
    };
  }
  if (pct >= 50) {
    return {
      icon: <AlertTriangle className="text-amber-600" size={18} />,
      chip: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
      label: 'NEEDS REVIEW',
      tip: 'Mixed results',
    };
  }
  return {
    icon: <XCircle className="text-rose-600" size={18} />,
    chip: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
    label: 'DIFFICULT',
    tip: 'Most students struggled',
  };
}

function pendingMeta(pending: number) {
  if (pending > 0) {
    return {
      icon: <AlertTriangle className="text-amber-600" size={18} />,
      chip: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
      label: 'PENDING GRADING',
      tip: 'Some answers still need manual grading',
    };
  }
  return null;
}


function difficultyChip(difficulty: string) {
  switch (difficulty) {
    case 'Easy':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    case 'Medium':
      return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
    case 'Hard':
      return 'bg-orange-50 text-orange-700 ring-1 ring-orange-200';
    case 'Very Hard':
      return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';
    default:
      return 'bg-slate-50 text-slate-600 ring-1 ring-slate-200';
  }
}

function pct(n: number) {
  if (!Number.isFinite(n)) return '0.0';
  return n.toFixed(1);
}

export default function QuizItemAnalysis() {
  const { id } = useParams();
  const navigate = useNavigate();
  const quizId = Number(id || 0);
  
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuizItemAnalysis(quizId);

  const avgSuccess = useMemo(() => {
    if (!data?.questions?.length) return 0;

    let totalNumerator = 0;
    let totalDenominator = 0;

    data.questions.forEach((question) => {
      const attempts = question.total_attempts ?? 0;

      if (question.analysis_mode === "SCORES") {
        const maxPoints =
          question.max_points ??
          question.points ??
          0;

        const averageScore =
          question.avg_score ?? 0;

        const gradedCount =
          question.graded_count ?? 0;

        totalNumerator +=
          averageScore * gradedCount;

        totalDenominator +=
          maxPoints * gradedCount;
      } else {
        totalNumerator +=
          question.correct_count ?? 0;

        totalDenominator += attempts;
      }
    });

    if (totalDenominator === 0) {
      return 0;
    }

    return (
      totalNumerator /
      totalDenominator
    ) * 100;
  }, [data]);



  const generateAI =
    useGenerateQuizAIAnalysis();

  const handleGenerateAI = () => {
    generateAI.mutate(quizId, {
      onError: (error) => {
        console.error(
          "AI analysis failed:",
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : "Failed to generate AI insight."
        );
      },
    });
  };


  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-28 rounded-2xl bg-white border border-slate-200 shadow-sm" />
            <div className="flex-1">
              <div className="h-8 w-72 rounded-2xl bg-slate-200/80 animate-pulse" />
              <div className="mt-2 h-3 w-40 rounded-full bg-slate-200/80 animate-pulse" />
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <SkeletonLine w="w-40" />
              <div className="mt-5">
                <SkeletonLine w="w-20" />
              </div>
              <div className="mt-3">
                <SkeletonLine w="w-44" />
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <SkeletonLine w="w-40" />
              <div className="mt-5">
                <SkeletonLine w="w-28" />
              </div>
              <div className="mt-3">
                <SkeletonLine w="w-44" />
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <SkeletonLine w="w-40" />
              <div className="mt-5">
                <SkeletonLine w="w-24" />
              </div>
              <div className="mt-3">
                <SkeletonLine w="w-44" />
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
            <SkeletonLine w="w-64" />
            <div className="mt-4 space-y-3">
              <div className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
              <div className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
              <div className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!data || isError) {
    return (
      <main className="min-h-[70vh] bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-10">
          <button
            onClick={() => navigate(`/teacher/activities/${id}`)}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="mt-6 rounded-3xl border border-rose-200 bg-white p-6">
            <div className="text-sm font-black uppercase tracking-widest text-rose-500">Error</div>
            <div className="mt-2 text-lg font-bold text-slate-900">{errorMsg ?? 'Failed to load item analysis'}</div>
            <div className="mt-1 text-sm text-slate-500">Try refreshing the page.</div>
            <button
              onClick={() => refetch()}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-600"
            >
              <BarChart3 size={16} />
              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50/50 pb-12">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white shadow-xs">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(`/teacher/activities/${id}`)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>

              <div className="min-w-0">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                  Item Analysis
                </span>
                <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">
                  {data.quiz_title}
                </h1>
                <div className="mt-0.5 text-xs text-slate-500 font-medium">
                  Quiz ID: {data.quiz_id}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateAI}
              disabled={generateAI.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Sparkles size={14} className={generateAI.isPending ? "animate-spin" : ""} />
              <span>{generateAI.isPending ? "Generating AI Insight..." : "Generate AI Insight"}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            icon={<Layers size={18} />}
            label="Total Questions"
            value={data.total_questions}
            hint="Number of items"
            accent="bg-indigo-50 text-indigo-600 border-indigo-100"
          />
          <StatCard
            icon={<Users size={18} />}
            label="Student Attempts"
            value={data.total_student_attempts}
            hint="Total submissions"
            accent="bg-blue-50 text-blue-600 border-blue-100"
          />
          <StatCard
            icon={<Percent size={18} />}
            label="Avg Success"
            value={`${pct(avgSuccess)}%`}
            hint="Mean correct percentage"
            accent="bg-emerald-50 text-emerald-600 border-emerald-100"
          />
        </div>

        {/* No attempts */}
        {data.total_student_attempts === 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                <Info size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-900">No student attempts yet</div>
                <div className="mt-0.5 text-xs text-amber-800">
                  Item analysis will populate after students complete the activity.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Question-by-question
            </span>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Detailed Breakdown
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review success rate, difficulty, and student answer selection for each item.
            </p>
          </div>

          <div className="space-y-4">
            {[...data.questions]
            .sort((a, b) => a.order - b.order)
            .map((question, index) => {
              const diffChip = difficultyChip(question.difficulty);
              const pending =
                question.pending_count ??
                question.ungraded_count ??
                0;
              const maybePendingMeta = pendingMeta(pending);
              const isScores = question.analysis_mode === 'SCORES';
              const successPct = isScores
                ? (() => {
                    const max = question.max_points ?? question.points ?? 0;
                    const avg = question.avg_score ?? 0;
                    return max > 0 ? (avg / max) * 100 : 0;
                  })()
                : (question.correct_percentage || 0);
              const perf = maybePendingMeta ?? statusMetaFromPct(successPct);
              const distEntries = Object.entries(question.choice_distribution || {});
              const hasChoiceDist = !isScores && question.total_attempts > 0 && distEntries.length > 0;
              const scoreEntries = question.score_distribution || [];
              const hasScoreDist = isScores && scoreEntries.length > 0;

              return (
                <div key={question.question_id} className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
                  {/* header */}
                  <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/40">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {perf.icon}
                          <div className="font-bold text-slate-900 text-sm">
                            Question {index + 1}
                            <span className="ml-1.5 text-xs text-slate-500 font-semibold">
                              ({question.points} pt{question.points !== 1 ? 's' : ''})
                            </span>
                          </div>
                          <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${diffChip}`}>
                            {question.difficulty}
                          </span>
                          <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${perf.chip}`}>
                            {perf.label}
                          </span>
                        </div>

                        <div className="text-sm font-medium text-slate-800">{question.question_text}</div>
                        <div className="text-xs text-slate-400 font-medium">
                          Type: {question.question_type.replace('_', ' ')}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 shadow-2xs text-right">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            {isScores ? 'Avg Score %' : 'Success'}
                          </div>
                          <div className="text-lg font-bold font-mono text-slate-900">{pct(successPct)}%</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* stats */}
                  <div className="p-4 sm:p-5">
                    <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                      <div className="rounded-lg border border-slate-200/80 bg-white p-3 shadow-2xs">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Attempts</div>
                        <div className="mt-1 text-xl font-bold font-mono text-slate-900">{question.total_attempts}</div>
                      </div>

                      {isScores ? (
                        <>
                          <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/50 p-3 shadow-2xs">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Graded</div>
                            <div className="mt-1 text-xl font-bold font-mono text-emerald-800">{question.graded_count ?? 0}</div>
                          </div>

                          <div className="rounded-lg border border-amber-200/80 bg-amber-50/50 p-3 shadow-2xs">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">Pending</div>
                            <div className="mt-1 text-xl font-bold font-mono text-amber-800">{pending}</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/50 p-3 shadow-2xs">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Correct</div>
                            <div className="mt-1 text-xl font-bold font-mono text-emerald-800">{question.correct_count}</div>
                          </div>

                          <div className="rounded-lg border border-rose-200/80 bg-rose-50/50 p-3 shadow-2xs">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-rose-700">Incorrect</div>
                            <div className="mt-1 text-xl font-bold font-mono text-rose-800">{question.incorrect_count}</div>
                          </div>
                        </>
                      )}

                      <div className="rounded-lg border border-indigo-200/80 bg-indigo-50/50 p-3 shadow-2xs">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700">Tip</div>
                        <div className="mt-1 text-xs font-semibold text-indigo-800 line-clamp-2">{perf.tip}</div>
                      </div>
                    </div>


                    {/* distribution */}
                    {hasChoiceDist ? (
                      <div className="mt-6">
                        <div className="text-sm font-black text-slate-900">Answer Choice Distribution</div>
                        <div className="mt-3 space-y-2.5">
                          {distEntries.map(([choiceText, stats]) => (
                            <div key={choiceText} className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className={`text-xs font-semibold ${stats.is_correct ? 'text-emerald-700' : 'text-slate-800'} truncate`}>
                                    {stats.is_correct ? '✓ ' : ''}
                                    {choiceText}
                                  </div>
                                  <div className="mt-0.5 text-[11px] text-slate-500">
                                    {stats.count} response{stats.count !== 1 ? 's' : ''} • {pct(stats.percentage)}%
                                  </div>
                                </div>
                                <div className={`text-xs font-bold font-mono ${stats.is_correct ? 'text-emerald-700' : 'text-slate-600'}`}>
                                  {pct(stats.percentage)}%
                                </div>
                              </div>

                              <div className="mt-2.5 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className={stats.is_correct ? 'h-full bg-emerald-500' : 'h-full bg-slate-400'}
                                  style={{ width: `${Math.max(0, Math.min(100, stats.percentage))}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {question.ai_insight && (
                      <div className="mt-4 p-4 bg-indigo-50/60 border border-indigo-200/80 rounded-xl shadow-2xs">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 mb-2">
                          <Sparkles size={14} className="text-indigo-600" />
                          <span>AI Instructional Insight</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-700">
                          <div>
                            <span className="font-semibold text-slate-900 block">Misconception:</span>
                            <span className="text-slate-600">{question.ai_insight.misconception_analysis}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block">Teaching Strategy:</span>
                            <span className="text-slate-600">{question.ai_insight.teaching_strategy}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block">Remediation:</span>
                            <span className="text-slate-600">{question.ai_insight.remediation_suggestion}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block">Difficulty Validation:</span>
                            <span className="text-slate-600">{question.ai_insight.difficulty_validation}</span>
                          </div>
                        </div>

                        <div className="mt-2 text-[11px] text-slate-400">
                          Confidence: {(question.ai_insight.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    )}

                    {isScores ? (
                      <div className="mt-6">
                        <div className="flex items-end justify-between gap-3">
                          <div className="text-xs font-bold text-slate-900">Score Distribution</div>
                          <div className="text-xs text-slate-500">
                            Avg: {(question.avg_score ?? 0).toFixed(2)} / {(question.max_points ?? question.points ?? 0).toFixed(1)}
                          </div>
                        </div>

                        {pending > 0 ? (
                          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800">
                            {pending} answer(s) still need manual grading. Distribution reflects graded answers only.
                          </div>
                        ) : null}

                        {hasScoreDist ? (
                          <div className="mt-3 space-y-2.5">
                            {scoreEntries.map((b) => (
                              <div key={String(b.score)} className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="font-semibold text-xs text-slate-800">
                                    {b.score} / {(question.max_points ?? question.points ?? 0).toFixed(1)}
                                  </div>
                                  <div className="text-xs font-bold font-mono text-slate-600">{pct(b.percentage)}%</div>
                                </div>

                                <div className="mt-0.5 text-[11px] text-slate-500">
                                  {b.count} student{b.count !== 1 ? 's' : ''}
                                </div>

                                <div className="mt-2.5 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    className="h-full bg-indigo-500"
                                    style={{ width: `${Math.max(0, Math.min(100, b.percentage))}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50 p-4 text-xs text-slate-500">
                            No graded responses yet.
                          </div>
                        )}
                      </div>
                    ) : null}


                    {/* recommendations */}
                    {question.total_attempts > 0 ? (
                      <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <div className="text-sm font-black text-slate-900">Recommendations</div>
                        <ul className="mt-2 space-y-1 text-sm text-slate-700">
                          {successPct < 50 && (
                            <li>• This item is difficult for most students — consider reteaching or adding guided practice.</li>
                          )}
                          {successPct >= 75 && (
                            <li>• Students performed well — concept appears well understood.</li>
                          )}

                          {question.question_type === 'MULTIPLE_CHOICE' &&
                            Object.values(question.choice_distribution || {}).some((s) => !s.is_correct && s.percentage > 30) && (
                              <li>• A distractor has a high pick rate — review misconceptions tied to that option.</li>
                            )}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
