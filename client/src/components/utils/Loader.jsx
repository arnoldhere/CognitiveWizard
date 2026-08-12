import { Loader2 } from "lucide-react";

export default function Loader({
  title = "Preparing your experience",
  subtitle = "Please wait while we load the next step.",
}) {
  return (
    <div className="w-full max-w-[420px] p-6 md:p-8 rounded-3xl bg-slate-900/95 text-white border border-slate-700/50 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-col gap-6">
        <div className="flex justify-center">
          <Loader2 size={64} className="text-cyan-400 animate-spin" strokeWidth={1.5} />
        </div>
        
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
          <p className="text-sm font-medium text-slate-300/80">{subtitle}</p>
        </div>
        
        <div className="h-2 w-full rounded-full bg-slate-700/50 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-400 animate-[progress_1.5s_ease-in-out_infinite] origin-left" style={{ width: '50%' }}></div>
        </div>
      </div>
    </div>
  );
}
