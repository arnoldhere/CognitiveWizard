import React from "react";
import { Code, Terminal, ExternalLink, Activity, Clock } from "lucide-react";

export default function CodingSection({ topic, modules = [] }) {
  const defaultCodingDrills = [
    {
      title: `${topic || "Core"} Fundamentals Drill`,
      difficulty: "Easy",
      estimated_time: "30 mins",
      tags: ["Hands-on", "Syntax", "Basics"],
      description: `Build a small working script implementing fundamental primitives in ${topic}.`,
      platform: "Internal Drill",
    },
    {
      title: "Data Structure & Algorithm Application",
      difficulty: "Medium",
      estimated_time: "45 mins",
      tags: ["Algorithms", "Problem Solving"],
      description: `Solve challenge problems reinforcing key algorithmic structures for ${topic}.`,
      link: "https://leetcode.com/",
      platform: "LeetCode",
    },
    {
      title: "Real-World Mini Project Execution",
      difficulty: "Hard",
      estimated_time: "90 mins",
      tags: ["System Design", "Integration"],
      description: `Construct a functional end-to-end service module incorporating best practices.`,
      link: "https://www.hackerrank.com/",
      platform: "HackerRank",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary w-fit">
          <Terminal size={16} />
          <span className="text-xs font-bold uppercase tracking-widest">Interactive & Coding Path</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Hands-on Coding Drills & Practice Problems</h2>
        <p className="text-slate-500 dark:text-slate-400">
          Reinforce roadmap concepts through interactive coding challenges, external problem sets, and drills.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {defaultCodingDrills.map((drill, idx) => (
          <div key={idx} className="flex flex-col p-6 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg hover:border-primary/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                <Code size={14} />
                <span>{drill.platform}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${
                  drill.difficulty === "Easy" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" :
                  drill.difficulty === "Medium" ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" :
                  "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                }`}>
                  {drill.difficulty}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <Clock size={12} />
                  {drill.estimated_time}
                </span>
              </div>
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{drill.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 flex-1">{drill.description}</p>

            <div className="flex flex-wrap gap-1.5 mb-6">
              {drill.tags.map((tag, tIdx) => (
                <span key={tIdx} className="px-2 py-1 rounded-md text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700">
                  #{tag}
                </span>
              ))}
            </div>

            {drill.link && (
              <a
                href={drill.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <span>Start Practice</span>
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
