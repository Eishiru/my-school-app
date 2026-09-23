import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  ArrowLeft,
  LayoutDashboard,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  FileCheck,
  Eye,
} from 'lucide-react';
import { useStudentGradeForecast } from '../../../hooks/useStudentQuizzes';

interface QuizResultData {
  score: number;
  total_points: number;
  percentage: number;
  quiz_id?: number;
  quiz_title: string;
  subject_name: string;
  subject_id?: number;
  status?: string;
  requires_manual_grading?: boolean;
  is_closed?: boolean;
  time_spent?: number;
  auto_submitted?: boolean;
}

export default function QuizResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const [result, setResult] = useState<QuizResultData | null>(null);

  useEffect(() => {
    if (location.state && location.state.result) {
      setResult(location.state.result);
    } else {
      navigate('/student/activities');
    }
  }, [location, navigate]);

  const { data: forecast, isLoading: loadingForecast } = useStudentGradeForecast(
    result?.subject_id
  );

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const getRiskBadge = (risk: string) => {
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
  };

  const renderTrendIcon = (trend: string) => {
    switch (trend) {
      case 'IMPROVING':
        return <TrendingUp size={16} className="text-emerald-600" />;
      case 'STABLE':
        return <Minus size={16} className="text-slate-500" />;
      case 'DECLINING':
        return <TrendingDown size={16} className="text-rose-600" />;
      default:
        return null;
    }
  };

  if (!result) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Loading activity results...</p>
        </div>
      </div>
    );
  }

  const isPendingGrading =
    result.requires_manual_grading || result.status === 'SUBMITTED';
  const isPassing = (result.percentage || 0) >= 75;

  return (
    <div className="max-w-xl mx-auto space-y-6 py-6">
      {/* Result Card */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs text-center">
        {/* Header Icon */}
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full mb-4 ${
            isPendingGrading
              ? 'bg-amber-50 text-amber-600'
              : 'bg-emerald-50 text-emerald-600'
          }`}
        >
          {isPendingGrading ? <FileCheck size={28} /> : <CheckCircle2 size={28} />}
        </div>

        <span
          className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
            isPendingGrading
              ? 'bg-amber-50 text-amber-700 border border-amber-200/80'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
          }`}
        >
          {isPendingGrading
            ? 'Submission Received – Pending Teacher Grading'
            : 'Activity Completed & Graded'}
        </span>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          {result.quiz_title}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">{result.subject_name}</p>

        {/* Time Spent Pill */}
        {result.time_spent !== undefined && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-mono text-xs font-semibold">
            <Clock size={12} className="text-slate-400" />
            <span>Time Spent: {formatDuration(result.time_spent)}</span>
          </div>
        )}

        {/* Score or Pending Status Panel */}
        {isPendingGrading ? (
          <div className="my-6 rounded-xl border border-amber-200 bg-amber-50/40 p-5 text-left">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-amber-100 p-2 text-amber-700 shrink-0 mt-0.5">
                <AlertTriangle size={18} />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Teacher Evaluation Required
                </h3>
                <p className="text-xs text-amber-800 leading-relaxed">
                  This activity contains questions (such as essays or short answers) that require
                  teacher manual review. Your answers have been safely submitted.
                </p>
                <div className="mt-3 pt-3 border-t border-amber-200/60 flex items-center justify-between text-xs">
                  <span className="text-amber-800 font-medium">Auto-graded Points:</span>
                  <span className="font-mono font-bold text-amber-950">
                    {result.score} / {result.total_points}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="my-6 rounded-xl border border-slate-200 bg-slate-50/60 p-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Final Score
            </span>
            <div className="mt-2 font-mono text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">
              {result.score}{' '}
              <span className="text-2xl text-slate-400 font-medium">/ {result.total_points}</span>
            </div>

            <div className="mt-3 flex items-center justify-center gap-2">
              <span
                className={`font-mono text-sm font-bold px-2.5 py-0.5 rounded-md ${
                  isPassing
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                    : 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20'
                }`}
              >
                {result.percentage.toFixed(1)}%
              </span>
              <span className="text-xs font-medium text-slate-500">
                {isPassing ? 'Passing Mark' : 'Below Passing Mark'}
              </span>
            </div>

            {/* Performance Bar */}
            <div className="mt-4 w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isPassing ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, result.percentage))}%` }}
              />
            </div>
          </div>
        )}

        {/* AI Grade Insights (if available) */}
        {forecast && !loadingForecast && (
          <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 text-left">
            <div className="flex items-center gap-1.5 mb-3">
              <Sparkles size={14} className="text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Performance Standing
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-white p-2.5 border border-slate-100 shadow-2xs">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Predicted
                </p>
                <p className="font-mono text-base font-bold text-indigo-700 mt-0.5">
                  {forecast.predicted_grade.toFixed(1)}%
                </p>
              </div>

              <div className="rounded-lg bg-white p-2.5 border border-slate-100 shadow-2xs">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Risk Level
                </p>
                <span
                  className={`inline-flex items-center mt-1 px-2 py-0.2 rounded-md text-[10px] font-semibold ${getRiskBadge(
                    forecast.risk_level
                  )}`}
                >
                  {forecast.risk_level}
                </span>
              </div>

              <div className="rounded-lg bg-white p-2.5 border border-slate-100 shadow-2xs">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Trend
                </p>
                <div className="mt-0.5 flex items-center justify-center gap-1 text-xs font-semibold text-slate-700">
                  {renderTrendIcon(forecast.performance_trend)}
                  <span>{forecast.performance_trend}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Review Submission Link (if closed or reviewable) */}
        {result.quiz_id && result.is_closed && (
          <div className="mb-6">
            <Link
              to={`/student/activities/${result.quiz_id}/review`}
              className="inline-flex items-center justify-center gap-2 w-full rounded-lg border border-indigo-200 bg-indigo-50/60 px-4 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              <Eye size={14} /> Review Questions & Answers
            </Link>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/student/activities')}
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Activities
          </button>
          <button
            type="button"
            onClick={() => navigate('/student/dashboard')}
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <LayoutDashboard size={14} /> Student Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

