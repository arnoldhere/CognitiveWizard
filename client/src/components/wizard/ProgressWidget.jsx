import React from "react";
import { TrendingUp, Flag, ArrowRight, CheckCircle2 } from "lucide-react";

export default function ProgressWidget({
  completedCount = 0,
  totalCount = 0,
  nextPhaseTitle,
  onContinueLearning,
}) {
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  // Circumference for the SVG circle (r=42, C=2*pi*r ≈ 264)
  const circumference = 264;
  const strokeDashoffset = circumference - (circumference * percent) / 100;

  return (
    <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="text-cyan-500" size={20} />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Your Learning Progress</h3>
      </div>

      <div className="flex items-center gap-6 mb-6">
        <div className="relative w-[100px] h-[100px] shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle 
              className="text-slate-100 dark:text-slate-700 stroke-current" 
              strokeWidth="8" 
              cx="50" cy="50" r="42" 
              fill="transparent" 
            />
            <circle
              className="text-primary stroke-current transition-all duration-1000 ease-out"
              strokeWidth="8"
              strokeLinecap="round"
              cx="50" cy="50" r="42"
              fill="transparent"
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: strokeDashoffset,
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-black text-slate-900 dark:text-white">{percent}%</span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Complete</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 flex-1 min-w-0">
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Completed</span>
            <span className="text-sm font-black text-slate-900 dark:text-white">{completedCount} <span className="text-slate-400 font-medium">of</span> {totalCount}</span>
          </div>
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Remaining</span>
            <span className="text-sm font-black text-slate-900 dark:text-white">{totalCount - completedCount} <span className="text-slate-400 font-medium">Phases</span></span>
          </div>
        </div>
      </div>

      {nextPhaseTitle && percent < 100 && (
        <div className="mb-6 p-4 rounded-xl border border-primary/20 bg-primary/5">
          <div className="flex items-center gap-1.5 mb-1 text-primary">
            <Flag size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Next Target</span>
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white truncate" title={nextPhaseTitle}>
            {nextPhaseTitle}
          </div>
        </div>
      )}

      {percent === 100 && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10">
          <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
          <span className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Congratulations! You completed this roadmap!</span>
        </div>
      )}

      <div className="mt-auto">
        {onContinueLearning && percent < 100 && (
          <button 
            className="flex items-center justify-center gap-2 w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-xl transition-colors" 
            onClick={onContinueLearning}
          >
            <span>Continue Learning</span>
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
