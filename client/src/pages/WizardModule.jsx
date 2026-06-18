import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ScheduleIcon from "@mui/icons-material/Schedule";
import PsychologyIcon from "@mui/icons-material/Psychology";
import TimerIcon from "@mui/icons-material/Timer";
import SummarizeIcon from "@mui/icons-material/Summarize";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import EventIcon from "@mui/icons-material/Event";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { useGsapReveal } from "../hooks/useGsapReveal";

const levelOptions = ["Beginner", "Intermediate", "Advanced"];
const subjectSuggestions = ["Machine Learning", "Web Development", "Data Science", "Mathematics", "History", "Biology", "Finance"];

const MODULE_POOLS = {
  "Machine Learning": ["Linear Algebra Basics", "Supervised Learning", "Neural Networks", "Model Evaluation", "Deep Learning", "NLP Foundations"],
  "Web Development": ["HTML & CSS Essentials", "JavaScript Core", "React Fundamentals", "API Design", "State Management", "Deployment"],
  default: ["Foundations", "Core Concepts", "Intermediate Theory", "Practical Application", "Review & Practice", "Advanced Topics"],
};

function getModules(subject, count) {
  const pool = MODULE_POOLS[subject] || MODULE_POOLS.default;
  return pool.slice(0, Math.min(Number(count) || 4, pool.length));
}

function simulateWeakArea(subject) {
  if (!subject) return "Enter a subject to get weak-area recommendations.";
  const areas = {
    "Machine Learning": ["Gradient Descent intuition", "Regularisation techniques", "Bias-Variance tradeoff"],
    "Web Development": ["Async/Await patterns", "CSS specificity", "Component lifecycle"],
  };
  const found = areas[subject] || ["Conceptual gaps", "Application of theory", "Problem-solving speed"];
  return `Suggested focus areas: ${found.join(" · ")}`;
}

function buildSchedule({ duration, deadline, modules }) {
  const weeks = Number(duration) || 6;
  const mods = Number(modules) || 4;
  const sessionsPerWeek = 3;
  return [
    { icon: <ScheduleIcon />, label: `${weeks}-week adaptive plan`, sub: `${mods} modules · ${sessionsPerWeek} sessions/week` },
    { icon: <TimerIcon />, label: "35 min focus + 5 min break", sub: "Pomodoro rhythm per session" },
    { icon: <TrackChangesIcon />, label: "Spaced repetition engine", sub: "Reviews scheduled at optimal intervals" },
    { icon: <EventIcon />, label: `Deadline: ${deadline}`, sub: "Auto-adjusts when deadline changes" },
  ];
}

const initialForm = {
  goal: "",
  subject: "",
  modules: "5",
  duration: "6",
  level: "Intermediate",
  deadline: "",
};

export default function WizardModule() {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [planReady, setPlanReady] = useState(false);
  const [activePomodoro, setActivePomodoro] = useState(false);
  const [pomodoroTime, setPomodoroTime] = useState(35 * 60);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);
  const timerRef = useRef(null);
  const rootRef = useRef(null);
  useGsapReveal(rootRef);

  const schedule = useMemo(() => buildSchedule(form), [form]);
  const moduleList = useMemo(() => getModules(form.subject, form.modules), [form.subject, form.modules]);
  const weakArea = useMemo(() => simulateWeakArea(form.subject), [form.subject]);

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    setError(null);
    setPlanReady(false);
  };

  const handleGenerate = (e) => {
    e.preventDefault();
    if (!form.goal.trim()) { setError("Please describe your ultimate goal to generate a plan."); return; }
    if (!form.subject.trim()) { setError("Please enter a subject or topic."); return; }
    if (!form.deadline) { setError("Please set a deadline so the AI scheduler can plan your sessions."); return; }
    setError(null);
    setMessage("✓ Your adaptive AI plan has been generated! Review the schedule and modules below.");
    setPlanReady(true);
  };

  // Pomodoro timer logic
  const startPomodoro = () => {
    if (pomodoroRunning) { clearInterval(timerRef.current); setPomodoroRunning(false); return; }
    setPomodoroRunning(true);
    timerRef.current = setInterval(() => {
      setPomodoroTime(t => {
        if (t <= 1) { clearInterval(timerRef.current); setPomodoroRunning(false); return 5 * 60; }
        return t - 1;
      });
    }, 1000);
  };

  const resetPomodoro = () => {
    clearInterval(timerRef.current);
    setPomodoroRunning(false);
    setPomodoroTime(35 * 60);
  };

  const mins = String(Math.floor(pomodoroTime / 60)).padStart(2, "0");
  const secs = String(pomodoroTime % 60).padStart(2, "0");
  const isBreak = pomodoroTime <= 5 * 60 && pomodoroTime > 0 && !pomodoroRunning && pomodoroTime !== 35 * 60;

  return (
    <section ref={rootRef} className="page-shell wizard-page">

      {/* ── HERO ── */}
      <div className="container">
        <div className="wizard-hero">
          <div className="hero-copy">
            <p className="eyebrow">Wizard Module (AI)</p>
            <h1 className="hero-title">Design your AI-powered study roadmap.</h1>
            <p className="section-copy">
              Set a strong goal, choose subjects, duration, difficulty, and deadline.
              The wizard creates an adaptive curriculum with spaced repetition,
              weak-area detection, Pomodoro rhythm, and instant summaries.
            </p>
            <div className="hero-actions">
              <Link className="btn-primary" to="/quiz" id="wizard-cta-quiz">Try Quiz Builder</Link>
              <Link className="btn-secondary" to="/quick-study" id="wizard-cta-summary">Summary Engine</Link>
            </div>
          </div>

          <div className="wizard-hero-card">
            <div className="wizard-highlight-card">
              <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px" }}>
                <AutoAwesomeIcon style={{ color: "var(--primary-light)", fontSize: "2rem" }} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--text)" }}>AI Curriculum Companion</div>
                  <div style={{ color: "var(--text-light)", fontSize: ".85rem" }}>Adaptive · Intelligent · Goal-first</div>
                </div>
              </div>
              <p style={{ color: "var(--text-light)", margin: "0 0 18px", fontSize: ".92rem" }}>
                Smart course architecture that adapts when your deadlines move and your knowledge gaps surface.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                <span className="chip">Spaced Repetition</span>
                <span className="chip chip-accent">Weak Topic Detection</span>
                <span className="chip chip-success">Pomodoro Flow</span>
                <span className="chip chip-warn">Auto-Adjust</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FLOW DIAGRAM ── */}
      <div className="container" style={{ marginBottom: "48px" }}>
        <div className="board-card" data-reveal>
          <p className="small-label">Proposed AI flow</p>
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "flex", gap: "0", alignItems: "center", minWidth: "600px" }}>
              {["Goal Input", "AI Scheduler", "Weak Detector", "Pomodoro 35+5", "Auto-Adjust", "Summary Engine"].map((step, i, arr) => (
                <div key={step} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                  <div style={{
                    flex: 1, padding: "12px 10px", textAlign: "center",
                    background: "var(--surface-soft)", border: "1px solid var(--border-strong)",
                    borderRadius: "10px", fontSize: ".78rem", fontWeight: 700,
                    color: i === 0 ? "var(--primary-light)" : i === arr.length - 1 ? "var(--accent)" : "var(--text-light)",
                  }}>{step}</div>
                  {i < arr.length - 1 && (
                    <div style={{ width: "24px", textAlign: "center", color: "var(--border-strong)", flexShrink: 0 }}>→</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="container wizard-grid">

        {/* ── FORM PANEL ── */}
        <div className="wizard-form-panel">
          <div className="wizard-panel" style={{ padding: "clamp(24px,4vw,40px)" }}>
            <p className="eyebrow">Step 1: Ultimate Goal</p>
            <h2 style={{ margin: "0 0 8px", color: "var(--text)", fontWeight: 900, fontSize: "1.5rem" }}>
              Start with your strongest objective.
            </h2>
            <p style={{ color: "var(--text-light)", marginBottom: "28px", fontSize: ".9rem" }}>
              The better the goal, the sharper the AI recommendations.
            </p>

            <form onSubmit={handleGenerate} style={{ display: "grid", gap: "18px" }}>
              <div className="wiz-field">
                <label className="wiz-label" htmlFor="wiz-goal">Ultimate Goal *</label>
                <textarea
                  id="wiz-goal"
                  className="wiz-input wiz-textarea"
                  rows={3}
                  placeholder="e.g. Master Machine Learning fundamentals and build 2 real projects in 8 weeks."
                  value={form.goal}
                  onChange={handleChange("goal")}
                />
                <span className="wiz-hint">Use specific, measurable outcomes for best results.</span>
              </div>

              <div className="form-grid">
                <div className="wiz-field">
                  <label className="wiz-label" htmlFor="wiz-subject">Subject / Topic *</label>
                  <input
                    id="wiz-subject"
                    className="wiz-input"
                    list="subject-suggestions"
                    placeholder="e.g. Machine Learning"
                    value={form.subject}
                    onChange={handleChange("subject")}
                  />
                  <datalist id="subject-suggestions">
                    {subjectSuggestions.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <div className="wiz-field">
                  <label className="wiz-label" htmlFor="wiz-level">Difficulty Level</label>
                  <select id="wiz-level" className="wiz-input" value={form.level} onChange={handleChange("level")}>
                    {levelOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div className="wiz-field">
                  <label className="wiz-label" htmlFor="wiz-modules">Total Modules</label>
                  <input id="wiz-modules" className="wiz-input" type="number" min="1" max="12" value={form.modules} onChange={handleChange("modules")} />
                </div>
                <div className="wiz-field">
                  <label className="wiz-label" htmlFor="wiz-duration">Duration (weeks)</label>
                  <input id="wiz-duration" className="wiz-input" type="number" min="1" max="52" value={form.duration} onChange={handleChange("duration")} />
                </div>
              </div>

              <div className="wiz-field">
                <label className="wiz-label" htmlFor="wiz-deadline">Deadline *</label>
                <input id="wiz-deadline" className="wiz-input" type="date" value={form.deadline} onChange={handleChange("deadline")} />
                <span className="wiz-hint">The AI scheduler will auto-adjust the plan if this date changes.</span>
              </div>

              {error && <div className="error-message" role="alert">{error}</div>}
              {message && (
                <div style={{
                  padding: "13px 16px", color: "#6ee7b7",
                  background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)",
                  borderRadius: "12px", fontSize: ".9rem"
                }} role="status">{message}</div>
              )}

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                <button type="submit" className="btn-primary" id="wiz-generate-btn" style={{ fontSize: "1rem", padding: "12px 28px" }}>
                  <AutoAwesomeIcon style={{ fontSize: "1.1rem" }} /> Build My Plan
                </button>
                <span style={{ color: "var(--text-light)", fontSize: ".82rem" }}>
                  AI scheduler · spaced repetition · auto-adjustment
                </span>
              </div>
            </form>
          </div>
        </div>

        {/* ── SUMMARY PANEL ── */}
        <div className="wizard-summary-panel">
          <div className="wizard-panel wizard-summary-card">

            {/* Schedule */}
            <p className="small-label">AI schedule overview</p>
            <h3 style={{ margin: "0 0 20px", color: "var(--text)", fontWeight: 900 }}>Adaptive Plan Preview</h3>
            <div style={{ display: "grid", gap: "10px", marginBottom: "24px" }}>
              {schedule.map((item, i) => (
                <div className="wizard-card" key={i}>
                  <div className="wizard-card-header">
                    <span style={{ color: "var(--primary-light)" }}>{item.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: ".92rem" }}>{item.label}</div>
                      <div style={{ color: "var(--text-light)", fontSize: ".78rem", fontWeight: 400 }}>{item.sub}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "20px 0" }} />

            {/* Weak area detector */}
            <div className="wizard-status-card" style={{ marginBottom: "12px" }}>
              <div className="wizard-card-header">
                <PsychologyIcon style={{ color: "var(--accent)" }} />
                <strong>Weak Topic Detector</strong>
              </div>
              <p style={{ margin: 0, color: "var(--text-light)", fontSize: ".85rem" }}>{weakArea}</p>
            </div>

            {/* Pomodoro timer */}
            <div className="wizard-status-card" style={{ marginBottom: "12px" }}>
              <div className="wizard-card-header">
                <TimerIcon style={{ color: "var(--secondary)" }} />
                <strong>Pomodoro Timer</strong>
                <span className={`chip ${isBreak ? "chip-success" : ""}`} style={{ marginLeft: "auto", fontSize: ".7rem" }}>
                  {isBreak ? "Break!" : pomodoroRunning ? "Studying" : "Ready"}
                </span>
              </div>
              <div style={{ textAlign: "center", margin: "8px 0 14px" }}>
                <div style={{
                  fontSize: "2.8rem", fontWeight: 900, fontVariantNumeric: "tabular-nums",
                  background: "linear-gradient(135deg,var(--primary-light),var(--accent))",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                  letterSpacing: ".04em",
                }}>{mins}:{secs}</div>
                <p style={{ margin: "4px 0 0", color: "var(--text-light)", fontSize: ".78rem" }}>
                  35 min focus · 5 min break
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className={pomodoroRunning ? "btn-secondary" : "btn-primary"}
                  onClick={startPomodoro}
                  style={{ flex: 1, fontSize: ".85rem" }}
                  id="pomodoro-toggle-btn"
                >
                  {pomodoroRunning ? "Pause" : "Start Focus"}
                </button>
                <button className="btn-link" onClick={resetPomodoro} style={{ flex: "0 0 auto" }} id="pomodoro-reset-btn">
                  Reset
                </button>
              </div>
            </div>

            {/* Summary engine */}
            <div className="wizard-status-card" style={{ marginBottom: "20px" }}>
              <div className="wizard-card-header">
                <SummarizeIcon style={{ color: "var(--green)" }} />
                <strong>Summary Engine</strong>
              </div>
              <p style={{ margin: "0 0 12px", color: "var(--text-light)", fontSize: ".85rem" }}>
                Generate quick summaries for every section. Select content below to summarize.
              </p>
              <Link to="/quick-study" className="btn-secondary" style={{ width: "100%", textAlign: "center", fontSize: ".85rem" }} id="wiz-summary-link">
                Open Summarizer →
              </Link>
            </div>

            {/* Module chips */}
            {planReady && moduleList.length > 0 && (
              <div>
                <p className="small-label" style={{ marginBottom: "12px" }}>Generated course modules</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {moduleList.map((mod, i) => (
                    <span key={mod} className="chip" style={{ animationDelay: `${i * 80}ms` }}>
                      <MenuBookIcon style={{ fontSize: ".9rem" }} /> {mod}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {planReady && (
              <button className="btn-secondary" style={{ width: "100%", marginTop: "16px" }} id="wiz-review-plan-btn">
                <TaskAltIcon style={{ fontSize: "1rem" }} /> Review Full Plan Details
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── FEATURE INFO CARDS ── */}
      <div className="container" style={{ marginTop: "56px" }}>
        <div className="section-divider" />
        <p className="eyebrow" data-reveal>Wizard capabilities</p>
        <h2 className="page-title" style={{ marginBottom: "32px" }} data-reveal>Every feature explained.</h2>
        <div className="feature-grid" data-reveal>
          {[
            { icon: <AutoAwesomeIcon />, title: "AI Scheduler", text: "Generates a personalised week-by-week study plan using your goal, subject, duration, and level as inputs." },
            { icon: <TrackChangesIcon />, title: "Spaced Repetition Engine", text: "Scientifically schedules review sessions at expanding intervals to maximise long-term retention." },
            { icon: <PsychologyIcon />, title: "Weak Area Detector", text: "Identifies knowledge gaps from your subject and quiz history, then reprioritises your schedule." },
            { icon: <TimerIcon />, title: "Pomodoro Flow", text: "5-minute break after every 35-minute deep-work block. Built-in timer keeps you on rhythm." },
            { icon: <EventIcon />, title: "Deadline Auto-Adjust", text: "When you change the deadline the AI re-calculates session density and module order automatically." },
            { icon: <SummarizeIcon />, title: "Summary Engine Plugin", text: "Select any section or content and get a quick AI summary — ideal for revision or note-making." },
          ].map(card => (
            <article className="feature-item" key={card.title}>
              <span className="feature-icon">{card.icon}</span>
              <h2>{card.title}</h2>
              <p>{card.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
