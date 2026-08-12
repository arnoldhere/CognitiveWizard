import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function TimelineNavigator({
  phases = [],
  activePhaseIndex = 0,
  onSelectPhase,
  defaultCollapsed = false,
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-12 transition-all">
      <div
        className="flex items-center justify-between cursor-pointer group mb-6"
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? "Expand timeline" : "Collapse timeline"}
      >
        <div className="flex items-center gap-4">
          <h3 className="text-2xl font-bold text-slate-900 group-hover:text-primary transition-colors">Roadmap Timeline</h3>
          <span className="px-3 py-1 bg-cyan-50 text-cyan-600 border border-cyan-100 rounded-full text-xs font-bold uppercase tracking-widest">
            {phases.length} Phases
          </span>
        </div>

        <button className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors" aria-label="Toggle timeline collapse">
          {collapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Desktop Vertical Timeline */}
          <div className="hidden md:flex flex-col gap-0 relative ml-4">
            <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-slate-100 -z-10" />
            {phases.map((phase, idx) => {
              const isActive = activePhaseIndex === idx;

              return (
                <div
                  key={idx}
                  className="flex items-start gap-8 group cursor-pointer py-4"
                  onClick={() => onSelectPhase(idx)}
                >
                  <div className="relative flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border-4 transition-all duration-300 ${isActive ? 'bg-primary text-slate-900 border-primary/20 shadow-lg shadow-primary/30 scale-110' : 'bg-white text-slate-400 border-slate-200 group-hover:border-primary/50 group-hover:text-primary'}`}>
                      {idx + 1}
                    </div>
                  </div>

                  <div className={`flex-1 p-6 rounded-2xl border transition-all duration-300 ${isActive ? 'bg-primary/5 border-primary shadow-md' : 'bg-white border-slate-200 group-hover:border-primary/50 group-hover:shadow-md'}`}>
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${isActive ? 'text-primary' : 'text-slate-400'}`}>Phase {idx + 1}</div>
                        <div className={`font-bold text-lg ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>{phase.title || `Phase ${idx + 1}`}</div>
                      </div>
                      {phase.estimatedTime && (
                        <div className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold whitespace-nowrap">
                          {phase.estimatedTime}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile Horizontal Timeline */}
          <div className="md:hidden flex overflow-x-auto gap-3 pb-4 snap-x">
            {phases.map((phase, idx) => {
              const isActive = activePhaseIndex === idx;

              return (
                <button
                  key={idx}
                  className={`flex items-center gap-3 p-4 rounded-2xl border min-w-[240px] snap-center transition-all ${isActive ? 'bg-primary border-primary text-slate-900 shadow-lg' : 'bg-white border-slate-200 text-slate-700'}`}
                  onClick={() => onSelectPhase(idx)}
                >
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {idx + 1}
                  </span>
                  <span className="font-bold text-left line-clamp-2 leading-tight">
                    {phase.title}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
