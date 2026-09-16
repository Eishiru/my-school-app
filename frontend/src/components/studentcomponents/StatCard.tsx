

interface StatCardProps {
  label: string;
  value: number | null | undefined;
}

const StatCard = ({
  label,
  value
}: StatCardProps) => {
  const hasValue = typeof value === 'number' && !Number.isNaN(value);
  const safeValue = hasValue ? value : 0;
  const ringDegrees = Math.max(0, Math.min(360, safeValue * 3.6));

  return (
    <section className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-[0_10px_35px_rgba(15,23,42,0.06)] sm:p-8">
      <h2 className="text-lg font-extrabold tracking-[-0.025em] text-slate-950">{label}</h2>
      <div className="mt-8 grid place-items-center">
        <div
          className="grid size-[200px] place-items-center rounded-full p-[10px]"
          style={{
            background: hasValue
              ? `conic-gradient(#5b4cf6 0deg ${ringDegrees * 0.72}deg, #7f6ff6 ${ringDegrees * 0.72}deg ${ringDegrees}deg, #ddd9ff ${ringDegrees}deg 360deg)`
              : '#f1f5f9',
          }}
        >
          <div className="grid size-full place-items-center rounded-full bg-white shadow-inner">
            <div className="text-center">
              <div className="text-[42px] font-extrabold tracking-[-0.04em] text-slate-950">
                {hasValue ? value.toFixed(1) : "—"}
              </div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-[0.04em] text-slate-500">Out of 100</div>
              
              {hasValue && (
                <div
                  className={`mt-2 flex flex-col items-center text-sm leading-tight font-bold ${
                    value >= 75 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {value >= 75 ? (
                    <span>Passing</span>
                  ) : (
                  <>
                    <span>Needs</span>
                    <span>Improvement</span>
                  </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatCard;