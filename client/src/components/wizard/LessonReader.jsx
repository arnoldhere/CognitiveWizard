/**
 * components/wizard/LessonReader.jsx
 * =====================================
 * Full lesson reading experience — tabbed multimodal content viewer.
 *
 * Tabs:
 *  📖 Read      → LessonSection blocks (explanation, example, analogy, code, etc.)
 *  🎥 Watch     → YouTube / video resources from LessonResource
 *  💻 Code      → Coding exercises via CodeSandbox
 *  🧪 Practice  → Reflection exercises
 *  💬 Ask Tutor → RAG chatbot pre-seeded with lesson context
 *
 * Design:
 *  - Premium dark-accented card design
 *  - Smooth tab transitions via Framer Motion
 *  - Code sections: monospace, dark background
 *  - Loading skeleton while lesson data fetches
 *  - AI Tutor: opens existing chat with lesson context injected
 */

import { useState, useEffect, useCallback } from "react";
import {
  BookOpen, TvMinimalPlay as Youtube, Code2, FlaskConical, MessageCircle,
  ChevronLeft, ChevronRight, Clock, Loader, AlertTriangle,
  Lightbulb, FileCode, AlertCircle, CheckCircle2, List,
  ExternalLink, Star, Sparkles, PlayCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CodeSandbox from "./CodeSandbox";
import { getWizardCourseLesson } from "../../services/api";

// ── Helper ─────────────────────────────────────────────────────────────────────
const cn = (...classes) => classes.filter(Boolean).join(" ");

// ── Section type config ────────────────────────────────────────────────────────
const SECTION_CONFIG = {
  explanation: {
    icon: BookOpen,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-100",
    label: "Explanation",
  },
  example: {
    icon: Lightbulb,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-100",
    label: "Example",
  },
  analogy: {
    icon: Sparkles,
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-100",
    label: "Analogy",
  },
  code: {
    icon: FileCode,
    color: "text-emerald-600",
    bg: "bg-[#0d1117]",
    border: "border-slate-700",
    label: "Code",
  },
  practice: {
    icon: Star,
    color: "text-cyan-600",
    bg: "bg-cyan-50",
    border: "border-cyan-100",
    label: "Practice",
  },
  visual_description: {
    icon: List,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-100",
    label: "Visual",
  },
  common_mistakes: {
    icon: AlertCircle,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-100",
    label: "Common Mistakes",
  },
  summary: {
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    label: "Summary",
  },
};

// ── Tab config ────────────────────────────────────────────────────────────────
const TABS = [
  { id: "read", label: "Read", emoji: "📖", icon: BookOpen },
  { id: "watch", label: "Watch", emoji: "🎥", icon: Youtube },
  { id: "code", label: "Code", emoji: "💻", icon: Code2 },
  { id: "practice", label: "Practice", emoji: "🧪", icon: FlaskConical },
  { id: "tutor", label: "Ask Tutor", emoji: "💬", icon: MessageCircle },
];

// ── Section block renderer ─────────────────────────────────────────────────────
function SectionBlock({ section }) {
  const config = SECTION_CONFIG[section.section_type] || SECTION_CONFIG.explanation;
  const Icon = config.icon;

  if (section.section_type === "code") {
    // Code sections get a dark pre block
    return (
      <div className={cn("overflow-hidden rounded-2xl border", config.border)}>
        <div className="flex items-center gap-2 bg-[#161b22] px-4 py-2.5">
          <Icon size={14} className={config.color} />
          <span className="text-xs font-bold text-slate-400">
            {section.title || config.label}
          </span>
          {section.language && (
            <span className="ml-auto rounded-full bg-emerald-900/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              {section.language}
            </span>
          )}
        </div>
        <pre className="overflow-x-auto bg-[#0d1117] px-5 py-4 font-mono text-sm leading-relaxed text-slate-200 whitespace-pre">
          {section.body}
        </pre>
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border p-5", config.bg, config.border)}>
      <div className="mb-3 flex items-center gap-2">
        <Icon size={16} className={config.color} />
        <span className={cn("text-sm font-extrabold uppercase tracking-wider", config.color)}>
          {section.title || config.label}
        </span>
      </div>
      <div className="prose prose-slate max-w-none">
        <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
          {section.body}
        </p>
      </div>
    </div>
  );
}

// ── Read tab ──────────────────────────────────────────────────────────────────
function ReadTab({ lesson }) {
  const sections = lesson.sections || [];

  if (!sections.length) {
    return (
      <div className="py-12 text-center text-slate-400">
        <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">No content sections found for this lesson.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Overview card */}
      {lesson.overview && (
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50/60 p-5">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles size={15} className="text-blue-600" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600">
              Overview
            </span>
          </div>
          <p className="text-sm font-medium leading-7 text-slate-700">{lesson.overview}</p>
        </div>
      )}

      {/* Section blocks in sequence */}
      {sections.map((section, i) => (
        <SectionBlock key={section.id || i} section={section} />
      ))}
    </div>
  );
}

// ── Watch tab ─────────────────────────────────────────────────────────────────
function WatchTab({ resources }) {
  const videoResources = resources.filter(
    (r) => r.resource_type === "youtube" || (r.url || "").includes("youtube")
  );
  const otherResources = resources.filter(
    (r) => r.resource_type !== "youtube" && !(r.url || "").includes("youtube")
  );

  if (!resources.length) {
    return (
      <div className="py-12 text-center text-slate-400">
        <Youtube size={40} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">No video resources found for this lesson.</p>
        <p className="mt-1 text-xs text-slate-400">Check the Read tab for text-based resources.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {videoResources.length > 0 && (
        <div>
          <h4 className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-600">
            <Youtube size={14} className="text-red-500" />
            Video Resources
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {videoResources.map((res, i) => (
              <a
                key={i}
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50">
                    <PlayCircle size={20} className="text-red-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold leading-5 text-slate-800 group-hover:text-red-600 line-clamp-2">
                      {res.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{res.source}</p>
                  </div>
                  <ExternalLink size={14} className="shrink-0 text-slate-300 group-hover:text-red-400" />
                </div>
                {res.description && (
                  <p className="text-xs leading-5 text-slate-500 line-clamp-2">{res.description}</p>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {otherResources.length > 0 && (
        <div>
          <h4 className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-600">
            <BookOpen size={14} />
            Additional Resources
          </h4>
          <div className="space-y-2">
            {otherResources.map((res, i) => (
              <a
                key={i}
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm transition hover:border-blue-200 hover:bg-blue-50/50"
              >
                <div className="h-2 w-2 rounded-full bg-blue-400 shrink-0" />
                <span className="flex-1 font-semibold text-slate-700 group-hover:text-blue-700 line-clamp-1">
                  {res.title}
                </span>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                  {res.resource_type?.replace("_", " ")}
                </span>
                <ExternalLink size={12} className="shrink-0 text-slate-300" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Code tab ──────────────────────────────────────────────────────────────────
function CodeTab({ exercises }) {
  const codingExercises = exercises.filter((e) => e.exercise_type === "coding");

  if (!codingExercises.length) {
    return (
      <div className="py-12 text-center text-slate-400">
        <Code2 size={40} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">No coding exercises for this lesson.</p>
        <p className="mt-1 text-xs">Check the Practice tab for reflection exercises.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {codingExercises.map((exercise, i) => (
        <div key={exercise.id || i}>
          {codingExercises.length > 1 && (
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-full bg-slate-950 px-3 py-0.5 text-xs font-black text-white">
                Exercise {i + 1}
              </span>
            </div>
          )}
          <CodeSandbox exercise={exercise} />
        </div>
      ))}
    </div>
  );
}

// ── Practice tab ──────────────────────────────────────────────────────────────
function PracticeTab({ exercises }) {
  const reflectionExercises = exercises.filter((e) => e.exercise_type !== "coding");

  if (!reflectionExercises.length) {
    return (
      <div className="py-12 text-center text-slate-400">
        <FlaskConical size={40} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm font-medium">No reflection exercises for this lesson.</p>
        <p className="mt-1 text-xs">Go to the Code tab to try coding exercises.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reflectionExercises.map((exercise, i) => (
        <ReflectionCard key={exercise.id || i} exercise={exercise} index={i} />
      ))}
    </div>
  );
}

function ReflectionCard({ exercise, index }) {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);

  return (
    <div className="rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-indigo-50/50 p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-600 text-xs font-black text-white">
          {index + 1}
        </span>
        <h4 className="font-extrabold text-slate-800">{exercise.title}</h4>
      </div>

      <p className="mb-4 text-sm leading-6 text-slate-600">{exercise.description}</p>

      {!submitted ? (
        <>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Write your reflection here..."
            className="w-full resize-none rounded-xl border border-cyan-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
            rows={4}
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => setSubmitted(true)}
              disabled={!answer.trim()}
              className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-cyan-500 disabled:opacity-40"
            >
              Submit
            </button>
            {exercise.solution_hint && (
              <button
                onClick={() => setShowHint((v) => !v)}
                className="flex items-center gap-1.5 rounded-xl border border-cyan-200 px-3 py-2 text-xs font-bold text-cyan-600"
              >
                <Lightbulb size={12} />
                {showHint ? "Hide Hint" : "Hint"}
              </button>
            )}
          </div>
          {showHint && exercise.solution_hint && (
            <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
              <strong>Hint:</strong> {exercise.solution_hint}
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-700">
            <CheckCircle2 size={14} />
            Response saved
          </div>
          <p className="text-sm text-slate-600">{answer}</p>
          <button
            onClick={() => { setSubmitted(false); }}
            className="mt-3 text-xs font-bold text-slate-400 underline"
          >
            Edit response
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tutor tab ─────────────────────────────────────────────────────────────────
function TutorTab({ lesson }) {
  // Compose a context-rich prompt for the RAG chatbot
  const contextMessage = [
    `I'm studying this lesson: "${lesson.title}"`,
    lesson.overview ? `Overview: ${lesson.overview}` : "",
    "I have a question about this topic.",
  ].filter(Boolean).join(" ");

  // Deep link to the RAG chat page with pre-seeded context
  const chatUrl = `/chat?context=${encodeURIComponent(contextMessage)}`;

  return (
    <div className="flex flex-col items-center py-12 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200">
        <MessageCircle size={36} className="text-white" />
      </div>

      <h3 className="mb-2 text-xl font-black text-slate-900">AI Tutor</h3>
      <p className="mb-1 max-w-sm text-sm font-medium text-slate-500">
        Ask any question about{" "}
        <span className="font-bold text-slate-700">"{lesson.title}"</span>.
      </p>
      <p className="mb-6 max-w-sm text-xs text-slate-400">
        The tutor is pre-seeded with this lesson's context for more relevant answers.
      </p>

      <a
        href={chatUrl}
        className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:shadow-xl hover:-translate-y-0.5"
      >
        <Sparkles size={16} />
        Open AI Tutor
      </a>

      <p className="mt-4 text-xs text-slate-400">
        Powered by CognitiveWizard's RAG chatbot
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main LessonReader Component
// ─────────────────────────────────────────────────────────────────────────────

export default function LessonReader({ contentId, lessonId, onBack, onNext, onPrev, hasNext, hasPrev }) {
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("read");

  useEffect(() => {
    if (!contentId || !lessonId) return;
    setLoading(true);
    setError(null);
    setActiveTab("read");

    getWizardCourseLesson(contentId, lessonId)
      .then((data) => {
        setLesson(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load lesson");
        setLoading(false);
      });
  }, [contentId, lessonId]);

  // Determine available tabs based on lesson content
  const availableTabs = TABS.filter((tab) => {
    if (!lesson) return tab.id === "read";
    if (tab.id === "watch") return (lesson.resources || []).length > 0;
    if (tab.id === "code") return (lesson.exercises || []).some((e) => e.exercise_type === "coding");
    if (tab.id === "practice") return (lesson.exercises || []).some((e) => e.exercise_type !== "coding");
    return true;
  });

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Loader size={32} className="animate-spin text-blue-500" />
        <p className="text-sm font-medium text-slate-500">Loading lesson...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle size={32} className="text-red-400" />
        <p className="font-bold text-slate-700">Failed to load lesson</p>
        <p className="text-sm text-slate-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Lesson header */}
      <div className="mb-6">
        {/* Breadcrumb */}
        {lesson.module && (
          <div className="mb-2 flex items-center gap-1 text-xs font-semibold text-slate-400">
            {lesson.module.phase && (
              <>
                <span>{lesson.module.phase.title}</span>
                <ChevronRight size={12} />
              </>
            )}
            <span>{lesson.module.title}</span>
          </div>
        )}

        <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          {lesson.title}
        </h1>

        {lesson.estimated_time && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-500">
            <Clock size={12} />
            {lesson.estimated_time}
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1">
        {availableTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`lesson-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all",
                isActive
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <span>{tab.emoji}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content with smooth transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === "read" && <ReadTab lesson={lesson} />}
          {activeTab === "watch" && <WatchTab resources={lesson.resources || []} />}
          {activeTab === "code" && <CodeTab exercises={lesson.exercises || []} />}
          {activeTab === "practice" && <PracticeTab exercises={lesson.exercises || []} />}
          {activeTab === "tutor" && <TutorTab lesson={lesson} />}
        </motion.div>
      </AnimatePresence>

      {/* Navigation: prev / next lesson */}
      <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-30"
        >
          <ChevronLeft size={16} />
          Previous Lesson
        </button>

        <button
          onClick={onBack}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-400 transition hover:text-slate-600"
        >
          Course Overview
        </button>

        <button
          onClick={onNext}
          disabled={!hasNext}
          className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-30"
        >
          Next Lesson
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
