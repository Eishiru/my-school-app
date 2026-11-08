import { Loader2 } from "lucide-react";

export default function PageLoader() {
  return (
    <div className="flex h-[50vh] min-h-[240px] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium text-slate-500">Loading...</p>
      </div>
    </div>
  );
}

