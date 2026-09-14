import React, { useState, useEffect } from "react";
import { SlidersHorizontal, AlertCircle, CheckCircle2, X } from "lucide-react";
import type { GradingMetrics } from "../types/gradingSheetTypes";

interface GradingMetricsModalProps {
  isOpen: boolean;
  initialMetrics: GradingMetrics;
  isSaving: boolean;
  onClose: () => void;
  onSave: (newMetrics: GradingMetrics) => Promise<void>;
}

export const GradingMetricsModal: React.FC<GradingMetricsModalProps> = ({
  isOpen,
  initialMetrics,
  isSaving,
  onClose,
  onSave,
}) => {
  const [metrics, setMetrics] = useState<GradingMetrics>(initialMetrics);

  useEffect(() => {
    setMetrics(initialMetrics);
  }, [initialMetrics, isOpen]);

  if (!isOpen) return null;

  const total =
    Number(metrics.ww_weight || 0) +
    Number(metrics.pt_weight || 0) +
    Number(metrics.sa_weight || 0);

  const isValid = total === 100;

  const handlePreset = (ww: number, pt: number, sa: number) => {
    setMetrics({
      ww_weight: ww,
      pt_weight: pt,
      sa_weight: sa,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSaving) return;
    await onSave(metrics);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Adjust Grading Metrics
              </h2>
              <p className="text-xs text-slate-500">
                Configure component weight distributions
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Quick presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Common Presets
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handlePreset(40, 40, 20)}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition ${
                  metrics.ww_weight === 40 &&
                  metrics.pt_weight === 40 &&
                  metrics.sa_weight === 20
                    ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                40 / 40 / 20
              </button>
              <button
                type="button"
                onClick={() => handlePreset(50, 30, 20)}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition ${
                  metrics.ww_weight === 50 &&
                  metrics.pt_weight === 30 &&
                  metrics.sa_weight === 20
                    ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                50 / 30 / 20
              </button>
              <button
                type="button"
                onClick={() => handlePreset(30, 50, 20)}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition ${
                  metrics.ww_weight === 30 &&
                  metrics.pt_weight === 50 &&
                  metrics.sa_weight === 20
                    ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                30 / 50 / 20
              </button>
            </div>
          </div>

          {/* Metric input fields */}
          <div className="space-y-3.5">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Written Works (WW)
                </label>
                <span className="text-xs text-slate-400 font-mono">
                  {metrics.ww_weight}%
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={metrics.ww_weight}
                  onChange={(e) =>
                    setMetrics((prev) => ({
                      ...prev,
                      ww_weight: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">
                  %
                </span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Performance Tasks (PT)
                </label>
                <span className="text-xs text-slate-400 font-mono">
                  {metrics.pt_weight}%
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={metrics.pt_weight}
                  onChange={(e) =>
                    setMetrics((prev) => ({
                      ...prev,
                      pt_weight: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">
                  %
                </span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Final Exam / Assessment
                </label>
                <span className="text-xs text-slate-400 font-mono">
                  {metrics.sa_weight}%
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={metrics.sa_weight}
                  onChange={(e) =>
                    setMetrics((prev) => ({
                      ...prev,
                      sa_weight: Number(e.target.value),
                    }))
                  }
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">
                  %
                </span>
              </div>
            </div>
          </div>

          {/* Validation Total Alert */}
          <div
            className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold ${
              isValid
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-rose-50 border-rose-200 text-rose-700"
            }`}
          >
            <div className="flex items-center gap-2">
              {isValid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600" />
              )}
              <span>
                {isValid
                  ? "Weights total 100% (Valid)"
                  : `Total must equal 100% (Currently ${total}%)`}
              </span>
            </div>
            <span className="font-bold text-sm">{total}%</span>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || isSaving}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Applying..." : "Apply Metrics"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
