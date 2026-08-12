import React from "react";
import { ArrowLeft, FileText, RefreshCw, Sparkles } from "lucide-react";

export default function RoadmapHeader({
  title,
  onBack,
  onRegenerate,
  onExportPdf,
}) {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 w-full shadow-sm">
      <div className="flex items-center gap-4 w-full md:w-auto">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors shrink-0"
            title="Back to generator"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary mb-0.5">
            <Sparkles size={12} />
            <span>Agent Enriched</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 truncate max-w-lg">
            {title || "AI Learning Roadmap"}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 shrink-0">
        <button
          onClick={onExportPdf}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm whitespace-nowrap"
          title="Export as PDF / Print"
        >
          <FileText size={16} />
          <span>Export PDF</span>
        </button>

        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors shadow-md text-sm whitespace-nowrap"
            title="Regenerate with AI"
          >
            <RefreshCw size={16} />
            <span>Regenerate</span>
          </button>
        )}
      </div>
    </header>
  );
}
