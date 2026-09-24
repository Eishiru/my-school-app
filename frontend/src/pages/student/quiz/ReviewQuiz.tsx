import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  AlertCircle,
  FileText,
  FileCheck,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import { useStudentQuizReview } from '../../../hooks/useStudentQuizzes';

export default function ReviewQuiz() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useStudentQuizReview(id ? Number(id) : null);

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(undefined, {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Loading activity review...</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-md mx-auto my-12 rounded-xl border border-rose-200 bg-rose-50/50 p-6 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
        <h3 className="mt-2 text-sm font-semibold text-rose-900">Unable to Load Review</h3>
        <p className="mt-1 text-xs text-rose-600">
          {(error as Error)?.message || 'We could not retrieve your submission review.'}
        </p>
        <button
          onClick={() => navigate('/student/activities')}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
        >
          <ArrowLeft size={14} /> Back to Activities
        </button>
      </div>
    );
  }

  const isPendingGrading = data.status === 'SUBMITTED' || data.requires_manual_grading;
  const isPassing = (data.percentage || 0) >= 75;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between gap-4 mb-4">
          <button
            onClick={() => navigate('/student/activities')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Activities
          </button>

          <span
            className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
              isPendingGrading
                ? 'bg-amber-50 text-amber-700 border border-amber-200/80'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
            }`}
          >
            {isPendingGrading ? 'Pending Teacher Grading' : 'Final Grade Available'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">
              {data.subject_name}
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {data.quiz_title}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Submitted: {formatDate(data.submitted_at)}
            </p>
          </div>

          <div className="flex items-center gap-4 text-right">
            {/* Time spent */}
            {data.time_spent && data.time_spent > 0 ? (
              <div className="text-right">
                <div className="inline-flex items-center gap-1 font-mono text-sm font-semibold text-slate-700">
                  <Clock size={14} className="text-slate-400" />
                  {formatDuration(data.time_spent)}
                </div>
                <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">
                  Time Spent
                </p>
              </div>
            ) : null}

            {/* Score */}
            <div className="text-right pl-4 border-l border-slate-200">
              <div className="font-mono text-xl sm:text-2xl font-bold text-slate-900">
                {data.score !== null ? data.score : '—'}{' '}
                <span className="text-sm font-normal text-slate-400">/ {data.total_points}</span>
              </div>
              <div className="mt-0.5">
                {data.percentage !== null ? (
                  <span
                    className={`font-mono text-[10px] font-bold px-2 py-0.2 rounded-md ${
                      isPassing
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                        : 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20'
                    }`}
                  >
                    {data.percentage.toFixed(1)}% {isPassing ? 'Passing' : 'Below Passing'}
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-amber-700">Grading Pending</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Closed / Review Status Banner */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <FileText size={13} className="text-slate-400" />
            {data.is_closed ? (
              <span className="text-slate-700 font-medium">
                Activity closed. Correct answer keys are displayed below.
              </span>
            ) : (
              <span className="text-amber-700 font-medium">
                Activity is still active. Full answer key will become available after the activity closes.
              </span>
            )}
          </span>
          <span className="font-mono font-medium">{data.answers?.length || 0} Questions</span>
        </div>
      </div>

      {/* Answers List */}
      <div className="space-y-4">
        {(data.answers || []).map((ans, idx) => {
          const isShortAnswer = ans.question_type === 'SHORT_ANSWER';
          const isPendingItemGrading = isShortAnswer && !ans.manually_graded;
          const pointsEarned = ans.points_earned ?? 0;
          const totalPts = ans.question_points ?? 0;
          const isFullPoints = pointsEarned === totalPts && totalPts > 0;
          const isZeroPoints = pointsEarned === 0;

          return (
            <div
              key={ans.id}
              className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all"
            >
              {/* Question Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-2">
                  <span className="font-mono text-sm font-bold text-indigo-600">
                    {ans.question_order || idx + 1}.
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 leading-snug">
                      {ans.question_text}
                    </h3>
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 mt-0.5 inline-block">
                      {ans.question_type.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Question Score Badge */}
                <div className="shrink-0 text-right">
                  {isPendingItemGrading ? (
                    <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 ring-1 ring-amber-600/20">
                      Pending Grading
                    </span>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1 font-mono text-xs font-bold px-2.5 py-0.5 rounded-md ${
                        isFullPoints
                          ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                          : isZeroPoints
                          ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20'
                          : 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20'
                      }`}
                    >
                      {isFullPoints ? (
                        <CheckCircle2 size={12} />
                      ) : isZeroPoints ? (
                        <XCircle size={12} />
                      ) : (
                        <CheckCircle2 size={12} />
                      )}
                      {pointsEarned} / {totalPts} pts
                    </span>
                  )}
                </div>
              </div>

              {/* Multiple Choice / True-False Choices */}
              {!isShortAnswer && ans.choices && ans.choices.length > 0 && (
                <div className="mt-3 space-y-2">
                  {ans.choices.map((choice) => {
                    const isSelected = ans.selected_choice === choice.id;
                    const isCorrect = choice.is_correct === true;

                    let choiceStyle = 'border-slate-200 bg-white text-slate-700';
                    let badgeLabel: React.ReactNode = null;

                    if (isSelected && isCorrect) {
                      choiceStyle =
                        'border-emerald-500 bg-emerald-50/50 text-emerald-950 ring-1 ring-emerald-500/20 font-semibold';
                      badgeLabel = (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                          <Check size={12} /> Your Choice (Correct)
                        </span>
                      );
                    } else if (isSelected && !isCorrect) {
                      choiceStyle =
                        'border-rose-300 bg-rose-50/50 text-rose-950 ring-1 ring-rose-300/20 font-semibold';
                      badgeLabel = (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700">
                          <X size={12} /> Your Choice (Incorrect)
                        </span>
                      );
                    } else if (isCorrect) {
                      // Revealed correct answer that student didn't pick
                      choiceStyle =
                        'border-emerald-400 bg-emerald-50/30 text-emerald-900 border-dashed';
                      badgeLabel = (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                          <Check size={12} /> Correct Answer
                        </span>
                      );
                    }

                    return (
                      <div
                        key={choice.id}
                        className={`flex items-center justify-between p-3 rounded-lg border text-xs transition-colors ${choiceStyle}`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-4 w-4 rounded-full border flex items-center justify-center text-[10px] ${
                              isSelected
                                ? isCorrect
                                  ? 'border-emerald-600 bg-emerald-600 text-white'
                                  : 'border-rose-600 bg-rose-600 text-white'
                                : isCorrect
                                ? 'border-emerald-600 text-emerald-600'
                                : 'border-slate-300'
                            }`}
                          >
                            {isSelected ? '✓' : ''}
                          </div>
                          <span>{choice.choice_text}</span>
                        </div>
                        {badgeLabel}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Short Answer / Essay Response */}
              {isShortAnswer && (
                <div className="mt-3 space-y-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Your Submitted Answer:
                    </p>
                    <p className="text-xs text-slate-800 whitespace-pre-wrap font-medium">
                      {ans.text_answer || <span className="italic text-slate-400">No written answer submitted.</span>}
                    </p>

                    {(ans.answer_file_url || ans.answer_file) && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center gap-2">
                        <a
                          href={ans.answer_file_url || ans.answer_file || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          <ExternalLink size={12} /> View Attached File
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Teacher Feedback / Comments Box */}
                  {ans.teacher_feedback ? (
                    <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 mb-1">
                        <MessageSquare size={13} className="text-indigo-600" />
                        Teacher Feedback:
                      </div>
                      <p className="text-xs text-indigo-950 whitespace-pre-wrap">
                        {ans.teacher_feedback}
                      </p>
                    </div>
                  ) : isPendingItemGrading ? (
                    <p className="text-[11px] text-amber-700 italic flex items-center gap-1">
                      <FileCheck size={12} /> Teacher has not reviewed this response yet.
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
