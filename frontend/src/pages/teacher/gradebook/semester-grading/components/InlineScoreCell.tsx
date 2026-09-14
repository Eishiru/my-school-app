import React from "react";

interface InlineScoreCellProps {
  score: number | null | undefined;
  maxPoints: number;
  isModified?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  onChange: (value: number | null) => void;
}

export const InlineScoreCell: React.FC<InlineScoreCellProps> = ({
  score,
  maxPoints,
  isModified = false,
  disabled = false,
  readOnly = false,
  onChange,
}) => {
  if (readOnly) {
    if (score === null || score === undefined) {
      return (
        <span className="text-slate-300 font-mono text-xs select-none">—</span>
      );
    }
    return (
      <span className="inline-flex items-baseline justify-center gap-0.5 text-xs">
        <span className="font-bold text-slate-800">{score}</span>
        <span className="text-[10px] text-slate-400 font-medium select-none">
          /{maxPoints}
        </span>
      </span>
    );
  }
  const inputValue =
    score === null || score === undefined ? "" : String(score);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim();
    if (raw === "") {
      onChange(null);
      return;
    }

    const num = Number(raw);
    if (!Number.isNaN(num) && num >= 0) {
      onChange(num);
    }
  };

  const isOverMax =
    score !== null &&
    score !== undefined &&
    maxPoints > 0 &&
    score > maxPoints;

  return (
    <div className="flex items-center justify-center gap-1">
      <input
        type="number"
        min={0}
        max={maxPoints > 0 ? maxPoints : 100}
        step="0.5"
        disabled={disabled}
        value={inputValue}
        onChange={handleChange}
        placeholder="—"
        className={`w-14 px-1.5 py-1 text-center text-xs font-semibold rounded border transition-colors outline-none ${
          isOverMax
            ? "border-rose-400 bg-rose-50 text-rose-800 focus:ring-2 focus:ring-rose-400"
            : isModified
            ? "border-amber-400 bg-amber-50/70 text-amber-900 focus:ring-2 focus:ring-amber-400 font-bold"
            : score !== null && score !== undefined
            ? "border-slate-200 bg-slate-50 text-slate-800 focus:border-indigo-500 focus:bg-white focus:ring-1 focus:ring-indigo-500"
            : "border-slate-200 bg-white text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      />
      <span className="text-[11px] text-slate-400 font-medium select-none">
        /{maxPoints}
      </span>
    </div>
  );
};
