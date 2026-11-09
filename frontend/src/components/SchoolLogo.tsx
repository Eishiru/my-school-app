export const SchoolLogo = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    {/* Logo Mark */}
    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-sm ring-1 ring-indigo-200/60">
      <span className="text-sm font-black tracking-wide text-white">
        CMR
      </span>

      
    </div>

    {/* Brand */}
    <div className="flex flex-col text-left">
      <span className="text-base font-black leading-tight tracking-tight text-slate-950">
        ClaroEd
      </span>

      <span className="mt-0.5 text-[10px] font-bold uppercase leading-none tracking-[0.12em] text-slate-400">
        School Portal
      </span>
    </div>
  </div>
);
