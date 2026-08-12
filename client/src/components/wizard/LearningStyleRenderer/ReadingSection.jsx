import React from "react";
import { BookOpen, ExternalLink, FileText, Star } from "lucide-react";

export default function ReadingSection({ topic, references = {} }) {
  const articles = references.article || [];
  const docs = references.official_docs || [];
  const papers = references.research_paper || [];

  const allReadingResources = [...articles, ...docs, ...papers];

  const defaultReadingCards = [
    {
      title: `${topic || "Subject"} Official Documentation & Guides`,
      source: "Official Docs",
      description: `Comprehensive reference manual and core specification guides for ${topic}.`,
      url: `https://www.google.com/search?q=${encodeURIComponent(topic || "")}+official+documentation`,
      relevance_score: 0.98,
    },
    {
      title: `Deep-Dive Architecture & Research Notes on ${topic || "Core Concepts"}`,
      source: "Research Papers & Articles",
      description: `In-depth technical papers and blog articles detailing best practices and underlying algorithms.`,
      url: `https://scholar.google.com/scholar?q=${encodeURIComponent(topic || "")}`,
      relevance_score: 0.94,
    },
  ];

  const displayList = allReadingResources.length > 0 ? allReadingResources : defaultReadingCards;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 w-fit">
          <BookOpen size={16} />
          <span className="text-xs font-bold uppercase tracking-widest">Theoretical & Reading Path</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Curated Reading, Docs & Research Papers</h2>
        <p className="text-slate-500 dark:text-slate-400">
          Master theoretical foundations with authoritative documentation, articles, and research papers for {topic}.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {displayList.map((item, idx) => (
          <div key={idx} className="flex flex-col p-6 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg hover:border-cyan-500/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300">
                <FileText size={14} />
                <span>{item.source || "Curated Reference"}</span>
              </div>
              {item.relevance_score && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-500 uppercase tracking-widest bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded">
                  <Star size={12} fill="currentColor" />
                  <span>{Math.round(item.relevance_score * 100)}% match</span>
                </div>
              )}
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{item.title}</h3>
            {item.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 flex-1">{item.description}</p>
            )}

            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors mt-auto"
              >
                <span>Read Reference</span>
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
