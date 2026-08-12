import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Check,
  Clock3,
  FileQuestion,
  FileText,
  GraduationCap,
  LineChart,
  MessageSquare,
  Sparkles,
  Target,
  UploadCloud,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";

const modules = [
  {
    title: "AI Tutor Chat",
    text: "Ask grounded questions against your uploaded material and keep every session in one place.",
    icon: <MessageSquare size={22} />,
    to: "/chatbot",
    badge: "RAG-powered",
    badgeColor: "bg-primary/10 text-primary",
  },
  {
    title: "AI Wizard",
    text: "Build an adaptive curriculum with spaced repetition, weak-area detection, and focused study blocks.",
    icon: <Sparkles size={22} />,
    to: "/wizard",
    badge: "New",
    badgeColor: "bg-secondary/10 text-secondary",
  },
  {
    title: "Quiz Generator",
    text: "Create topic-specific tests with difficulty, timing, scoring, and review built in.",
    icon: <FileQuestion size={22} />,
    to: "/quiz",
    badge: "AI-generated",
    badgeColor: "bg-slate-100 text-slate-700",
  },
  {
    title: "Quick Study",
    text: "Turn PDFs, articles, and YouTube lessons into clear summaries you can act on immediately.",
    icon: <FileText size={22} />,
    to: "/quick-study",
    badge: "Summarizer",
    badgeColor: "bg-emerald-50 text-emerald-700",
  },
  {
    title: "Progress Profile",
    text: "Review quiz history, progress signals, account settings, and subscription options.",
    icon: <LineChart size={22} />,
    to: "/profile",
    badge: "Analytics",
    badgeColor: "bg-amber-50 text-amber-700",
  },
];

const stats = [
  { number: "5+", label: "AI-powered modules" },
  { number: "∞", label: "Adaptive study paths" },
  { number: "35m", label: "Focused study blocks" },
];

const highlights = [
  {
    icon: <Zap size={22} />,
    title: "Instant generation",
    text: "Go from a subject or goal to a usable study plan in seconds instead of starting from a blank page.",
  },
  {
    icon: <Target size={22} />,
    title: "Weak-area signals",
    text: "Use quiz performance and study history to focus your next session where it matters most.",
  },
  {
    icon: <GraduationCap size={22} />,
    title: "Better retention",
    text: "Use spaced repetition and focused Pomodoro-style sessions to turn review into a repeatable habit.",
  },
];

const studySteps = [
  {
    title: "Bring your material",
    text: "Upload notes, PDFs, or learning sources.",
  },
  {
    title: "Understand the topic",
    text: "Summarize, ask questions, and verify concepts.",
  },
  {
    title: "Practice deliberately",
    text: "Generate quizzes and surface weak areas.",
  },
  {
    title: "Keep improving",
    text: "Adjust your plan as your progress and deadlines change.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export default function Home() {
  const { isAuthenticated, user } = useAuth();

  const primaryPath = isAuthenticated ? "/wizard" : "/signup";
  const primaryLabel = isAuthenticated ? "Open AI Wizard" : "Start learning";
  const displayName = user?.full_name || user?.email || "learner";

  return (
    <div className="min-h-screen overflow-x-hidden bg-light text-dark">
      {/* Ambient page background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-[-10rem] top-[-8rem] h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-[-8rem] top-[18rem] h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      {/* ───────────────────────── HERO ───────────────────────── */}
      <section className="relative px-4 pb-14 pt-8 sm:px-6 sm:pb-16 sm:pt-10 lg:px-8 lg:pb-24 lg:pt-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid min-w-0 items-center gap-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:gap-16">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={containerVariants}
            >
              <motion.div
                variants={itemVariants}
                className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-primary shadow-sm backdrop-blur"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                AI study planner · adaptive learning
              </motion.div>

              <motion.h1
                variants={itemVariants}
                className="max-w-3xl text-[clamp(2.75rem,10vw,4.5rem)] font-black leading-[0.98] tracking-[-0.04em] text-dark"
              >
                Turn study time into{" "}
                <span className="text-primary">forward progress.</span>
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:mt-6 sm:text-lg sm:leading-8"
              >
                CognitiveWizard brings tutoring, adaptive quizzes, curriculum
                planning, summarization, and progress tracking into one calm
                learning workspace.
              </motion.p>

              <motion.div
                variants={itemVariants}
                className="mt-7 rounded-[1.5rem] border border-slate-200 bg-white p-2 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.3)] sm:mt-8"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[1.1rem] px-3 py-3 sm:px-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Sparkles size={18} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Your next study move
                      </p>

                      <p className="mt-1 break-words text-sm font-semibold text-slate-700 sm:text-base">
                        {isAuthenticated
                          ? `Welcome back, ${displayName}. Pick your next learning action.`
                          : "Start with a topic, upload material, or build a guided study plan."}
                      </p>
                    </div>
                  </div>

                  <Link
                    to={primaryPath}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-slate-900 transition-all hover:-translate-y-0.5 hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/15 sm:w-auto sm:min-w-[132px]"
                  >
                    Generate
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center"
              >
                <Link
                  to={primaryPath}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-bold text-white shadow-lg shadow-slate-900/10 transition-all hover:-translate-y-0.5 sm:w-auto"
                >
                  {primaryLabel}
                  <ArrowRight size={17} />
                </Link>

                <Link
                  to="/about"
                  className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 font-bold text-dark transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
                >
                  Explore platform
                </Link>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500"
              >
                {[
                  "Private study workspace",
                  "Adaptive practice",
                  "Saved sessions",
                ].map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-2"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    {label}
                  </span>
                ))}
              </motion.div>
            </motion.div>

            {/* Hero product preview */}
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.6,
                delay: 0.15,
                ease: "easeOut",
              }}
              className="relative mx-auto w-full min-w-0 max-w-xl"
            >
              <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-primary/15 via-transparent to-secondary/15 blur-2xl" />

              <div className="relative rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-[0_30px_80px_-36px_rgba(15,23,42,0.32)] sm:rounded-[2rem] sm:p-5">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-1 pb-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                      Today&apos;s workspace
                    </p>
                    <h2 className="mt-1 text-base font-extrabold text-dark sm:text-lg">
                      Adaptive study plan
                    </h2>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Brain size={19} />
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-primary shadow-sm">
                      <BookOpen size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="break-words text-sm font-bold text-dark">
                          Machine Learning Foundations
                        </p>

                        <span className="text-xs font-bold text-primary">
                          68%
                        </span>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full w-[68%] rounded-full bg-primary" />
                      </div>

                      <p className="mt-2 text-xs text-slate-500">
                        Next: revisit gradient descent + take a 10-question quiz
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-white p-4">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Clock3 size={15} />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Focus block
                      </span>
                    </div>

                    <div className="mt-3 flex items-end justify-between">
                      <p className="text-2xl font-black text-dark">35 min</p>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
                        On track
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-white p-4">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Target size={15} />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Weak area
                      </span>
                    </div>

                    <p className="mt-3 text-sm font-extrabold text-dark">
                      Gradient descent
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Priority raised from quiz results
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-dark p-4 text-white">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-white/55">
                        Recommended next
                      </p>
                      <p className="mt-1 text-sm font-bold">
                        Review → Practice → Re-test
                      </p>
                    </div>

                    <div className="rounded-xl bg-white/10 p-2.5">
                      <Sparkles size={17} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-5 -left-4 hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl shadow-slate-900/10 sm:flex sm:items-center sm:gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <UploadCloud size={17} />
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Ready when you are
                  </p>
                  <p className="break-words text-sm font-bold text-dark">
                    Upload your next source
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Stats */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            className="mt-16 grid overflow-hidden rounded-2xl border border-slate-200 bg-white sm:grid-cols-3"
          >
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={`px-6 py-7 text-center ${index < stats.length - 1
                  ? "border-b border-slate-100 sm:border-b-0 sm:border-r"
                  : ""
                  }`}
              >
                <div className="text-3xl font-black tracking-tight text-primary sm:text-4xl">
                  {stat.number}
                </div>

                <div className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─────────────────────── VALUE PROPOSITION ─────────────────────── */}
      <section className="border-y border-slate-200/70 bg-white px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-end gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Why CognitiveWizard
              </p>

              <h2 className="mt-3 max-w-xl text-3xl font-black leading-tight tracking-tight text-dark sm:text-4xl">
                Less setup. More actual learning.
              </h2>
            </div>

            <p className="max-w-2xl text-base leading-7 text-slate-600 lg:justify-self-end">
              The experience is built around the study loop: collect material,
              understand it, practice it, then let your results shape the next
              session.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {highlights.map((highlight, index) => (
              <motion.article
                key={highlight.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={fadeUp}
                transition={{ delay: index * 0.06 }}
                className="group rounded-2xl border border-slate-200 bg-light p-6 transition-all hover:-translate-y-1 hover:border-primary/20 hover:bg-white hover:shadow-xl hover:shadow-slate-900/5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-primary shadow-sm transition-colors group-hover:bg-primary group-hover:text-white">
                  {highlight.icon}
                </div>

                <h3 className="mt-5 text-lg font-extrabold text-dark">
                  {highlight.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {highlight.text}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────── STUDY LOOP ─────────────────────── */}
      <section className="bg-light px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div className="lg:sticky lg:top-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                A clearer study flow
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-tight text-dark sm:text-4xl">
                From first upload to confident recall.
              </h2>

              <p className="mt-5 max-w-lg leading-7 text-slate-600">
                CognitiveWizard turns scattered study tasks into a simple
                sequence you can repeat for almost any subject.
              </p>

              <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Brain size={19} />
                  </div>

                  <div>
                    <p className="break-words text-sm font-bold text-dark">
                      Designed for information overload
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Automate the meta-work — organization, summaries,
                      practice, and planning — so your attention stays on the
                      subject.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute left-5 top-6 hidden h-[calc(100%-3rem)] w-px bg-slate-200 md:block" />

              <div className="space-y-5">
                {studySteps.map((step, index) => (
                  <motion.div
                    key={step.title}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    variants={fadeUp}
                    transition={{ delay: index * 0.06 }}
                    className="relative min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:pl-20"
                  >
                    <div className="absolute left-4 top-5 hidden h-10 w-10 items-center justify-center rounded-xl bg-dark text-sm font-black text-white md:flex">
                      0{index + 1}
                    </div>

                    <div className="md:hidden">
                      <span className="inline-flex rounded-full bg-dark px-2.5 py-1 text-[11px] font-bold text-white">
                        Step 0{index + 1}
                      </span>
                    </div>

                    <h3 className="mt-3 text-lg font-extrabold text-dark md:mt-0">
                      {step.title}
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {step.text}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────── MODULES ─────────────────────── */}
      <section className="bg-white px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Workspace modules
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-tight text-dark sm:text-4xl">
                One workspace. Every study job.
              </h2>

              <p className="mt-4 leading-7 text-slate-600">
                Jump directly into the tool you need without losing the context
                of the rest of your study workflow.
              </p>
            </div>

            <Link
              to={primaryPath}
              className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-dark transition-colors hover:border-slate-300 hover:bg-slate-50 md:self-auto"
            >
              {isAuthenticated
                ? "Open workspace"
                : "Create your workspace"}
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((module, index) => (
              <motion.div
                key={module.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.15 }}
                variants={fadeUp}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={module.to}
                  className="group flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl hover:shadow-slate-900/5 sm:p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-light text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                      {module.icon}
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${module.badgeColor}`}
                    >
                      {module.badge}
                    </span>
                  </div>

                  <div className="mt-5 flex-1">
                    <h3 className="text-lg font-extrabold text-dark">
                      {module.title}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {module.text}
                    </p>
                  </div>

                  <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-primary">
                    Open module
                    <ArrowRight
                      size={15}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────── CTA ─────────────────────── */}
      <section className="px-4 pb-20 pt-4 sm:px-6 lg:px-8 lg:pb-24">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            className="relative overflow-hidden rounded-[1.5rem] bg-dark px-5 py-10 text-white shadow-2xl shadow-slate-900/10 sm:rounded-[2rem] sm:px-10 sm:py-16 lg:px-16"
          >
            <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/25 blur-3xl" />
            <div className="absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-secondary/15 blur-3xl" />

            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">
                  Ready to study smarter?
                </p>

                <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                  Build your next focused study session in minutes.
                </h2>

                <p className="mt-5 max-w-xl text-base leading-7 text-white/65">
                  Start with one subject, one source, or one quiz. Let the rest
                  of the workspace meet you where you are.
                </p>
              </div>

              <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row">
                <Link
                  to={primaryPath}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate px-6 py-3.5 font-bold text-dark transition-all hover:-translate-y-0.5 hover:bg-slate-800 sm:w-auto"
                >
                  {isAuthenticated
                    ? "Open AI Wizard"
                    : "Create free account"}
                  <ArrowRight size={16} />
                </Link>

                <Link
                  to="/quiz"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-6 py-3.5 font-bold text-white transition-all hover:bg-white/15 sm:w-auto"
                >
                  Try a quiz
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}