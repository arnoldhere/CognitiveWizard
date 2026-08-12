import React, { useState } from "react";
import { ChevronDown, ChevronUp, Clock, CheckCircle2, CheckSquare, Lightbulb, Code } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PhaseCard({
  phaseIndex,
  phase,
  defaultExpanded = true,
  cardRef,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const topics = phase.topics || [];
  const deliverables = phase.deliverables || phase.practical_tasks || [];

  return (
    <div
      ref={cardRef}
      id={`phase-card-${phaseIndex}`}
      className={`bg-white border transition-all duration-300 rounded-3xl overflow-hidden mb-6 group ${expanded ? 'border-primary/30 shadow-lg shadow-primary/5' : 'border-slate-200 shadow-sm hover:border-primary/50'}`}
    >
      <div 
        className={`p-6 md:p-8 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${expanded ? 'bg-primary/5' : 'bg-transparent'}`} 
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-6">
          <div className="hidden md:flex w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-400 items-center justify-center text-white font-black text-2xl shadow-lg shrink-0">
            {phaseIndex + 1}
          </div>
          <div>
            <div className="text-primary font-bold text-xs uppercase tracking-widest mb-1 md:hidden">
              Phase {phaseIndex + 1}
            </div>
            <h3 className="text-2xl font-bold text-slate-900 group-hover:text-primary transition-colors">{phase.title}</h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {phase.estimatedTime && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-full text-xs font-bold uppercase tracking-wider">
              <Clock size={14} className="text-primary" />
              <span>{phase.estimatedTime}</span>
            </div>
          )}
          {phase.difficulty && (
            <div className="px-3 py-1.5 bg-slate-900 text-white rounded-full text-xs font-bold uppercase tracking-wider">
              {phase.difficulty}
            </div>
          )}
          <button className="p-2 rounded-full hover:bg-slate-200 text-slate-400 transition-colors bg-white border border-slate-200 shadow-sm" aria-label="Toggle details">
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-6 md:px-8 pb-8"
          >
            {phase.description && (
              <p className="text-slate-600 text-lg leading-relaxed mb-8 pt-4 border-t border-slate-100">
                {phase.description}
              </p>
            )}

            {topics.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 text-indigo-600 font-bold text-lg">
                  <Lightbulb size={20} />
                  <span>Key Concepts & Objectives</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {topics.map((topic, tIdx) => (
                    <div key={tIdx} className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-2xl hover:bg-indigo-50 transition-colors">
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <h4 className="font-bold text-indigo-900 text-lg">{topic.name || topic.title || topic}</h4>
                        {topic.importance && (
                          <span className="px-2.5 py-1 bg-indigo-200 text-indigo-800 text-[10px] font-bold uppercase tracking-wider rounded-md shrink-0">
                            {topic.importance}
                          </span>
                        )}
                      </div>
                      {(topic.details || topic.description || topic.content) && (
                        <p className="text-slate-600 text-sm leading-relaxed mb-4">
                          {topic.details || topic.description || topic.content}
                        </p>
                      )}
                      {topic.practical_task && (
                        <div className="flex items-start gap-2 p-3 bg-white rounded-xl border border-indigo-100 text-indigo-700 text-sm font-semibold shadow-sm">
                          <Code size={16} className="mt-0.5 shrink-0 text-indigo-500" />
                          <span>Task: {topic.practical_task}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {deliverables.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4 text-cyan-600 font-bold text-lg">
                  <CheckSquare size={20} />
                  <span>Phase Deliverables</span>
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {deliverables.map((item, dIdx) => (
                    <li key={dIdx} className="flex items-start gap-3 bg-cyan-50/50 p-4 rounded-xl border border-cyan-100">
                      <CheckCircle2 size={18} className="text-cyan-500 mt-0.5 shrink-0" />
                      <span className="font-medium text-slate-700 text-sm">{typeof item === "string" ? item : item.title || item.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
