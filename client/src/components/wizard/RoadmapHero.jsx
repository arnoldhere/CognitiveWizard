import React from "react";
import { 
  Download, Flame, Clock, Brain, Target, ListOrdered, 
  ArrowDown, ClipboardCheck, CheckCircle2 
} from "lucide-react";

export default function RoadmapHero({
  title,
  description,
  goal,
  totalDuration,
  difficulty,
  learningStyle,
  prerequisites = [],
  outcomes = [],
  totalPhases = 0,
  onExplorePhases,
  onExportPdf,
}) {
  const hasPrereqs = Array.isArray(prerequisites) && prerequisites.length > 0;
  const hasOutcomes = Array.isArray(outcomes) && outcomes.length > 0;

  return (
    <div className="relative bg-slate-900 rounded-3xl p-8 md:p-12 overflow-hidden shadow-xl mb-12 border border-slate-800">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-500/20 blur-[100px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/3" />
      
      <div className="relative z-10">
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <span className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
            <Brain size={14} />
            {learningStyle || "Visual & Project-based"}
          </span>
          <span className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
            <Flame size={14} />
            {difficulty || "Intermediate"}
          </span>
        </div>

        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight tracking-tight">
          {title || "Personalized AI Roadmap"}
        </h1>
        <p className="text-lg md:text-xl text-slate-300 max-w-3xl mb-10 leading-relaxed font-medium">
          {description || "A structured milestone roadmap curated with AI and enhanced with reference resources."}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 p-5 rounded-2xl flex items-start gap-4">
            <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl shrink-0">
              <Target size={24} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Primary Goal</div>
              <div className="text-slate-100 font-bold">{goal || "Master Core Concepts"}</div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 p-5 rounded-2xl flex items-start gap-4">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl shrink-0">
              <Clock size={24} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Duration</div>
              <div className="text-slate-100 font-bold">{totalDuration || "4-6 Weeks"}</div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 p-5 rounded-2xl flex items-start gap-4">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
              <ListOrdered size={24} />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Phases</div>
              <div className="text-slate-100 font-bold">{totalPhases} Learning Milestones</div>
            </div>
          </div>
        </div>

        {(hasPrereqs || hasOutcomes) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {hasPrereqs && (
              <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-3xl">
                <div className="flex items-center gap-2 mb-4 text-blue-400 font-bold">
                  <ClipboardCheck size={20} />
                  <span>Prerequisites</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {prerequisites.map((req, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-slate-900/50 border border-slate-700 text-slate-300 rounded-lg text-sm font-medium">
                      {typeof req === "string" ? req : req.title || req.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {hasOutcomes && (
              <div className="bg-emerald-900/10 backdrop-blur-md border border-emerald-500/20 p-6 rounded-3xl">
                <div className="flex items-center gap-2 mb-4 text-emerald-400 font-bold">
                  <CheckCircle2 size={20} />
                  <span>Expected Outcomes</span>
                </div>
                <ul className="space-y-3">
                  {outcomes.map((out, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-slate-300">
                      <CheckCircle2 size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                      <span className="font-medium">{typeof out === "string" ? out : out.title || out.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4">
          {onExplorePhases && (
            <button 
              className="flex items-center gap-2 px-8 py-4 bg-primary hover:bg-opacity-90 text-slate-900 font-bold rounded-xl transition-all shadow-lg shadow-primary/20 hover:-translate-y-0.5" 
              onClick={onExplorePhases}
            >
              <span>Explore Milestones</span>
              <ArrowDown size={18} />
            </button>
          )}

          <button 
            className="flex items-center gap-2 px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold rounded-xl transition-colors shadow-sm" 
            onClick={onExportPdf}
          >
            <Download size={18} />
            <span>Download PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
