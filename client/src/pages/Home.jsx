import { useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useGsapReveal } from "../hooks/useGsapReveal";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import PsychologyIcon from "@mui/icons-material/Psychology";
import QuizIcon from "@mui/icons-material/Quiz";
import SummarizeIcon from "@mui/icons-material/Summarize";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import TimelineIcon from "@mui/icons-material/Timeline";
import SchoolIcon from "@mui/icons-material/School";
import BoltIcon from "@mui/icons-material/Bolt";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";

const modules = [
  {
    title: "AI Tutor Chat",
    text: "Ask grounded questions against your uploaded study material with saved sessions.",
    icon: <ChatBubbleOutlineIcon />,
    to: "/chatbot",
    badge: "RAG-powered",
    badgeClass: "chip-accent",
  },
  {
    title: "AI Wizard Module",
    text: "Generate an adaptive curriculum with spaced repetition, weak-area detection, and Pomodoro flow.",
    icon: <AutoAwesomeIcon />,
    to: "/wizard",
    badge: "New",
    badgeClass: "chip",
  },
  {
    title: "Quiz Generator",
    text: "Build topic-specific practice tests with difficulty, timing, scoring, and review flow.",
    icon: <QuizIcon />,
    to: "/quiz",
    badge: "AI-generated",
    badgeClass: "chip",
  },
  {
    title: "Quick Study",
    text: "Turn PDFs, articles, and YouTube lessons into concise or detailed summaries.",
    icon: <SummarizeIcon />,
    to: "/quick-study",
    badge: "Summarizer",
    badgeClass: "chip-success",
  },
  {
    title: "Progress Profile",
    text: "Review quiz history, account settings, face login, and subscription options.",
    icon: <TimelineIcon />,
    to: "/profile",
    badge: "Analytics",
    badgeClass: "chip-warn",
  },
];

const stats = [
  { number: "5+", label: "AI-Powered Modules" },
  { number: "∞", label: "Adaptive Study Plans" },
  { number: "35min", label: "Focused Study Blocks" },
];

const highlights = [
  { icon: <BoltIcon />, title: "Instant Generation", text: "AI builds a full course plan in seconds from your goal and subject." },
  { icon: <TrackChangesIcon />, title: "Weak-Area Detection", text: "Automatically identifies gaps and adjusts your schedule." },
  { icon: <SchoolIcon />, title: "Spaced Repetition", text: "Scientifically timed review sessions maximize long-term retention." },
];

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const rootRef = useRef(null);
  useGsapReveal(rootRef);

  return (
    <div ref={rootRef}>
      {/* ── HERO ── */}
      <section className="hero-section">
        <div className="container hero-content">
          <div className="hero-copy">
            <p className="eyebrow" data-reveal>AI study planner &amp; adaptive learning platform</p>
            <h1 className="hero-title" data-reveal>
              What can I help you learn today?
            </h1>
            <p className="section-copy" data-reveal>
              CognitiveWizard combines a private RAG tutor, adaptive quizzes,
              AI curriculum wizard, summarization, and progress tracking into
              one focused learning workspace.
            </p>

            <div className="ai-command" data-reveal>
              <div className="command-input">
                <AutoAwesomeIcon style={{ color: "var(--primary-light)", flexShrink: 0 }} />
                <span>
                  {isAuthenticated
                    ? `Welcome back, ${user?.full_name || user?.email}. Choose your next study action.`
                    : "Enter a topic, upload material, or start with a guided study flow."}
                </span>
                <Link className="btn-primary" to={isAuthenticated ? "/wizard" : "/signup"} id="hero-cta-generate">
                  Generate
                </Link>
              </div>
              <div className="mode-tabs" aria-label="Learning formats">
                <Link className="mode-tab active" to="/quick-study" id="mode-course">Course</Link>
                <Link className="mode-tab" to="/chatbot" id="mode-guide">Guide</Link>
                <Link className="mode-tab" to="/quiz" id="mode-quiz">Quiz</Link>
              </div>
            </div>

            <div className="hero-actions" data-reveal>
              <Link className="btn-primary" to={isAuthenticated ? "/wizard" : "/signup"} id="hero-cta-start">
                Start Learning
              </Link>
              <Link className="btn-secondary" to="/about" id="hero-cta-explore">
                Explore Platform
              </Link>
            </div>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div className="study-board" data-reveal>
            <article className="board-card">
              <p className="small-label">Personalized path</p>
              <div className="roadmap-line">
                <div className="roadmap-step">
                  <strong>Collect material</strong>
                  <p>Upload notes or paste learning sources.</p>
                </div>
                <div className="roadmap-step">
                  <strong>Understand faster</strong>
                  <p>Summarize, question, and verify concepts.</p>
                </div>
                <div className="roadmap-step">
                  <strong>Practice deliberately</strong>
                  <p>Generate quizzes and identify weak areas.</p>
                </div>
                <div className="roadmap-step">
                  <strong>Track &amp; adjust</strong>
                  <p>AI auto-updates your plan as deadlines shift.</p>
                </div>
              </div>
            </article>

            <article className="board-card" style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
              <div className="metric-badge">
                <PsychologyIcon />
              </div>
              <div>
                <h3 style={{ color: "var(--text)", fontSize: "1rem", marginBottom: "6px" }}>
                  Designed for information overload
                </h3>
                <p style={{ margin: 0, fontSize: ".88rem" }}>
                  Smart automation for meta-tasks — organization, summaries, and adaptive practice.
                </p>
              </div>
            </article>
          </div>
        </div>

        {/* Stats row */}
        <div className="container">
          <div className="stats-row" data-reveal>
            {stats.map(s => (
              <div className="stat-card" key={s.label}>
                <div className="stat-number">{s.number}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HIGHLIGHTS ── */}
      <section className="page-shell" style={{ paddingTop: "48px" }}>
        <div className="container">
          <div className="section-divider" />
          <div className="page-header" data-reveal>
            <p className="eyebrow">Why CognitiveWizard</p>
            <h2 className="page-title">Built for deep, deliberate learning.</h2>
            <p className="section-copy">
              Every module is designed around cognitive science — spaced repetition,
              weak-area signals, and focused Pomodoro blocks keep study sessions productive.
            </p>
          </div>
          <div className="feature-grid">
            {highlights.map(h => (
              <article className="feature-item" key={h.title} data-reveal>
                <span className="feature-icon">{h.icon}</span>
                <h2>{h.title}</h2>
                <p>{h.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── MODULES GRID ── */}
      <section className="page-shell" style={{ paddingTop: "0" }}>
        <div className="container">
          <div className="section-divider" />
          <div className="page-header" data-reveal>
            <p className="eyebrow">Workspace modules</p>
            <h2 className="page-title">Pick the tool that fits the study job.</h2>
            <p className="section-copy">
              The interface keeps core actions visible, uses compact cards for
              scanning, and adapts cleanly across desktop, tablet, and mobile.
            </p>
          </div>
          <div className="feature-grid">
            {modules.map(mod => (
              <Link
                className="feature-item"
                to={mod.to}
                key={mod.title}
                data-reveal
                id={`module-card-${mod.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <span className={`chip ${mod.badgeClass}`} style={{ marginBottom: "12px" }}>{mod.badge}</span>
                <span className="feature-icon">{mod.icon}</span>
                <h2>{mod.title}</h2>
                <p>{mod.text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="page-shell" style={{ paddingTop: "0" }}>
        <div className="container">
          <div
            className="board-card"
            style={{
              background: "linear-gradient(135deg,rgba(124,58,237,0.15) 0%,rgba(30, 217, 242,0.1) 100%)",
              border: "1px solid rgba(124,58,237,0.3)",
              textAlign: "center",
              padding: "56px 40px",
            }}
            data-reveal
          >
            <p className="eyebrow" style={{ marginBottom: "12px" }}>Ready to level up?</p>
            <h2 style={{ margin: "0 0 16px", color: "var(--text)", fontSize: "clamp(1.6rem,3vw,2.2rem)", fontWeight: 900 }}>
              Start your adaptive learning journey today.
            </h2>
            <p className="section-copy" style={{ margin: "0 auto 28px" }}>
              Join learners using CognitiveWizard to study smarter with AI.
            </p>
            <div className="hero-actions" style={{ justifyContent: "center" }}>
              <Link className="btn-primary" to={isAuthenticated ? "/wizard" : "/signup"} id="cta-banner-start">
                {isAuthenticated ? "Open AI Wizard" : "Create Free Account"}
              </Link>
              <Link className="btn-secondary" to="/quiz" id="cta-banner-quiz">Try a Quiz</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
