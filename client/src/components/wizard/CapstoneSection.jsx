import React from "react";
import { Rocket, Star, CheckCircle2, Award } from "lucide-react";

export default function CapstoneSection({ topic, capstoneData }) {
  const capstone = capstoneData || {
    title: `Full-Stack ${topic || "Project"} Capstone Showcase`,
    description: `Synthesize everything you have learned throughout this roadmap into a production-ready application and open-source project.`,
    skills: ["System Architecture", "Best Practices", "End-to-End Build", "Documentation"],
    deliverables: [
      "Working live application demo or open-source repository",
      "Comprehensive README.md with setup guide & architecture diagram",
      "Suite of unit and integration tests verifying functionality",
    ],
    bonus_features: [
      "Deploy to cloud platform (Vercel / Render / AWS)",
      "Add interactive UI dashboard or CLI interface",
    ],
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-8 md:p-10 text-white shadow-xl relative overflow-hidden border border-indigo-800/50">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/20 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3" />
      
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-indigo-800/50 backdrop-blur-md border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-inner">
          <Rocket size={32} className="text-indigo-300" />
        </div>
        <div>
          <div className="inline-flex px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-full text-[10px] font-bold uppercase tracking-widest mb-2 backdrop-blur-sm">
            Final Mastery Outcome
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">{capstone.title}</h2>
        </div>
      </div>

      <p className="relative z-10 text-indigo-100/80 text-lg leading-relaxed mb-10 max-w-3xl">
        {capstone.description}
      </p>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {capstone.skills && capstone.skills.length > 0 && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            <div className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-4">Skills Applied</div>
            <div className="flex flex-wrap gap-2">
              {capstone.skills.map((skill, sIdx) => (
                <span key={sIdx} className="px-3 py-1.5 bg-indigo-500/20 border border-indigo-500/30 rounded-lg text-sm font-medium text-indigo-100">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {capstone.deliverables && capstone.deliverables.length > 0 && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 lg:col-span-2">
            <div className="text-xs font-bold text-cyan-300 uppercase tracking-widest mb-4">Required Deliverables</div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {capstone.deliverables.map((item, dIdx) => (
                <li key={dIdx} className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-cyan-400 mt-0.5 shrink-0" />
                  <span className="text-slate-200 font-medium text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {capstone.bonus_features && capstone.bonus_features.length > 0 && (
          <div className="bg-amber-900/20 backdrop-blur-sm border border-amber-500/20 rounded-2xl p-6 lg:col-span-3">
            <div className="text-xs font-bold text-amber-300 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Award size={14} />
              <span>Bonus Showcase Goals</span>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {capstone.bonus_features.map((item, bIdx) => (
                <li key={bIdx} className="flex items-start gap-3">
                  <Star size={16} className="text-amber-400 mt-0.5 shrink-0" />
                  <span className="text-amber-100/80 font-medium text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
