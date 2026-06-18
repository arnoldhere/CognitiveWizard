import { useRef } from "react";
import { Link } from "react-router-dom";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import PsychologyIcon from "@mui/icons-material/Psychology";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import SecurityIcon from "@mui/icons-material/Security";
import DevicesIcon from "@mui/icons-material/Devices";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import TimerIcon from "@mui/icons-material/Timer";
import QuizIcon from "@mui/icons-material/Quiz";
import { useGsapReveal } from "../hooks/useGsapReveal";

const features = [
  ["AI-powered quiz generation", "Create controlled practice tests with difficulty, count, scoring, and detailed feedback.", <AutoAwesomeIcon />],
  ["Adaptive learning support", "Performance and weak-area signals guide every next learning action.", <PsychologyIcon />],
  ["Progress analytics", "Review history and outcomes so revision work stays targeted and measurable.", <TrendingUpIcon />],
  ["Concept summarization", "Break down complex material into concise study points and quick-reference summaries.", <LightbulbIcon />],
  ["Pomodoro focus timer", "Built-in 35-min focus + 5-min break rhythm integrated directly into the AI Wizard.", <TimerIcon />],
  ["Quiz builder", "AI-generated quizzes from any subject with difficulty tuning and score tracking.", <QuizIcon />],
  ["Secure and private", "JWT authentication, private user workspaces, and optional face login support.", <SecurityIcon />],
  ["Study anywhere", "Fully responsive layouts for laptops, tablets, and phones.", <DevicesIcon />],
];

const timeline = [
  { phase: "Phase 1", label: "RAG Tutor + Quiz Engine", done: true },
  { phase: "Phase 2", label: "Summarization + Quick Study", done: true },
  { phase: "Phase 3", label: "AI Wizard — Curriculum Generator", done: true },
  { phase: "Phase 4", label: "Analytics Dashboard + Streak Tracker", done: false },
  { phase: "Phase 5", label: "Collaborative Study Rooms", done: false },
];

export default function About() {
  const rootRef = useRef(null);
  useGsapReveal(rootRef);

  return (
    <section ref={rootRef} className="page-shell">
      <div className="container">
        {/* Header */}
        <div className="page-header" data-reveal>
          <p className="eyebrow">About CognitiveWizard</p>
          <h1 className="page-title">A calmer AI workspace for serious preparation.</h1>
          <p className="section-copy">
            CognitiveWizard is an intelligent study companion for students,
            educators, and independent learners. It reduces cognitive load by
            combining document understanding, quiz practice, AI curriculum planning,
            summaries, and learning history in one secure platform.
          </p>
          <div className="hero-actions" style={{ marginTop: "24px" }}>
            <Link to="/wizard" className="btn-primary" id="about-cta-wizard">Try AI Wizard</Link>
            <Link to="/chatbot" className="btn-secondary" id="about-cta-chat">Open AI Tutor</Link>
          </div>
        </div>

        {/* Features grid */}
        <div className="feature-grid">
          {features.map(([title, text, icon]) => (
            <article className="feature-item" key={title} data-reveal>
              <span className="feature-icon">{icon}</span>
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </div>

        {/* Roadmap timeline */}
        <div className="section-divider" style={{ margin: "56px 0 40px" }} />
        <div className="page-header" data-reveal>
          <p className="eyebrow">Product roadmap</p>
          <h2 className="page-title">Where we are &amp; where we're going.</h2>
        </div>
        <div style={{ display: "grid", gap: "12px", maxWidth: "640px" }} data-reveal>
          {timeline.map((item, i) => (
            <div key={item.phase} className="wizard-card" style={{ display: "flex", gap: "14px", alignItems: "center" }}>
              <div style={{
                width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
                background: item.done
                  ? "linear-gradient(135deg,var(--primary),var(--accent))"
                  : "var(--surface-bright)",
                border: item.done ? "none" : "2px solid var(--border-strong)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: ".75rem", fontWeight: 800, color: item.done ? "#fff" : "var(--muted)",
              }}>{item.done ? "✓" : i + 1}</div>
              <div>
                <div style={{ fontSize: ".72rem", color: "var(--muted)", fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase" }}>{item.phase}</div>
                <div style={{ fontWeight: 700, color: item.done ? "var(--text)" : "var(--text-light)" }}>{item.label}</div>
              </div>
              {item.done && <span className="chip chip-success" style={{ marginLeft: "auto" }}>Live</span>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
