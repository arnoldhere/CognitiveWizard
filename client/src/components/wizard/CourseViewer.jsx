/**
 * components/wizard/CourseViewer.jsx
 * =====================================
 * Main course experience component — sidebar navigation + lesson reader.
 *
 * Layout:
 *  ┌─────────────────┬──────────────────────────────────┐
 *  │  Course sidebar │        Lesson Reader              │
 *  │ ┌─ Phase 1     │  📖 Read | 🎥 Watch | 💻 Code ... │
 *  │ │  ∟ Module 1  │                                    │
 *  │ │    ∟ Lesson  │  [Lesson content renders here]     │
 *  │ │    ∟ Lesson  │                                    │
 *  │ └─ Phase 2     │                                    │
 *  └─────────────────┴──────────────────────────────────┘
 *
 * On mobile: sidebar slides in from left as a drawer.
 *
 * State:
 *  - Tracks selected lessonId
 *  - Builds a flat lesson list for prev/next navigation
 *  - Tracks completion per lesson in localStorage
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  BookOpen, ChevronDown, ChevronRight, Menu, X,
  CheckCircle2, Circle, Layers, Clock, Loader,
  GraduationCap, PlayCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import LessonReader from "./LessonReader";

const cn = (...classes) => classes.filter(Boolean).join(" ");

// ── Flatten all lessons from phases → modules → lessons ───────────────────────
function buildFlatLessonList(phases) {
  const lessons = [];
  (phases || []).forEach((phase, pi) => {
    (phase.modules || []).forEach((module, mi) => {
      (module.lessons || []).forEach((lesson, li) => {
        lessons.push({
          ...lesson,
          phaseIdx: pi,
          moduleIdx: mi,
          lessonIdx: li,
          phaseName: phase.title,
          moduleName: module.title,
        });
      });
    });
  });
  return lessons;
}

// ── Phase section in sidebar ──────────────────────────────────────────────────
function PhaseSection({ phase, phaseIdx, activeLesson, onSelectLesson, completedIds, isFirst }) {
  const [isOpen, setIsOpen] = useState(phaseIdx === 0); // first phase open by default

  // Auto-open if active lesson is in this phase
  const hasActiveLesson = useMemo(() =>
    (phase.modules || []).some((m) =>
      (m.lessons || []).some((l) => l.id === activeLesson?.id)
    ),
    [phase, activeLesson]
  );

  useEffect(() => {
    if (hasActiveLesson) setIsOpen(true);
  }, [hasActiveLesson]);

  const totalLessons = (phase.modules || []).reduce(
    (acc, m) => acc + (m.lessons || []).length, 0
  );
  const completedInPhase = (phase.modules || []).reduce(
    (acc, m) => acc + (m.lessons || []).filter((l) => completedIds.has(l.id)).length,
    0
  );

  return (
    <div className="mb-2">
      {/* Phase header */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-100"
      >
        <div className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black",
          isOpen ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
        )}>
          {phaseIdx + 1}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-800">{phase.title}</p>
          <p className="text-[11px] font-medium text-slate-400">
            {completedInPhase}/{totalLessons} lessons
          </p>
        </div>
        {isOpen ? (
          <ChevronDown size={15} className="shrink-0 text-slate-400" />
        ) : (
          <ChevronRight size={15} className="shrink-0 text-slate-400" />
        )}
      </button>

      {/* Phase modules + lessons */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-3 mt-1 border-l-2 border-slate-100 pl-3">
              {(phase.modules || []).map((module, mi) => (
                <ModuleSection
                  key={module.id || mi}
                  module={module}
                  activeLesson={activeLesson}
                  onSelectLesson={onSelectLesson}
                  completedIds={completedIds}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Module section ────────────────────────────────────────────────────────────
function ModuleSection({ module, activeLesson, onSelectLesson, completedIds }) {
  const hasActiveLesson = (module.lessons || []).some((l) => l.id === activeLesson?.id);
  const [isOpen, setIsOpen] = useState(hasActiveLesson);

  useEffect(() => {
    if (hasActiveLesson) setIsOpen(true);
  }, [hasActiveLesson]);

  return (
    <div className="mb-1">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg py-1.5 pr-2 text-left transition hover:bg-slate-100/80"
      >
        <Layers size={13} className="shrink-0 text-slate-400" />
        <span className="flex-1 truncate text-xs font-semibold text-slate-600">
          {module.title}
        </span>
        {isOpen ? (
          <ChevronDown size={12} className="shrink-0 text-slate-400" />
        ) : (
          <ChevronRight size={12} className="shrink-0 text-slate-400" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="mt-0.5 space-y-0.5 pl-4">
              {(module.lessons || []).map((lesson, li) => {
                const isActive = activeLesson?.id === lesson.id;
                const isCompleted = completedIds.has(lesson.id);

                return (
                  <button
                    key={lesson.id || li}
                    onClick={() => onSelectLesson(lesson)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-xs transition",
                      isActive
                        ? "bg-blue-50 font-bold text-blue-700"
                        : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />
                    ) : (
                      <Circle size={13} className={cn("shrink-0", isActive ? "text-blue-500" : "text-slate-300")} />
                    )}
                    <span className="flex-1 leading-snug line-clamp-2">{lesson.title}</span>
                    {lesson.estimated_time && (
                      <span className="shrink-0 text-[10px] text-slate-400 hidden sm:inline">
                        {lesson.estimated_time}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Course overview card (no lesson selected) ─────────────────────────────────
function CourseOverview({ content, flatLessons, completedIds, onStartLearning }) {
  const totalLessons = flatLessons.length;
  const completedCount = completedIds.size;
  const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div className="flex flex-col items-center py-12 text-center">
      {/* Course icon */}
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-200">
        <GraduationCap size={36} className="text-white" />
      </div>

      <h2 className="mb-1 text-2xl font-black text-slate-900">{content.topic}</h2>
      <span className="mb-5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">
        {content.content_type}
      </span>

      {/* Stats */}
      <div className="mb-6 flex gap-6 text-sm">
        <div className="text-center">
          <p className="text-2xl font-black text-slate-900">{content.phases?.length || 0}</p>
          <p className="font-medium text-slate-400">Phases</p>
        </div>
        <div className="h-full w-px bg-slate-200" />
        <div className="text-center">
          <p className="text-2xl font-black text-slate-900">{totalLessons}</p>
          <p className="font-medium text-slate-400">Lessons</p>
        </div>
        <div className="h-full w-px bg-slate-200" />
        <div className="text-center">
          <p className="text-2xl font-black text-slate-900">{completedCount}</p>
          <p className="font-medium text-slate-400">Completed</p>
        </div>
      </div>

      {/* Progress bar */}
      {totalLessons > 0 && (
        <div className="mb-6 w-full max-w-sm">
          <div className="mb-1.5 flex justify-between text-xs font-bold text-slate-500">
            <span>Progress</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
        </div>
      )}

      <button
        onClick={onStartLearning}
        disabled={!flatLessons[0]}
        className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-50"
      >
        <PlayCircle size={18} />
        {completedCount > 0 ? "Continue Learning" : "Start Learning"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main CourseViewer Component
// ─────────────────────────────────────────────────────────────────────────────

export default function CourseViewer({ content }) {
  const phases = content?.phases || [];
  const flatLessons = useMemo(() => buildFlatLessonList(phases), [phases]);

  const [activeLesson, setActiveLesson] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer

  // Persist completion state in localStorage (keyed by content_id)
  const storageKey = `course-completed-${content?.id}`;
  const [completedIds, setCompletedIds] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const markCompleted = useCallback((lessonId) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      next.add(lessonId);
      localStorage.setItem(storageKey, JSON.stringify([...next]));
      return next;
    });
  }, [storageKey]);

  const handleSelectLesson = useCallback((lesson) => {
    setActiveLesson(lesson);
    setSidebarOpen(false); // close mobile drawer
  }, []);

  const handleStartLearning = useCallback(() => {
    // Continue from last incomplete lesson or start from first
    const firstIncomplete = flatLessons.find((l) => !completedIds.has(l.id));
    setActiveLesson(firstIncomplete || flatLessons[0] || null);
  }, [flatLessons, completedIds]);

  // Flat navigation: find current lesson index for prev/next
  const currentIdx = activeLesson
    ? flatLessons.findIndex((l) => l.id === activeLesson.id)
    : -1;

  const handlePrev = useCallback(() => {
    if (currentIdx > 0) setActiveLesson(flatLessons[currentIdx - 1]);
  }, [currentIdx, flatLessons]);

  const handleNext = useCallback(() => {
    if (currentIdx >= 0 && currentIdx < flatLessons.length - 1) {
      if (activeLesson?.id) markCompleted(activeLesson.id);
      setActiveLesson(flatLessons[currentIdx + 1]);
    } else if (activeLesson?.id) {
      markCompleted(activeLesson.id);
    }
  }, [currentIdx, flatLessons, activeLesson, markCompleted]);

  if (!phases.length) {
    return (
      <div className="flex min-h-[400px] items-center justify-center gap-3 text-center">
        <Loader size={28} className="animate-spin text-blue-400" />
        <p className="text-sm text-slate-500">Course content is being prepared...</p>
      </div>
    );
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      {/* Sidebar header */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4">
        <BookOpen size={18} className="text-blue-600" />
        <h2 className="flex-1 text-sm font-black text-slate-800 line-clamp-1">
          {content.topic}
        </h2>
        {/* Mobile close */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 lg:hidden"
        >
          <X size={16} />
        </button>
      </div>

      {/* Course nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {/* Back to overview */}
        <button
          onClick={() => setActiveLesson(null)}
          className="mb-3 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <GraduationCap size={14} />
          Course Overview
        </button>

        {phases.map((phase, pi) => (
          <PhaseSection
            key={phase.id || pi}
            phase={phase}
            phaseIdx={pi}
            isFirst={pi === 0}
            activeLesson={activeLesson}
            onSelectLesson={handleSelectLesson}
            completedIds={completedIds}
          />
        ))}
      </nav>

      {/* Progress footer */}
      <div className="border-t border-slate-100 px-4 py-3">
        <div className="mb-1.5 flex justify-between text-[11px] font-bold text-slate-400">
          <span>{completedIds.size} / {flatLessons.length} completed</span>
          <span>{Math.round((completedIds.size / Math.max(flatLessons.length, 1)) * 100)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
            style={{ width: `${(completedIds.size / Math.max(flatLessons.length, 1)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        {sidebar}
      </aside>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            />
            {/* Drawer */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl lg:hidden flex flex-col"
            >
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-xl border border-slate-200 p-2 text-slate-600"
          >
            <Menu size={18} />
          </button>
          <span className="flex-1 truncate text-sm font-bold text-slate-800">
            {activeLesson ? activeLesson.title : content.topic}
          </span>
          {activeLesson && (
            <div className="flex items-center gap-1 text-xs font-medium text-slate-400">
              <span>{currentIdx + 1}/{flatLessons.length}</span>
            </div>
          )}
        </div>

        {/* Lesson index indicator — desktop */}
        {activeLesson && (
          <div className="hidden items-center justify-end border-b border-slate-200 bg-white px-6 py-2 lg:flex">
            <span className="text-xs font-semibold text-slate-400">
              Lesson {currentIdx + 1} of {flatLessons.length}
            </span>
          </div>
        )}

        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
          {!activeLesson ? (
            <CourseOverview
              content={content}
              flatLessons={flatLessons}
              completedIds={completedIds}
              onStartLearning={handleStartLearning}
            />
          ) : (
            <LessonReader
              contentId={content.id}
              lessonId={activeLesson.id}
              onBack={() => setActiveLesson(null)}
              onNext={handleNext}
              onPrev={handlePrev}
              hasNext={currentIdx < flatLessons.length - 1}
              hasPrev={currentIdx > 0}
            />
          )}
        </div>
      </main>
    </div>
  );
}
