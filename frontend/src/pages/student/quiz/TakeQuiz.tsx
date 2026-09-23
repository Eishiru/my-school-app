import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock,
  AlertCircle,
  FileText,
  CheckCircle2,
  ArrowLeft,
  UploadCloud,
  X,
  Timer,
} from 'lucide-react';
import { useStartStudentQuiz, useSubmitStudentQuiz } from '../../../hooks/useStudentQuizzes';
import { StudentQuiz, StudentQuizQuestion } from '../../../types/studentTypes';

export default function TakeQuiz() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const startQuizMutation = useStartStudentQuiz();
  const submitQuizMutation = useSubmitStudentQuiz();

  const [quiz, setQuiz] = useState<StudentQuiz | null>(null);
  const [questions, setQuestions] = useState<StudentQuizQuestion[]>([]);
  const [attemptId, setAttemptId] = useState<number | null>(null);

  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [textAnswers, setTextAnswers] = useState<Record<number, string>>({});
  const [fileAnswers, setFileAnswers] = useState<Record<number, File>>({});

  // Timer states
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const startTimeRef = useRef<number | null>(null);
  const timerStoppedRef = useRef<boolean>(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Initialize Quiz Attempt
  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    const start = async () => {
      try {
        setInitError(null);
        const data = await startQuizMutation.mutateAsync(Number(id));
        if (!isMounted) return;

        if (!data.quiz) {
          throw new Error('Activity data not found in response');
        }

        setQuiz(data.quiz);
        setQuestions(data.questions || []);
        setAttemptId(data.attempt_id);

        startTimeRef.current = Date.now();
        if (data.quiz.time_limit && data.quiz.time_limit > 0) {
          setTimeLeft(data.quiz.time_limit * 60);
        } else {
          setTimeLeft(null);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Error starting quiz:', err);
        setInitError(err.message || 'Failed to start activity. Please try again.');
      }
    };

    start();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Tick Timer Effect
  useEffect(() => {
    if (!startTimeRef.current || timerStoppedRef.current) return;

    const interval = setInterval(() => {
      if (timerStoppedRef.current) return;

      const now = Date.now();
      const elapsed = Math.floor((now - (startTimeRef.current || now)) / 1000);
      setElapsedSeconds(elapsed);

      if (timeLeft !== null) {
        setTimeLeft((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            handleTimeExpiry();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  const handleTimeExpiry = () => {
    if (!timerStoppedRef.current) {
      submitQuiz(true);
    }
  };

  const submitQuiz = async (isAutoSubmit = false) => {
    if (!attemptId || submitQuizMutation.isPending || timerStoppedRef.current) return;

    // Immediately stop the timer
    timerStoppedRef.current = true;
    const finalSeconds = startTimeRef.current
      ? Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000))
      : elapsedSeconds;

    const answersArray = questions.map((question) => {
      const answer: any = {
        question_id: question.id,
      };

      if (question.question_type === 'MULTIPLE_CHOICE' || question.question_type === 'TRUE_FALSE') {
        if (answers[question.id]) {
          answer.selected_choice_id = answers[question.id];
        }
      }

      if (question.question_type === 'SHORT_ANSWER') {
        answer.text_answer = textAnswers[question.id] || '';
      }

      return answer;
    });

    try {
      const formData = new FormData();
      formData.append('answers', JSON.stringify(answersArray));
      formData.append('time_spent', String(finalSeconds));

      Object.entries(fileAnswers).forEach(([questionId, file]) => {
        formData.append(`answer_file_${questionId}`, file);
      });

      const response = await submitQuizMutation.mutateAsync({
        attemptId,
        formData,
      });

      if (!quiz) return;

      navigate('/student/activities/result', {
        state: {
          result: {
            score: response.score,
            total_points: response.total_points,
            percentage: response.percentage,
            status: response.status,
            requires_manual_grading: response.requires_manual_grading,
            is_closed: response.is_closed,
            time_spent: response.time_spent || finalSeconds,
            quiz_id: response.quiz_id || quiz.id,
            quiz_title: response.quiz_title || quiz.title,
            subject_name: response.subject_name || quiz.subject_name,
            subject_id: response.subject_id || quiz.subject || quiz.SubjectOffering,
            auto_submitted: isAutoSubmit,
          },
        },
      });
    } catch (error: any) {
      console.error('Error submitting quiz:', error);
      timerStoppedRef.current = false; // allow retry if error
      alert(error.message || 'Failed to submit quiz. Please check your connection.');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (startQuizMutation.isPending || (!quiz && !initError)) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Starting activity session...</p>
        </div>
      </div>
    );
  }

  if (initError || !quiz) {
    return (
      <div className="max-w-md mx-auto my-12 rounded-xl border border-rose-200 bg-rose-50/50 p-6 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
        <h3 className="mt-2 text-sm font-semibold text-rose-900">Cannot Start Activity</h3>
        <p className="mt-1 text-xs text-rose-600">{initError || 'The requested activity could not be loaded.'}</p>
        <button
          onClick={() => navigate('/student/activities')}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700"
        >
          <ArrowLeft size={14} /> Back to Activities
        </button>
      </div>
    );
  }

  const totalAnswered =
    Object.keys(answers).length +
    Object.values(textAnswers).filter((t) => t.trim().length > 0).length +
    Object.keys(fileAnswers).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Sticky Top Quiz Header */}
      <div className="sticky top-0 z-20 rounded-xl border border-slate-200/80 bg-white/95 backdrop-blur-sm p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">
              {quiz.subject_name}
            </span>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
              {quiz.title}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {questions.length} Questions • {quiz.total_points} Total Points
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0 text-right">
            {/* Elapsed Timer */}
            <div className="hidden sm:block text-right">
              <div className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-slate-500">
                <Timer size={13} className="text-slate-400" />
                {formatDuration(elapsedSeconds)}
              </div>
              <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">
                Elapsed
              </p>
            </div>

            {/* Time Limit Countdown (if configured) */}
            {timeLeft !== null ? (
              <div className="text-right">
                <div
                  className={`inline-flex items-center gap-1.5 font-mono text-xl sm:text-2xl font-bold ${
                    timeLeft < 300 ? 'text-rose-600 animate-pulse' : 'text-indigo-600'
                  }`}
                >
                  <Clock size={18} />
                  {formatDuration(timeLeft)}
                </div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">
                  Remaining
                </p>
              </div>
            ) : (
              <div className="text-right">
                <div className="inline-flex items-center gap-1.5 font-mono text-xl sm:text-2xl font-bold text-indigo-600">
                  <Clock size={18} />
                  {formatDuration(elapsedSeconds)}
                </div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">
                  Time Spent
                </p>
              </div>
            )}
          </div>
        </div>

        {quiz.description && (
          <p className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
            {quiz.description}
          </p>
        )}
      </div>

      {/* Questions Stack */}
      <div className="space-y-4">
        {questions && questions.length > 0 ? (
          questions.map((question, index) => (
            <div
              key={question.id}
              className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <h3 className="font-semibold text-sm text-slate-900">
                  <span className="font-mono text-indigo-600 mr-2">{index + 1}.</span>
                  {question.question_text}
                </h3>
                <span className="shrink-0 font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  {question.points} pt{question.points !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Multiple Choice */}
              {question.question_type === 'MULTIPLE_CHOICE' &&
                question.choices &&
                question.choices.length > 0 && (
                  <div className="space-y-2">
                    {question.choices.map((choice) => {
                      const isSelected = answers[question.id] === choice.id;
                      return (
                        <label
                          key={choice.id}
                          className={`flex items-center p-3 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50/50 text-indigo-950 ring-1 ring-indigo-500/20'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            value={choice.id}
                            checked={isSelected}
                            onChange={() =>
                              setAnswers({ ...answers, [question.id]: choice.id })
                            }
                            className="mr-3 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{choice.choice_text}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

              {/* True / False */}
              {question.question_type === 'TRUE_FALSE' &&
                question.choices &&
                question.choices.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {question.choices.map((choice) => {
                      const isSelected = answers[question.id] === choice.id;
                      return (
                        <label
                          key={choice.id}
                          className={`flex items-center justify-center p-3 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50/50 text-indigo-950 ring-1 ring-indigo-500/20'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            value={choice.id}
                            checked={isSelected}
                            onChange={() =>
                              setAnswers({ ...answers, [question.id]: choice.id })
                            }
                            className="mr-2 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{choice.choice_text}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

              {/* Short Answer / Essay */}
              {question.question_type === 'SHORT_ANSWER' && (
                <div className="space-y-3">
                  <textarea
                    value={textAnswers[question.id] || ''}
                    onChange={(e) =>
                      setTextAnswers({ ...textAnswers, [question.id]: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 p-3 text-xs text-slate-800 placeholder-slate-400 outline-none transition-colors hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 min-h-[100px]"
                    placeholder="Type your answer or essay here..."
                  />

                  <div className="pt-3 border-t border-slate-100">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                      Supporting attachment (optional):
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-colors shadow-2xs">
                        <UploadCloud size={13} className="text-slate-500" />
                        <span>Choose File</span>
                        <input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setFileAnswers({ ...fileAnswers, [question.id]: file });
                            }
                          }}
                          className="hidden"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                        />
                      </label>

                      {fileAnswers[question.id] ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/80">
                          <CheckCircle2 size={12} />
                          <span className="truncate max-w-[240px] font-medium">
                            {fileAnswers[question.id].name}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const copy = { ...fileAnswers };
                              delete copy[question.id];
                              setFileAnswers(copy);
                            }}
                            className="text-slate-400 hover:text-rose-600 ml-1 cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">No file chosen</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-slate-200/80 bg-white p-12 text-center shadow-xs">
            <FileText className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-700">
              No questions found for this activity.
            </p>
          </div>
        )}
      </div>

      {/* Submission Footer Bar */}
      {questions && questions.length > 0 && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-700">
              Answered:{' '}
              <span className="font-mono font-bold text-indigo-600">{totalAnswered}</span> /{' '}
              <span className="font-mono">{questions.length}</span>
            </span>
          </div>

          <button
            type="button"
            disabled={submitQuizMutation.isPending}
            onClick={() => submitQuiz(false)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition disabled:opacity-50 cursor-pointer"
          >
            {submitQuizMutation.isPending ? 'Submitting...' : 'Submit Answers'}
          </button>
        </div>
      )}
    </div>
  );
}

