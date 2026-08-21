import { useRef, useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  Clock,
  Brain,
  BookOpen,
  Compass,
  Library,
  ArrowLeft,
  CheckCircle,
  ChevronRight,
  History,
  Edit3,
  ChevronDown,
  ChevronUp,
  Trash2,
  CheckSquare,
  AlertCircle,
  ArrowRight,
  WandSparkles,
  Layers3,
  Target,
  RotateCcw,
  ExternalLink,
  Search,
  LayoutTemplate,
  PenTool,
  ShieldCheck,
  Rocket,
  Hourglass,
} from "lucide-react";

import { useGsapReveal } from "../hooks/useGsapReveal";
import {
  generateWizardContent,
  generateAgenticWizardContent,
  getWizardContentDetail,
  provideWizardFeedback,
  publishWizardContent,
  getWizardHistory,
  deleteWizardContent,
  API,
} from "../services/api";

import { useAuth } from "../hooks/useAuth";
import RoadmapDisplay from "../components/wizard/RoadmapDisplay";
import DraftReviewUI from "../components/wizard/DraftReviewUI";
import { motion, AnimatePresence } from "framer-motion";

/* -------------------------------------------------------------------------- */
/*                                   CONFIG                                   */
/* -------------------------------------------------------------------------- */

const ICON_MAP = {
  ExploreRounded: Compass,
  LocalLibraryRounded: Library,
  MenuBookRounded: BookOpen,
  ScheduleRounded: Clock,
  PsychologyRounded: Brain,
  default: Compass,
};

function getIcon(iconName, props = {}) {
  const Icon = ICON_MAP[iconName] || ICON_MAP.default;
  return <Icon {...props} />;
}

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

const cn = (...classes) => classes.filter(Boolean).join(" ");

function isAnswerEmpty(value) {
  if (Array.isArray(value)) return value.length === 0;
  return !String(value ?? "").trim();
}

/* -------------------------------------------------------------------------- */
/*                              PREMIUM CARD                                  */
/* -------------------------------------------------------------------------- */

function Surface({ children, className = "", ...props }) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-slate-200/80 bg-white shadow-[0_12px_45px_-24px_rgba(15,23,42,0.25)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              SECTION HEADER                                 */
/* -------------------------------------------------------------------------- */

function SectionHeader({
  eyebrow,
  title,
  description,
  icon: Icon = Sparkles,
}) {
  return (
    <div className="mb-10 text-center">
      {eyebrow && (
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-cyan-700">
          <Icon size={14} />
          {eyebrow}
        </div>
      )}

      <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
        {title}
      </h2>

      {description && (
        <p className="mx-auto mt-3 max-w-2xl text-base font-medium leading-7 text-slate-500 sm:text-lg">
          {description}
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              PROGRESS BAR                                  */
/* -------------------------------------------------------------------------- */

function WizardProgress({ step, totalSteps }) {
  const percentage =
    totalSteps <= 1
      ? 100
      : Math.min(100, Math.round((step / (totalSteps - 1)) * 100));

  return (
    <div className="mx-auto mb-10 w-full max-w-3xl">
      <div className="mb-3 flex items-center justify-between text-xs font-extrabold uppercase tracking-widest">
        <span className="text-slate-400">Progress</span>
        <span className="text-slate-600">{percentage}% complete</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      <div className="mt-3 flex justify-between text-[11px] font-bold text-slate-400">
        <span>Start</span>
        <span>Customize</span>
        <span>Review</span>
        <span>Generate</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              MODULE ITEM                                   */
/* -------------------------------------------------------------------------- */

const ModuleItem = ({ mod, index }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="group"
    >
      <Surface
        className={cn(
          "relative overflow-hidden transition-all duration-300",
          expanded
            ? "shadow-[0_24px_70px_-35px_rgba(37,99,235,0.3)]"
            : "hover:-translate-y-1 hover:shadow-[0_24px_60px_-32px_rgba(15,23,42,0.28)]"
        )}
      >
        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-cyan-500 via-blue-500 to-indigo-500" />

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="w-full p-6 text-left sm:p-7"
        >
          <div className="flex items-start gap-4">
            <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white sm:flex">
              {String(index + 1).padStart(2, "0")}
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700">
                  Module {index + 1}
                </span>

                {mod.estimated_time && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    <Clock size={12} />
                    {mod.estimated_time}
                  </span>
                )}
              </div>

              <h3 className="text-xl font-black tracking-tight text-slate-950 transition-colors group-hover:text-blue-600 sm:text-2xl">
                {mod.title}
              </h3>

              {mod.description && (
                <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500 sm:text-base">
                  {mod.description}
                </p>
              )}
            </div>

            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-all",
                expanded
                  ? "border-blue-200 bg-blue-50 text-blue-600"
                  : "border-slate-200 bg-white text-slate-400 group-hover:border-blue-200 group-hover:text-blue-500"
              )}
            >
              {expanded ? (
                <ChevronUp size={19} />
              ) : (
                <ChevronDown size={19} />
              )}
            </div>
          </div>
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="border-t border-slate-100 px-6 pb-7 pt-6 sm:px-7">
                {mod.key_takeaways?.length > 0 && (
                  <div className="mb-7">
                    <div className="mb-3 flex items-center gap-2">
                      <Target size={16} className="text-blue-600" />
                      <h4 className="text-sm font-black uppercase tracking-wider text-slate-800">
                        Key Takeaways
                      </h4>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {mod.key_takeaways.map((takeaway, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold leading-5 text-slate-600"
                        >
                          <CheckCircle
                            size={16}
                            className="mt-0.5 shrink-0 text-blue-500"
                          />
                          <span>{takeaway}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {mod.topics?.length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <Layers3 size={16} className="text-cyan-600" />
                      <h4 className="text-sm font-black uppercase tracking-wider text-slate-800">
                        Topics
                      </h4>
                    </div>

                    <div className="space-y-3">
                      {mod.topics.map((topic, idx) => (
                        <div
                          key={idx}
                          className="rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50/80 to-blue-50/50 p-5"
                        >
                          <h4 className="font-extrabold text-cyan-800">
                            {topic.name || topic}
                          </h4>

                          {(topic.details || topic.content) && (
                            <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                              {topic.details || topic.content}
                            </p>
                          )}

                          {topic.practical_task && (
                            <div className="mt-4 flex items-start gap-3 rounded-xl border border-cyan-200/80 bg-white/70 p-3.5 text-sm font-bold text-cyan-800">
                              <CheckSquare
                                className="mt-0.5 shrink-0 text-cyan-600"
                                size={17}
                              />
                              <span>{topic.practical_task}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Surface>
    </motion.div>
  );
};

/* -------------------------------------------------------------------------- */
/*                            GENERATING STATE                                */
/* -------------------------------------------------------------------------- */

// Pipeline step labels for the advanced course generation pipeline
const PIPELINE_STATUS_CONFIG = {
  generating_blueprint: {
    icon: <LayoutTemplate className="h-10 w-10 text-white" />,
    label: "Designing course structure",
    sub: "The Learning Architect is mapping out phases, modules, and lesson objectives...",
    step: 1,
  },
  generating_evidence: {
    icon: <Search className="h-10 w-10 text-white" />,
    label: "Researching sources",
    sub: "Gathering curated references and evidence for each lesson...",
    step: 2,
  },
  generating_lessons: {
    icon: <PenTool className="h-10 w-10 text-white" />,
    label: "Writing lesson content",
    sub: "Generating deep explanations, examples, analogies, code, and exercises...",
    step: 3,
  },
  reviewing_content: {
    icon: <ShieldCheck className="h-10 w-10 text-white" />,
    label: "Reviewing for quality",
    sub: "The Pedagogical Reviewer is checking each lesson for completeness and accuracy...",
    step: 4,
  },
  quality_check: {
    icon: <CheckSquare className="h-10 w-10 text-white" />,
    label: "Quality gate",
    sub: "Validating content, citations, and finalizing your course...",
    step: 5,
  },
  generating: {
    icon: <Rocket className="h-10 w-10 text-white" />,
    label: "Starting pipeline",
    sub: "Initializing multi-agent course generation. This takes 3-10 minutes.",
    step: 1,
  },
  queued: {
    icon: <Hourglass className="h-10 w-10 text-white" />,
    label: "Queued",
    sub: "Waiting for a background worker to pick up your job...",
    step: 0,
  },
};

const PIPELINE_STEPS = [
  "queued",
  "generating",
  "generating_blueprint",
  "generating_evidence",
  "generating_lessons",
  "reviewing_content",
  "quality_check",
];

function GeneratingState({ contentType, isTutor, generatedData }) {
  const isCourse = contentType === "Course/Syllabus";

  let currentStatus = generatedData?.status || "generating";
  if (currentStatus === "generating" && generatedData?.generation_job?.status === "queued") {
    currentStatus = "queued";
  }

  const statusConfig = PIPELINE_STATUS_CONFIG[currentStatus] || PIPELINE_STATUS_CONFIG.generating;
  // Dynamic label from webhook (e.g. '✍️ Writing lessons... (3/4 batches done)')
  const dynamicLabel = generatedData?.content?._status_label || null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-2xl py-16 text-center sm:py-24"
    >
      <div className="relative mx-auto mb-8 h-24 w-24">
        <div className="absolute inset-0 animate-ping rounded-full bg-blue-100 opacity-60" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-[0_20px_60px_-20px_rgba(37,99,235,0.6)]">
          {statusConfig.icon}
        </div>
      </div>

      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-black uppercase tracking-widest text-blue-700">
        <WandSparkles size={13} />
        {statusConfig.label}
      </div>

      <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
        Creating your {contentType}
      </h2>

      <p className="mx-auto mt-4 max-w-xl text-base font-medium leading-7 text-slate-500 sm:text-lg">
        {statusConfig.sub}
      </p>

      {/* Live webhook status label */}
      {dynamicLabel && dynamicLabel !== statusConfig.sub && (
        <div className="mx-auto mt-3 max-w-sm rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-700">
          {dynamicLabel}
        </div>
      )}

      {/* Pipeline step progress dots (courses only) */}
      {isCourse && (
        <div className="mx-auto mt-6 flex items-center justify-center gap-2">
          {PIPELINE_STEPS.map((step) => {
            const currentIdx = PIPELINE_STEPS.indexOf(currentStatus);
            const stepIdx = PIPELINE_STEPS.indexOf(step);
            const isDone = stepIdx < currentIdx;
            const isActive = step === currentStatus;
            return (
              <div
                key={step}
                title={PIPELINE_STATUS_CONFIG[step]?.label}
                className={`rounded-full transition-all duration-500 ${isDone
                    ? "h-2 w-8 bg-emerald-500"
                    : isActive
                      ? "h-2 w-10 bg-blue-500 animate-pulse"
                      : "h-2 w-3 bg-slate-200"
                  }`}
              />
            );
          })}
        </div>
      )}

      {/* Animated progress bar */}
      <div className="mx-auto mt-6 max-w-md overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className="h-2 rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <p className="mt-5 text-xs font-medium text-slate-400">
        {isCourse
          ? "Course generation takes 3–10 minutes. You can leave and come back."
          : "This usually takes a few seconds."}
      </p>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*                           WIZARD MODULE                                    */
/* -------------------------------------------------------------------------- */

export default function WizardModule() {
  const { isTutor } = useAuth();

  const [activeTab, setActiveTab] = useState("generate");

  const [questionSets, setQuestionSets] = useState([]);
  const [setsLoading, setSetsLoading] = useState(true);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    contentType: "",
    topic: "",
  });

  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedData, setGeneratedData] = useState(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const [historyItems, setHistoryItems] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState("");

  const pollIntervalRef = useRef(null);
  const rootRef = useRef(null);

  useGsapReveal(rootRef);

  /* ------------------------------------------------------------------------ */
  /*                               DATA                                       */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    API.get("/wizard/question-sets")
      .then((res) => setQuestionSets(res.data))
      .catch((err) =>
        console.error("Failed to load wizard question sets", err)
      )
      .finally(() => setSetsLoading(false));
  }, []);

  const activeQuestionSet = useMemo(
    () =>
      questionSets.find(
        (qs) => qs.content_type === answers.contentType
      ),
    [questionSets, answers.contentType]
  );

  const activeQuestions = activeQuestionSet?.questions || [];

  const totalSteps = 3 + activeQuestions.length;

  const finalReviewStep = 2 + activeQuestions.length;
  const resultStep = finalReviewStep + 1;

  const filteredHistory = useMemo(() => {
    const query = historySearch.trim().toLowerCase();

    if (!query) return historyItems;

    return historyItems.filter((item) =>
      `${item.topic} ${item.content_type}`
        .toLowerCase()
        .includes(query)
    );
  }, [historyItems, historySearch]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  /* ------------------------------------------------------------------------ */
  /*                              POLLING                                     */
  /* ------------------------------------------------------------------------ */

  const startPolling = (id) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const data = await getWizardContentDetail(id);

        if (
          data.status === "pending_approval" ||
          data.status === "published" ||
          data.status === "error"
        ) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;

          setIsLoading(false);
          setGeneratedData(data);

          if (data.status === "error") {
            setError("Generation failed. Please try again.");
          }
        } else {
          setGeneratedData(data);
        }
      } catch (err) {
        console.error("Polling error", err);
      }
    }, 3000);
  };

  /* ------------------------------------------------------------------------ */
  /*                              HISTORY                                     */
  /* ------------------------------------------------------------------------ */

  const fetchHistory = async () => {
    setIsHistoryLoading(true);

    try {
      const data = await getWizardHistory();
      setHistoryItems(data);
    } catch (err) {
      console.error("Failed to load history", err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleDeleteHistory = async (id, e) => {
    e.stopPropagation();

    if (!window.confirm("Are you sure you want to delete this content?")) {
      return;
    }

    try {
      await deleteWizardContent(id);
      setHistoryItems((items) =>
        items.filter((item) => item.id !== id)
      );
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  /* ------------------------------------------------------------------------ */
  /*                            NAVIGATION                                    */
  /* ------------------------------------------------------------------------ */

  const updateAnswer = (key, value) => {
    setAnswers((current) => ({
      ...current,
      [key]: value,
    }));

    setError(null);
  };

  const handleNext = () => {
    setError(null);

    if (step === 0 && isAnswerEmpty(answers.contentType)) {
      setError("Please select a content type to continue.");
      return;
    }

    if (step === 1 && isAnswerEmpty(answers.topic)) {
      setError("Please enter a topic to continue.");
      return;
    }

    if (
      step >= 2 &&
      step < finalReviewStep
    ) {
      const qIndex = step - 2;
      const currentQuestion = activeQuestions[qIndex];

      if (!currentQuestion) return;

      if (isAnswerEmpty(answers[currentQuestion.key])) {
        setError("Please answer this question before continuing.");
        return;
      }
    }

    setStep((current) => current + 1);
  };

  const handleBack = () => {
    setError(null);
    setStep((current) => Math.max(current - 1, 0));
  };

  /* ------------------------------------------------------------------------ */
  /*                             GENERATION                                   */
  /* ------------------------------------------------------------------------ */

  const handleGenerate = async () => {
    setError(null);
    setMessage(null);
    setIsLoading(true);
    setGeneratedData(null);
    setStep(resultStep);

    const details = activeQuestions
      .map(
        (q) =>
          `Q: ${q.label}\nA: ${answers[q.key]}`
      )
      .join("\n\n");

    try {
      const payload = {
        topic: answers.topic,
        content_type: answers.contentType,
        details: details.trim(),

        skill_level:
          answers.skillLevel ||
          answers.skill_level ||
          answers["Skill Level"],

        goal:
          answers.goal ||
          answers.learningGoal ||
          answers["Learning Goal"],

        learning_style:
          answers.learningStyle ||
          answers.learning_style ||
          answers["Learning Style"],
      };

      if (
        isTutor &&
        answers.contentType === "Course/Syllabus"
      ) {
        const response =
          await generateAgenticWizardContent(payload);

        setGeneratedData(response);

        if (response.status === "generating") {
          startPolling(response.id);
        } else {
          setIsLoading(false);
          setMessage("Successfully generated!");
        }
      } else {
        const response =
          await generateWizardContent(payload);

        setGeneratedData(response);
        setMessage(
          `Successfully generated your ${answers.contentType.toLowerCase()}!`
        );
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
        "Something went wrong while generating your content."
      );

      setStep(finalReviewStep);
      setIsLoading(false);
    }
  };

  const startOver = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    setStep(0);
    setGeneratedData(null);
    setAnswers({
      contentType: "",
      topic: "",
    });
    setMessage(null);
    setError(null);
    setIsLoading(false);
    setActiveTab("generate");
  };

  /* ------------------------------------------------------------------------ */
  /*                          GENERATED CONTENT                               */
  /* ------------------------------------------------------------------------ */

  const renderContentData = (data) => {
    const isRoadmap =
      (data?.content_type || "").toLowerCase() === "roadmap";

    const learningStyle =
      answers?.learningStyle ||
      data?.content?.learning_style ||
      "Visual & Project-based";

    if (isRoadmap) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full"
        >
          <RoadmapDisplay
            data={data}
            learningStyle={learningStyle}
            topic={answers.topic || data?.topic}
            onBack={startOver}
            onRegenerate={startOver}
          />
        </motion.div>
      );
    }

    if (data?.status === "error") {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-2xl"
        >
          <Surface className="overflow-hidden">
            <div className="border-b border-rose-100 bg-gradient-to-br from-rose-50 to-white px-6 py-10 text-center sm:px-10">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <AlertCircle size={32} />
              </div>

              <h2 className="text-3xl font-black text-slate-950">
                Generation Failed
              </h2>

              <p className="mx-auto mt-4 max-w-lg text-sm font-medium leading-6 text-slate-500 sm:text-base">
                {data.content?.error ||
                  error ||
                  "An error occurred while generating the content. Would you like to try again?"}
              </p>
            </div>

            <div className="flex flex-col gap-3 p-6 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={startOver}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <RotateCcw size={17} />
                Start Over
              </button>

              <button
                type="button"
                onClick={handleGenerate}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3.5 font-bold text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                <Sparkles size={17} />
                Retry Generation
              </button>
            </div>
          </Surface>
        </motion.div>
      );
    }

    if (data?.status === "pending_approval") {
      const isCourse = ["course/syllabus", "course", "syllabus"].includes(
        (data.content_type || "").toLowerCase().trim()
      );

      // Course/Syllabus with relational data: show preview + View Course / Publish buttons
      if (isCourse && data.phases?.length > 0) {
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-2xl"
          >
            <Surface className="overflow-hidden">
              <div className="border-b border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 px-6 py-10 text-center sm:px-10">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-3xl">
                  📚
                </div>
                <h2 className="text-3xl font-black text-slate-950">
                  Course Ready for Review
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-sm font-medium leading-6 text-slate-500">
                  Your course <strong>{data.topic}</strong> has been generated with{" "}
                  <strong>{data.phases.length} phases</strong> and is ready for review.
                  Open the full course viewer to explore lessons before publishing.
                </p>
              </div>
              <div className="flex flex-col gap-3 p-6 sm:flex-row sm:justify-center">
                {/* View course in full viewer */}
                <a
                  href={`/wizard/view/${data.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <ExternalLink size={17} />
                  Preview Course
                </a>
                {/* Publish */}
                <button
                  type="button"
                  disabled={isSubmittingFeedback}
                  onClick={async () => {
                    setIsSubmittingFeedback(true);
                    try {
                      const res = await publishWizardContent(data.id, []);
                      setGeneratedData(res);
                      setMessage("Course published successfully!");
                    } catch (err) {
                      setError("Failed to publish course.");
                    } finally {
                      setIsSubmittingFeedback(false);
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3.5 font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-50"
                >
                  <CheckCircle size={17} />
                  {isSubmittingFeedback ? "Publishing..." : "Publish Course"}
                </button>
              </div>
            </Surface>
          </motion.div>
        );
      }

      // Non-course content: use existing DraftReviewUI
      return (
        <DraftReviewUI
          data={data}
          isSubmitting={isSubmittingFeedback}
          onFeedback={async (fb) => {
            setIsSubmittingFeedback(true);
            try {
              const res = await provideWizardFeedback(data.id, fb);
              setGeneratedData(res);
              if (res.status === "generating") {
                setIsLoading(true);
                startPolling(res.id);
              }
            } catch (err) {
              console.error(err);
              setError("Failed to submit feedback.");
            } finally {
              setIsSubmittingFeedback(false);
            }
          }}
          onApprove={async (editedModules) => {
            setIsSubmittingFeedback(true);
            try {
              const res = await publishWizardContent(data.id, editedModules);
              setGeneratedData(res);
              setMessage("Content published successfully!");
            } catch (err) {
              console.error(err);
              setError("Failed to publish content.");
            } finally {
              setIsSubmittingFeedback(false);
            }
          }}
        />
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto w-full max-w-5xl"
      >
        <div className="mb-10 text-center sm:mb-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3.5 py-1.5 text-xs font-black uppercase tracking-widest text-cyan-700">
            <Sparkles size={13} />
            {data.content_type}
          </span>

          <h1 className="mx-auto mt-5 max-w-4xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            {data.content?.title || data.topic}
          </h1>

          {data.content?.description && (
            <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-7 text-slate-500 sm:text-lg">
              {data.content.description}
            </p>
          )}
        </div>

        {data.content?.modules?.length > 0 ? (
          <div className="space-y-4">
            {data.content.modules.map((mod, index) => (
              <ModuleItem
                key={index}
                mod={mod}
                index={index}
              />
            ))}
          </div>
        ) : (
          <Surface className="p-10 text-center">
            <BookOpen
              size={40}
              className="mx-auto mb-4 text-slate-300"
            />

            <h3 className="text-xl font-black text-slate-900">
              Content generated
            </h3>

            <p className="mt-2 font-medium text-slate-500">
              Your generated content is ready.
            </p>
          </Surface>
        )}
      </motion.div>
    );
  };

  /* ------------------------------------------------------------------------ */
  /*                          GENERATOR STEPS                                 */
  /* ------------------------------------------------------------------------ */

  const renderGeneratorSteps = () => {
    /* ------------------------------ STEP 0 ------------------------------- */

    if (step === 0) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-3xl"
        >
          <SectionHeader
            eyebrow="Step 1 · Choose"
            title="What do you want to create?"
            description="Start with a learning format and we'll personalize the experience around your goal."
            icon={WandSparkles}
          />

          {setsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-28 animate-pulse rounded-[24px] bg-slate-100"
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {questionSets
                .filter(
                  (type) =>
                    isTutor ||
                    type.content_type !== "Course/Syllabus"
                )
                .map((type) => {
                  const isActive =
                    answers.contentType === type.content_type;

                  return (
                    <motion.button
                      key={type.content_type}
                      type="button"
                      whileHover={{ y: -3 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => {
                        updateAnswer(
                          "contentType",
                          type.content_type
                        );

                        setAnswers((current) => ({
                          ...current,
                          contentType: type.content_type,
                          topic: "",
                        }));

                        setTimeout(() => setStep(1), 180);
                      }}
                      className={cn(
                        "group relative overflow-hidden rounded-[26px] border p-5 text-left transition-all sm:p-6",
                        isActive
                          ? "border-blue-400 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-[0_20px_50px_-28px_rgba(37,99,235,0.7)]"
                          : "border-slate-200 bg-white hover:border-blue-200 hover:shadow-[0_20px_50px_-28px_rgba(15,23,42,0.3)]"
                      )}
                    >
                      <div
                        className={cn(
                          "absolute right-0 top-0 h-24 w-24 rounded-full blur-2xl transition-opacity",
                          isActive
                            ? "bg-blue-200/50 opacity-100"
                            : "bg-blue-100 opacity-0 group-hover:opacity-60"
                        )}
                      />

                      <div className="relative flex items-start gap-4">
                        <div
                          className={cn(
                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all",
                            isActive
                              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                              : "bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600"
                          )}
                        >
                          {getIcon(type.icon, {
                            size: 23,
                          })}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="font-black text-slate-950">
                            {type.label}
                          </h3>

                          <p className="mt-1.5 text-sm font-medium leading-5 text-slate-500">
                            {type.description}
                          </p>
                        </div>

                        <div
                          className={cn(
                            "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all",
                            isActive
                              ? "bg-blue-600 text-white"
                              : "bg-slate-50 text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-500"
                          )}
                        >
                          <ChevronRight size={17} />
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
            </div>
          )}
        </motion.div>
      );
    }

    /* ------------------------------ STEP 1 ------------------------------- */

    if (step === 1) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-3xl"
        >
          <SectionHeader
            eyebrow="Step 2 · Define"
            title="What are you learning?"
            description="Give your AI wizard a clear topic. You can be broad or specific."
            icon={Target}
          />

          <Surface className="overflow-hidden p-2">
            <div className="rounded-[22px] bg-slate-50 px-5 py-8 sm:px-8 sm:py-10">
              <div className="mb-4 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-blue-600">
                <BookOpen size={14} />
                {answers.contentType}
              </div>

              <input
                autoFocus
                type="text"
                placeholder="e.g. Frontend Development, Machine Learning..."
                value={answers.topic}
                onChange={(e) =>
                  updateAnswer("topic", e.target.value)
                }
                onKeyDown={(e) =>
                  e.key === "Enter" && handleNext()
                }
                className="w-full border-0 bg-transparent text-center text-2xl font-black tracking-tight text-slate-950 outline-none placeholder:text-slate-300 focus:ring-0 sm:text-4xl"
              />

              <div className="mx-auto mt-7 h-px max-w-xl bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

              <p className="mt-5 text-center text-xs font-semibold text-slate-400">
                Press Enter to continue
              </p>
            </div>
          </Surface>
        </motion.div>
      );
    }

    /* ------------------------- CUSTOM QUESTIONS -------------------------- */

    if (
      step >= 2 &&
      step < finalReviewStep
    ) {
      const qIndex = step - 2;
      const currentQ = activeQuestions[qIndex];

      if (!currentQ) return null;

      const ansKey = currentQ.key;

      return (
        <motion.div
          key={currentQ.key}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mx-auto max-w-3xl"
        >
          <SectionHeader
            eyebrow={`Step ${step + 1} · Personalize`}
            title={currentQ.label}
            description="Help the AI understand what will work best for you."
            icon={Brain}
          />

          {currentQ.type === "select" ? (
            <div className="mx-auto grid max-w-xl gap-3">
              {currentQ.options?.map((opt) => {
                const isActive = answers[ansKey] === opt;

                return (
                  <motion.button
                    key={opt}
                    type="button"
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => {
                      updateAnswer(ansKey, opt);

                      setTimeout(() => {
                        setStep((current) => current + 1);
                      }, 180);
                    }}
                    className={cn(
                      "flex items-center justify-between rounded-2xl border px-5 py-4 text-left font-bold transition-all",
                      isActive
                        ? "border-blue-400 bg-blue-50 text-blue-700 shadow-[0_12px_30px_-20px_rgba(37,99,235,0.8)]"
                        : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-slate-50"
                    )}
                  >
                    <span>{opt}</span>

                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full",
                        isActive
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-300"
                      )}
                    >
                      {isActive ? (
                        <CheckCircle size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          ) : currentQ.type === "multiselect" ? (
            <div className="mx-auto max-w-xl">
              <div className="grid gap-3">
                {currentQ.options?.map((opt) => {
                  const selected =
                    (answers[ansKey] || []).includes(opt);

                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        const current =
                          answers[ansKey] || [];

                        const updated = selected
                          ? current.filter(
                            (value) => value !== opt
                          )
                          : [...current, opt];

                        updateAnswer(ansKey, updated);
                      }}
                      className={cn(
                        "flex items-center gap-4 rounded-2xl border px-5 py-4 text-left font-bold transition-all",
                        selected
                          ? "border-cyan-400 bg-cyan-50 text-cyan-800 shadow-[0_12px_30px_-20px_rgba(8,145,178,0.7)]"
                          : "border-slate-200 bg-white text-slate-700 hover:border-cyan-200 hover:bg-slate-50"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all",
                          selected
                            ? "border-cyan-500 bg-cyan-500"
                            : "border-slate-300 bg-white"
                        )}
                      >
                        {selected && (
                          <CheckSquare
                            size={15}
                            className="text-white"
                          />
                        )}
                      </span>

                      {opt}
                    </button>
                  );
                })}
              </div>

              <p className="mt-5 text-center text-xs font-semibold text-slate-400">
                Select all that apply, then continue.
              </p>
            </div>
          ) : (
            <Surface className="mx-auto max-w-2xl p-2">
              <div className="rounded-[22px] bg-slate-50 px-5 py-8 sm:px-8">
                <input
                  autoFocus
                  type={
                    currentQ.type === "short_text"
                      ? "text"
                      : currentQ.type
                  }
                  placeholder={currentQ.placeholder}
                  value={answers[ansKey] || ""}
                  onChange={(e) =>
                    updateAnswer(ansKey, e.target.value)
                  }
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleNext()
                  }
                  className="w-full border-0 bg-transparent text-center text-xl font-black text-slate-950 outline-none placeholder:text-slate-300 focus:ring-0 sm:text-3xl"
                />
              </div>
            </Surface>
          )}
        </motion.div>
      );
    }

    /* ------------------------------ REVIEW -------------------------------- */

    if (step === finalReviewStep) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-3xl"
        >
          <SectionHeader
            eyebrow="Final step · Review"
            title="Ready to generate?"
            description={`Everything looks good. We'll now build your personalized ${answers.contentType.toLowerCase()}.`}
            icon={Sparkles}
          />

          <Surface className="overflow-hidden">
            <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white p-6 sm:p-8">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <Sparkles size={22} />
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Your generation
                  </p>

                  <h3 className="mt-1 text-xl font-black text-slate-950">
                    {answers.contentType}
                  </h3>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              <div className="p-6 sm:p-8">
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Topic
                </p>

                <p className="text-xl font-extrabold text-slate-950">
                  {answers.topic}
                </p>
              </div>

              {activeQuestions.map((q) => (
                <div
                  key={q.key}
                  className="p-6 sm:p-8"
                >
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {q.label}
                  </p>

                  <p className="font-bold leading-6 text-slate-700">
                    {Array.isArray(answers[q.key])
                      ? answers[q.key].join(", ")
                      : answers[q.key]}
                  </p>
                </div>
              ))}
            </div>
          </Surface>
        </motion.div>
      );
    }

    return null;
  };

  /* ------------------------------------------------------------------------ */
  /*                                  UI                                      */
  /* ------------------------------------------------------------------------ */

  return (
    <div
      ref={rootRef}
      className="relative min-h-screen overflow-hidden bg-[#f8fafc] px-4 py-6 sm:px-6 lg:px-8"
    >
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-72 w-72 rounded-full bg-cyan-200/20 blur-3xl" />
        <div className="absolute -right-32 top-40 h-96 w-96 rounded-full bg-blue-200/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-indigo-200/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        {/* ------------------------------------------------------------------ */}
        {/* HEADER                                                             */}
        {/* ------------------------------------------------------------------ */}

        {!generatedData &&
          step < resultStep && (
            <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
                    <WandSparkles size={19} />
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                      AI Learning Wizard
                    </p>

                    <h1 className="text-lg font-black tracking-tight text-slate-950">
                      Create something great
                    </h1>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="inline-flex self-start rounded-2xl border border-slate-200 bg-white p-1 shadow-sm sm:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("generate")}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-extrabold transition-all",
                    activeTab === "generate"
                      ? "bg-slate-950 text-white shadow-md"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  <Edit3 size={16} />
                  Generate
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-extrabold transition-all",
                    activeTab === "history"
                      ? "bg-slate-950 text-white shadow-md"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  <History size={16} />
                  My Content
                </button>
              </div>
            </div>
          )}

        {/* ------------------------------------------------------------------ */}
        {/* GENERATOR                                                          */}
        {/* ------------------------------------------------------------------ */}

        {activeTab === "generate" && (
          <>
            {step < resultStep && (
              <div>
                <WizardProgress
                  step={step}
                  totalSteps={totalSteps}
                />

                <div className="mb-8 min-h-[460px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.22 }}
                    >
                      {renderGeneratorSteps()}
                    </motion.div>
                  </AnimatePresence>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mx-auto mt-6 flex max-w-xl items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700"
                    >
                      <AlertCircle
                        size={18}
                        className="mt-0.5 shrink-0"
                      />

                      <span>{error}</span>
                    </motion.div>
                  )}
                </div>

                {/* Bottom navigation */}
                <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 border-t border-slate-200/70 pt-6">
                  <div>
                    {step > 0 && (
                      <button
                        type="button"
                        onClick={handleBack}
                        className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold text-slate-500 transition hover:bg-white hover:text-slate-900"
                      >
                        <ArrowLeft size={17} />
                        Back
                      </button>
                    )}
                  </div>

                  <div>
                    {step > 0 &&
                      step < finalReviewStep && (
                        <button
                          type="button"
                          onClick={handleNext}
                          className="group inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-800 sm:px-7"
                        >
                          Continue
                          <ArrowRight
                            size={17}
                            className="transition-transform group-hover:translate-x-0.5"
                          />
                        </button>
                      )}

                    {step === finalReviewStep && (
                      <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 px-7 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-blue-600/25 transition hover:-translate-y-0.5 hover:shadow-blue-600/35 disabled:cursor-not-allowed disabled:opacity-60 sm:px-8"
                      >
                        <Sparkles
                          size={18}
                          className="transition-transform group-hover:rotate-12"
                        />
                        Generate Now
                        <ArrowRight
                          size={17}
                          className="transition-transform group-hover:translate-x-0.5"
                        />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------- */}
            {/* RESULT                                                         */}
            {/* -------------------------------------------------------------- */}

            {step === resultStep && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full"
              >
                {isLoading ? (
                  <GeneratingState
                    contentType={answers.contentType}
                    isTutor={isTutor}
                    generatedData={generatedData}
                  />
                ) : generatedData ? (
                  <div>
                    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={startOver}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-50"
                      >
                        <ArrowLeft size={17} />
                        Create Another
                      </button>

                      {message && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-extrabold text-emerald-700"
                        >
                          <CheckCircle size={17} />
                          {message}
                        </motion.div>
                      )}
                    </div>

                    {renderContentData(generatedData)}
                  </div>
                ) : null}
              </motion.div>
            )}
          </>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* HISTORY                                                            */}
        {/* ------------------------------------------------------------------ */}

        {activeTab === "history" && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-4xl"
          >
            <div className="mb-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-black uppercase tracking-widest text-slate-500">
                <History size={14} />
                Your library
              </div>

              <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                My Generated Content
              </h2>

              <p className="mt-3 max-w-2xl text-base font-medium leading-7 text-slate-500">
                Revisit your previously generated learning plans,
                roadmaps, and schedules.
              </p>
            </div>

            {/* Search */}
            {!isHistoryLoading && historyItems.length > 0 && (
              <div className="mb-5">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) =>
                      setHistorySearch(e.target.value)
                    }
                    placeholder="Search your generated content..."
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>
            )}

            {isHistoryLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-28 animate-pulse rounded-[24px] bg-slate-100"
                  />
                ))}
              </div>
            ) : historyItems.length === 0 ? (
              <Surface className="border-dashed p-10 text-center sm:p-16">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
                  <BookOpen size={30} />
                </div>

                <h3 className="text-2xl font-black text-slate-900">
                  Nothing here yet
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">
                  Create your first learning plan and it will
                  appear here automatically.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("generate");
                    setStep(0);
                  }}
                  className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-6 py-3.5 text-sm font-extrabold text-white transition hover:bg-slate-800"
                >
                  <Sparkles size={17} />
                  Generate Something
                </button>
              </Surface>
            ) : filteredHistory.length === 0 ? (
              <Surface className="p-10 text-center">
                <Search
                  size={36}
                  className="mx-auto mb-4 text-slate-300"
                />

                <h3 className="text-xl font-black text-slate-900">
                  No results found
                </h3>

                <p className="mt-2 text-sm font-medium text-slate-500">
                  Try searching for a different topic or content
                  type.
                </p>
              </Surface>
            ) : (
              <div className="space-y-3">
                {filteredHistory.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: index * 0.04,
                    }}
                    onClick={() =>
                      window.open(
                        `/wizard/view/${item.id}`,
                        "_blank"
                      )
                    }
                    className="group cursor-pointer rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_40px_-28px_rgba(15,23,42,0.35)] transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_20px_50px_-30px_rgba(37,99,235,0.35)] sm:p-6"
                  >
                    <div className="flex items-center gap-4">
                      <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50 text-blue-600 sm:flex">
                        <BookOpen size={21} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-700">
                            {item.content_type}
                          </span>

                          <span className="text-xs font-semibold text-slate-400">
                            {new Date(
                              item.created_at
                            ).toLocaleDateString()}
                          </span>
                        </div>

                        <h4 className="truncate text-lg font-black text-slate-950 transition-colors group-hover:text-blue-600">
                          {item.topic}
                        </h4>

                        <p className="mt-1 text-xs font-medium text-slate-400">
                          Open generated content
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) =>
                            handleDeleteHistory(
                              item.id,
                              e
                            )
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-500 transition hover:bg-rose-500 hover:text-white"
                          title="Delete content"
                        >
                          <Trash2 size={17} />
                        </button>

                        <div className="hidden h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-300 transition group-hover:bg-blue-50 group-hover:text-blue-600 sm:flex">
                          <ExternalLink size={17} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}