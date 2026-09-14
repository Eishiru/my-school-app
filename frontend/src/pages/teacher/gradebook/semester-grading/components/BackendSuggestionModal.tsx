import React from "react";
import { Info, X, CheckCircle2, Code2, Sparkles } from "lucide-react";

interface BackendSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackendSuggestionModal: React.FC<BackendSuggestionModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-indigo-50/60 border-b border-indigo-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                Backend & Quiz Creation Integration Guide
              </h2>
              <p className="text-xs text-slate-500">
                How activities connect to Written Works, Performance Tasks, and Final Exam
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 text-xs text-slate-700 max-h-[75vh] overflow-y-auto">
          {/* Current State Notice */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Backend Status: Models Already Support Category Types!</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Your backend database model <code className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-800 font-mono">Quiz</code> in <code className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-800 font-mono">backend/LMS/models.py</code> already includes the <code className="font-bold text-indigo-700">grade_type</code> field:
            </p>
            <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] overflow-x-auto">
{`GRADE_TYPE_CHOICES = [
    ('WRITTEN_WORK', 'Written Work'),
    ('PERFORMANCE_TASK', 'Performance Task'),
    ('FINAL_EXAM', 'Final Exam'),
]
grade_type = models.CharField(max_length=20, choices=GRADE_TYPE_CHOICES, default='WRITTEN_WORK')`}
            </pre>
            <p className="text-slate-600 leading-relaxed">
              And <code className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-800 font-mono">QuizCreateUpdateSerializer</code> in <code className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-800 font-mono">backend/LMS/serializers.py</code> already accepts <code className="font-bold text-indigo-700 font-mono">grade_type</code> in its fields list!
            </p>
          </div>

          {/* What is currently missing */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
            <div className="font-bold text-amber-900 flex items-center gap-2 text-sm">
              <Info className="w-4 h-4 text-amber-600" />
              <span>Why Were Performance Tasks & Final Exam Empty?</span>
            </div>
            <p className="text-amber-800 leading-relaxed">
              In the frontend quiz creation form (<code className="bg-amber-100/80 px-1.5 py-0.5 rounded font-mono">CreateQuiz.tsx</code>), there was no dropdown field to pick between <strong>Written Work</strong>, <strong>Performance Task</strong>, or <strong>Final Exam</strong>. Therefore, every quiz created simply defaulted to <code className="font-mono font-bold">WRITTEN_WORK</code>.
            </p>
          </div>

          {/* Actionable Solution */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Recommended Steps for Permanent Integration:
            </h3>

            {/* Step 1 */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-[11px]">
                  1
                </span>
                <span>Add Category Dropdown to `CreateQuiz.tsx`</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Add an activity type selector in the quiz creation form so the teacher can pick:
              </p>
              <pre className="p-2.5 bg-slate-900 text-slate-200 rounded-lg font-mono text-[10px] overflow-x-auto">
{`<select value={form.grade_type} onChange={e => setForm({...form, grade_type: e.target.value})}>
  <option value="WRITTEN_WORK">Written Work (WW)</option>
  <option value="PERFORMANCE_TASK">Performance Task (PT)</option>
  <option value="FINAL_EXAM">Final Exam / Assessment</option>
</select>`}
              </pre>
            </div>

            {/* Step 2 */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-[11px]">
                  2
                </span>
                <span>Include `grade_type` in Create Quiz Payload</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Include <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">grade_type: form.grade_type</code> in <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">CreateQuizPayload</code> when submitting to <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">POST /teacher/quizzes/</code>.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-[11px]">
                  3
                </span>
                <span>Automatic Gradebook Sync</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Once saved, when students submit answers, the backend's <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">recalc_quarterly_component</code> automatically updates the respective component (<code className="font-mono">written_work_score</code>, <code className="font-mono">performance_task_score</code>, or <code className="font-mono">quarterly_assessment_score</code>) and computes the student's Final Grade!
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
