/**
 * pages/WizardContentView.jsx
 * =============================
 * Route handler for /wizard/view/:id.
 *
 * Routing logic (content_type-aware):
 *   Course/Syllabus   → <CourseViewer>   (new full learning experience)
 *   Roadmap           → <RoadmapDisplay> (existing visual roadmap)
 *   Guide/Schedule    → <ModuleList>     (existing flat module list)
 *
 * Status-aware rendering:
 *   generating* states → Show dynamic status messages (polling every 4s)
 *   pending_approval   → Show course preview + publish option
 *   published          → Show full CourseViewer
 *   error              → Show error UI
 */

import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { getWizardContentDetail } from "../services/api";
import RoadmapDisplay from "../components/wizard/RoadmapDisplay";
import CourseViewer from "../components/wizard/CourseViewer";
import {
  Clock, CheckSquare, ChevronDown, ChevronUp, AlertCircle,
  Loader, Sparkles, BookOpen, GraduationCap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Check helpers ─────────────────────────────────────────────────────────────
const isCourseType = (t) =>
  ["course/syllabus", "course", "syllabus"].includes((t || "").toLowerCase().trim());

const isGenerating = (status) =>
  status?.startsWith("generating") || status === "processing";

// ── Status label map for dynamic messages ─────────────────────────────────────
const STATUS_MESSAGES = {
  generating_blueprint: {
    icon: "🏗️",
    title: "Designing your course structure",
    sub: "The Learning Architect is mapping out phases, modules, and lessons...",
  },
  generating_evidence: {
    icon: "🔍",
    title: "Researching sources",
    sub: "Gathering curated references and evidence for each lesson...",
  },
  generating_lessons: {
    icon: "✍️",
    title: "Writing lesson content",
    sub: "Generating deep explanations, examples, analogies, and exercises...",
  },
  reviewing_content: {
    icon: "🧐",
    title: "Reviewing for quality",
    sub: "Checking each lesson against pedagogical standards...",
  },
  quality_check: {
    icon: "✅",
    title: "Running quality checks",
    sub: "Validating content and finalizing your course...",
  },
  processing: {
    icon: "⚙️",
    title: "Processing",
    sub: "Setting up your course generation pipeline...",
  },
  generating: {
    icon: "🚀",
    title: "Starting generation",
    sub: "Initializing the multi-agent course pipeline...",
  },
};

// ── Animated generating state UI ──────────────────────────────────────────────
function GeneratingState({ status, statusLabel }) {
  const msg = STATUS_MESSAGES[status] || STATUS_MESSAGES.generating;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      {/* Pulsing icon */}
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-blue-100 opacity-60" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-3xl shadow-lg shadow-blue-200">
          {msg.icon}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-2xl font-black text-slate-900">{msg.title}</h2>
        <p className="max-w-sm text-sm font-medium leading-relaxed text-slate-500">{msg.sub}</p>
      </div>

      {/* Dynamic status label from webhook */}
      {statusLabel && statusLabel !== msg.sub && (
        <div className="rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-700">
          {statusLabel}
        </div>
      )}

      {/* Generation steps progress */}
      <div className="flex items-center gap-2">
        {["generating_blueprint", "generating_evidence", "generating_lessons", "reviewing_content", "quality_check"].map(
          (step, i) => {
            const steps = Object.keys(STATUS_MESSAGES).slice(0, 5);
            const currentIdx = steps.indexOf(status);
            const stepIdx = steps.indexOf(step);
            const isDone = stepIdx < currentIdx;
            const isActive = step === status;
            return (
              <div
                key={step}
                title={STATUS_MESSAGES[step]?.title}
                className={`h-2 rounded-full transition-all duration-500 ${
                  isDone
                    ? "w-8 bg-emerald-500"
                    : isActive
                    ? "w-10 bg-blue-500 animate-pulse"
                    : "w-3 bg-slate-200"
                }`}
              />
            );
          }
        )}
      </div>

      <p className="text-xs font-medium text-slate-400">
        This usually takes 3–10 minutes. You can close this tab and come back.
      </p>
    </div>
  );
}

// ── Simple module list (Guide/Schedule) ───────────────────────────────────────
function ModuleItem({ mod }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      onClick={() => setExpanded(!expanded)}
      className="relative cursor-pointer overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-lg md:p-8"
    >
      <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-indigo-500 to-cyan-400" />
      <div className="mb-4 flex items-start justify-between gap-4">
        <h3 className="text-xl font-bold text-slate-900">{mod.title}</h3>
        <div className="flex shrink-0 items-center gap-3">
          {mod.estimated_time && (
            <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-600">
              <Clock size={14} className="text-blue-500" /> {mod.estimated_time}
            </div>
          )}
          <button className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100">
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>
      <p className={`text-slate-600 leading-relaxed ${expanded ? "mb-6" : "m-0"}`}>
        {mod.description}
      </p>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {mod.key_takeaways?.length > 0 && (
              <div className="mb-6">
                <h4 className="mb-3 text-sm font-bold text-slate-900">Key Takeaways:</h4>
                <ul className="space-y-2">
                  {mod.key_takeaways.map((k, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm font-medium text-indigo-700">
                      <span className="mt-1 text-indigo-400">•</span> {k}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {mod.topics?.length > 0 && (
              <div className="flex flex-col gap-4">
                {mod.topics.map((topic, idx) => (
                  <div key={idx} className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-5">
                    <h4 className="mb-2 font-bold text-cyan-700">{topic.name || topic}</h4>
                    {(topic.details || topic.content) && (
                      <p className="text-sm leading-relaxed text-slate-600">
                        {topic.details || topic.content}
                      </p>
                    )}
                    {topic.practical_task && (
                      <div className="mt-4 flex items-start gap-2 rounded-xl bg-cyan-100/50 p-3 text-sm font-semibold text-cyan-800">
                        <CheckSquare className="mt-0.5 shrink-0 text-cyan-600" size={16} />
                        <span>Task: {topic.practical_task}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WizardContentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Poll while content is in a generating state
  const fetchContent = useCallback(async () => {
    try {
      const result = await getWizardContentDetail(id);
      setData(result);
      return result;
    } catch (err) {
      setError(err.message || "Failed to load content.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetchContent();
  }, [fetchContent]);

  // Auto-poll during generation
  useEffect(() => {
    if (!data || !isGenerating(data.status)) return;
    const timer = setInterval(async () => {
      const updated = await fetchContent();
      if (updated && !isGenerating(updated.status)) {
        clearInterval(timer);
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [data, fetchContent]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
        <Loader size={36} className="animate-spin text-blue-500" />
        <p className="font-medium text-slate-500">Loading your content…</p>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
        <div className="flex items-center gap-3 rounded-2xl bg-rose-50 px-6 py-4 font-bold text-rose-600">
          <AlertCircle size={24} />
          {error}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="rounded-full bg-slate-900 px-8 py-3 font-bold text-white shadow-lg transition hover:bg-slate-800"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const type = (data.content_type || "").toLowerCase().trim();
  const status = data.status || "";

  // ── Generating (any type) ──
  if (isGenerating(status)) {
    const statusLabel = data.content?._status_label || null;
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <GeneratingState status={status} statusLabel={statusLabel} />
      </motion.div>
    );
  }

  // ── Error state ──
  if (status === "error") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <AlertCircle size={40} className="text-red-400" />
        <h2 className="text-xl font-black text-slate-900">Generation Failed</h2>
        <p className="max-w-sm text-sm text-slate-500">
          {data.content?.error || "An unexpected error occurred during generation."}
        </p>
        <button
          onClick={() => navigate("/wizard")}
          className="rounded-2xl bg-slate-900 px-6 py-3 font-bold text-white transition hover:bg-slate-800"
        >
          Try Again
        </button>
      </div>
    );
  }

  // ── Course / Syllabus ──
  if (isCourseType(type)) {
    // If course has phases, render the full CourseViewer
    if (data.phases?.length > 0) {
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
          <CourseViewer content={data} />
        </motion.div>
      );
    }

    // Course data not yet in DB (pending webhook) or waiting for approval
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-3xl">
          📚
        </div>
        <h2 className="text-xl font-black text-slate-900">Course is Ready</h2>
        <p className="max-w-sm text-sm text-slate-500">
          Status: <span className="font-bold capitalize">{status.replace("_", " ")}</span>
        </p>
        <button
          onClick={fetchContent}
          className="flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-500"
        >
          <Loader size={16} /> Refresh
        </button>
      </div>
    );
  }

  // ── Roadmap ──
  if (type === "roadmap") {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full mx-auto">
        <RoadmapDisplay
          data={data}
          learningStyle={data?.content?.learning_style}
          topic={data?.topic}
          onBack={() => window.history.back()}
          onRegenerate={() => navigate("/wizard")}
        />
      </motion.div>
    );
  }

  // ── Guide / Schedule (legacy module list) ──
  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-16 md:px-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-16 text-center">
          <span className="mb-6 inline-block rounded-full border border-cyan-200 bg-cyan-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-cyan-600 shadow-sm">
            {data.content_type}
          </span>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
            {data.content?.title || data.topic}
          </h1>
          {data.content?.description && (
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-600">
              {data.content.description}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-6">
          {data.content?.modules?.map((mod, i) => (
            <ModuleItem key={i} mod={mod} />
          ))}
          {data.modules?.map((mod, i) => (
            <ModuleItem key={i} mod={{ ...mod, topics: mod.details_json }} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
