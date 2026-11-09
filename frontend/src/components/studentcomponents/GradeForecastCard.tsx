import React from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Award,
  Target,
  Compass,
  Layers,
  ShieldAlert,
  Info,
} from 'lucide-react';
import type { StudentGradeForecast } from '../../types/studentTypes';

interface GradeForecastCardProps {
  forecast?: StudentGradeForecast | null;
  isLoading?: boolean;
  subjectName?: string;
  className?: string;
}

export default function GradeForecastCard({
  forecast,
  isLoading = false,
  subjectName,
  className = '',
}: GradeForecastCardProps) {
  if (isLoading) {
    return (
      <div className={`rounded-xl border border-indigo-100 bg-indigo-50/30 p-6 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-xs font-semibold text-slate-600">
            Analyzing student assessment trajectory and generating AI forecast...
          </p>
        </div>
      </div>
    );
  }

  if (!forecast) {
    return null;
  }

  // Check if forecaster is dormant / ineligible
  const isEligible = forecast.eligible ?? forecast.is_eligible ?? true;
  const predictedGrade = forecast.predicted_grade ?? 75.0;
  const descriptor = forecast.performance_descriptor || getDescriptorFallback(predictedGrade);
  const riskLevel = forecast.risk_level || 'LOW';
  const trend = forecast.performance_trend || 'STABLE';

  function getDescriptorFallback(grade: number): string {
    if (grade >= 90.0) return 'Advancing';
    if (grade >= 85.0) return 'Benchmarking';
    if (grade >= 80.0) return 'Developing';
    if (grade >= 75.0) return 'Connecting';
    return 'Emerging';
  }

  function getDescriptorBadge(desc: string) {
    switch (desc) {
      case 'Advancing':
        return {
          icon: <Award size={14} className="text-emerald-600" />,
          style: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          descLabel: 'Advancing (Outstanding)',
        };
      case 'Benchmarking':
        return {
          icon: <Target size={14} className="text-indigo-600" />,
          style: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          descLabel: 'Benchmarking (Very Satisfactory)',
        };
      case 'Developing':
        return {
          icon: <Compass size={14} className="text-amber-600" />,
          style: 'bg-amber-50 text-amber-800 border-amber-200',
          descLabel: 'Developing (Satisfactory)',
        };
      case 'Connecting':
        return {
          icon: <Layers size={14} className="text-orange-600" />,
          style: 'bg-orange-50 text-orange-800 border-orange-200',
          descLabel: 'Connecting (Fairly Satisfactory)',
        };
      case 'Emerging':
      default:
        return {
          icon: <AlertTriangle size={14} className="text-rose-600" />,
          style: 'bg-rose-50 text-rose-800 border-rose-200',
          descLabel: 'Emerging (Did Not Meet Expectations)',
        };
    }
  }

  function getRiskBadge(risk: string) {
    switch (risk) {
      case 'LOW':
        return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20';
      case 'HIGH':
        return 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20';
      default:
        return 'bg-slate-50 text-slate-700 ring-1 ring-slate-200';
    }
  }

  function renderTrendIcon(t: string) {
    switch (t) {
      case 'IMPROVING':
        return (
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
            <TrendingUp size={14} className="text-emerald-600" />
            Improving
          </span>
        );
      case 'DECLINING':
        return (
          <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
            <TrendingDown size={14} className="text-rose-600" />
            Declining
          </span>
        );
      case 'STABLE':
      default:
        return (
          <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
            <Minus size={14} className="text-slate-500" />
            Stable
          </span>
        );
    }
  }

  const descMeta = getDescriptorBadge(descriptor);

  // ===================== STATE 1: INELIGIBLE / DORMANT =====================
  if (!isEligible) {
    return (
      <div
        className={`rounded-xl border border-amber-200/80 bg-amber-50/40 p-5 text-left transition-all ${className}`}
      >
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-amber-100 p-2 text-amber-700 shrink-0 mt-0.5">
            <ShieldAlert size={20} />
          </div>

          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  AI Grade Forecasting Dormant
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                  Awaiting DepEd Baseline
                </span>
              </div>
              <span className="text-[10px] font-mono font-medium text-amber-700">
                Minimum Eligibility Barrier Active
              </span>
            </div>

            <p className="text-xs text-amber-900 leading-relaxed">
              To guarantee mathematical accuracy and prevent distorted early projections, the
              forecasting engine requires at least <strong>1 graded Written Work (WW)</strong>,{' '}
              <strong>1 Performance Task (PT)</strong>, and{' '}
              <strong>1 Summative Assessment / Exam (FA)</strong>.
            </p>

            {forecast.reason && (
              <div className="rounded-lg bg-white/70 border border-amber-200/60 p-2.5 text-xs text-amber-950">
                <span className="font-semibold text-amber-900">Current Status: </span>
                {forecast.reason}
              </div>
            )}

            <div className="flex items-center gap-1.5 pt-1 text-[11px] text-amber-800 font-medium">
              <Info size={13} className="text-amber-600 shrink-0" />
              <span>
                Forecasting will activate automatically once your teacher records submissions across
                all 3 assessment components.
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===================== STATE 2: OPERATIONAL FORECAST =====================
  const confidencePercent = Math.round((forecast.confidence_score ?? 0.85) * 100);
  const strongTopics = forecast.strong_topics || [];
  const weakTopics = forecast.weak_topics || [];

  return (
    <div
      className={`rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/60 via-white to-slate-50/80 p-5 sm:p-6 text-left shadow-xs transition-all ${className}`}
    >
      {/* Top Banner Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-indigo-100/80">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-indigo-600 p-1.5 text-white shadow-2xs">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span>AI-Assisted Grade Forecast</span>
              {subjectName && (
                <span className="text-[11px] font-normal text-indigo-600">({subjectName})</span>
              )}
            </h3>
            <p className="text-[11px] text-slate-500">
              Curricular Trajectory Model • DepEd Order No. 8, s. 2015
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100/80 text-indigo-800 border border-indigo-200/60">
            {forecast.model_name || 'Gradient Boosting Regressor'}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
            Advisory Only
          </span>
        </div>
      </div>

      {/* Main 4-Column KPI Grid */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Predicted Final Transmuted Grade */}
        <div className="rounded-xl bg-white p-3.5 border border-indigo-100/80 shadow-2xs">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Predicted Final Grade
          </p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="font-mono text-2xl sm:text-3xl font-extrabold tracking-tight text-indigo-700">
              {predictedGrade.toFixed(1)}
            </span>
            <span className="text-xs font-semibold text-slate-400">/ 100</span>
          </div>
          <p className="mt-0.5 text-[10px] font-medium text-slate-500">
            {predictedGrade >= 75 ? 'Above Passing Mark' : 'Below Passing Baseline'}
          </p>
        </div>

        {/* Official Performance Descriptor */}
        <div className="rounded-xl bg-white p-3.5 border border-indigo-100/80 shadow-2xs">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Performance Descriptor
          </p>
          <div className="mt-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${descMeta.style}`}
            >
              {descMeta.icon}
              {descriptor}
            </span>
          </div>
          <p className="mt-1.5 text-[10px] text-slate-500 line-clamp-1">{descMeta.descLabel}</p>
        </div>

        {/* Academic Risk Level */}
        <div className="rounded-xl bg-white p-3.5 border border-indigo-100/80 shadow-2xs">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Academic Risk Level
          </p>
          <div className="mt-2">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide uppercase ${getRiskBadge(
                riskLevel
              )}`}
            >
              {riskLevel} RISK
            </span>
          </div>
          <p className="mt-1.5 text-[10px] text-slate-500">
            {riskLevel === 'LOW'
              ? 'Stable Mastery'
              : riskLevel === 'MEDIUM'
              ? 'Borderline Passing'
              : 'Immediate Intervention Needed'}
          </p>
        </div>

        {/* Performance Trend Trajectory */}
        <div className="rounded-xl bg-white p-3.5 border border-indigo-100/80 shadow-2xs">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Trajectory Trend
          </p>
          <div className="mt-2 text-xs font-bold">{renderTrendIcon(trend)}</div>
          <p className="mt-1.5 text-[10px] text-slate-500">
            Confidence: <span className="font-semibold text-slate-700">{confidencePercent}%</span>
          </p>
        </div>
      </div>

      {/* Topic Performance Evidence Grid (Figure 4.11 in Capstone Defense) */}
      {(strongTopics.length > 0 || weakTopics.length > 0) && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Strong Competencies */}
          <div className="rounded-xl bg-emerald-50/40 border border-emerald-200/60 p-3.5">
            <div className="flex items-center gap-1.5 mb-2">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-950">
                Strongest Learning Competencies
              </span>
            </div>
            {strongTopics.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {strongTopics.map((topic, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-white text-emerald-800 border border-emerald-200 shadow-3xs"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-emerald-700 italic">
                Sustained mastery recorded across ongoing lessons.
              </p>
            )}
          </div>

          {/* Weak Topics Needing Attention */}
          <div className="rounded-xl bg-amber-50/40 border border-amber-200/60 p-3.5">
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle size={14} className="text-amber-600" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-950">
                Areas for Focus & Remediation
              </span>
            </div>
            {weakTopics.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {weakTopics.map((topic, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-white text-amber-900 border border-amber-200 shadow-3xs"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-amber-800 italic">
                No acute failure vulnerabilities detected.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Actionable Pedagogical Recommendations */}
      {forecast.recommendations && (
        <div className="mt-4 rounded-xl bg-indigo-50/50 border border-indigo-100 p-3.5">
          <div className="flex items-start gap-2.5">
            <div className="rounded-md bg-indigo-600 p-1 text-white shrink-0 mt-0.5">
              <Lightbulb size={13} />
            </div>
            <div className="text-xs text-indigo-950 leading-relaxed">
              <span className="font-bold text-indigo-900 uppercase tracking-wider text-[10px] block mb-0.5">
                Targeted Learning Recommendations:
              </span>
              {forecast.recommendations}
            </div>
          </div>
        </div>
      )}

      {/* Advisory Compliance Disclaimer */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
        <span>
          Advisory estimate based on active submissions. Final official transmuted grade is certified
          by the subject teacher.
        </span>
        {forecast.generated_at && (
          <span className="font-mono">
            Updated: {new Date(forecast.generated_at).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}
