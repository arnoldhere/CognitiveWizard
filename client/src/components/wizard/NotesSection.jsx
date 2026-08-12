import React, { useState, useEffect } from "react";
import { PenTool, Save, Check } from "lucide-react";

export default function NotesSection({ topic }) {
  const storageKey = `roadmap_notes_${topic ? topic.replace(/\s+/g, "_") : "default"}`;

  const [notes, setNotes] = useState(() => {
    return localStorage.getItem(storageKey) || "";
  });

  const [savedStatus, setSavedStatus] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) {
      setNotes(saved);
    }
  }, [storageKey]);

  const handleNotesChange = (e) => {
    const text = e.target.value;
    setNotes(text);
    localStorage.setItem(storageKey, text);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 1500);
  };

  return (
    <div className="flex flex-col bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-3xl overflow-hidden">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 border-b border-amber-200 dark:border-amber-900/30">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <PenTool size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Study Notes & Reminders</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Jot down insights, concepts to revisit, and ideas as you work through {topic}.</p>
          </div>
        </div>

        <div className="shrink-0">
          {savedStatus ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-xs font-bold transition-all">
              <Check size={14} /> Saved
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 text-xs font-bold transition-all">
              <Save size={14} /> Auto-saves locally
            </span>
          )}
        </div>
      </div>

      <textarea
        className="w-full p-6 bg-transparent border-none outline-none resize-y min-h-[200px] text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 text-base leading-relaxed"
        placeholder="Type your study notes here..."
        value={notes}
        onChange={handleNotesChange}
        rows={8}
      />
    </div>
  );
}
