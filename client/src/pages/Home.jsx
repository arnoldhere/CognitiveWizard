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

const modules = [
  {
    title: "AI Tutor Chat",
    text: "Ask grounded questions against your uploaded study material with saved sessions.",
    icon: <ChatBubbleOutlineIcon />,
    to: "/chatbot",
  },
  {
    title: "Quiz Generator",
    text: "Build topic-specific practice tests with difficulty, timing, scoring, and review flow.",
    icon: <QuizIcon />,
    to: "/quiz",
  },
  {
    title: "Quick Study",
    text: "Turn PDFs, articles, and YouTube lessons into concise or detailed summaries.",
    icon: <SummarizeIcon />,
    to: "/quick-study",
  },
  {
    title: "Progress Profile",
    text: "Review quiz history, account settings, face login, and subscription options.",
    icon: <TimelineIcon />,
    to: "/profile",
  },
];

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const rootRef = useRef(null);
  useGsapReveal(rootRef);

  return (
    <div ref={rootRef}>
      <section className="hero-section">
        <div className="container hero-content">
          <div className="hero-copy">
            <p className="eyebrow" data-reveal>
              AI study planner and preparation guide
            </p>
            <h1 className="hero-title" data-reveal>
              What can I help you learn today?
            </h1>
            <p className="section-copy" data-reveal>
              CognitiveWizard combines a private RAG tutor, adaptive quizzes,
              summarization, profile tracking, and secure authentication into
              one focused learning workspace.
            </p>

            <div className="ai-command" data-reveal>
              <div className="command-input">
                <AutoAwesomeIcon />
                <span>
                  {isAuthenticated
                    ? `Welcome ${user?.full_name || user?.email}. Choose your next study action.`
                    : "Enter a topic, upload material, or start with a guided study flow."}
                </span>
                <Link className="btn-primary" to={isAuthenticated ? "/chatbot" : "/signup"}>
                  Generate
                </Link>
              </div>
              <div className="mode-tabs" aria-label="Learning formats">
                <Link className="mode-tab active" to="/quick-study">
                  Course
                </Link>
                <Link className="mode-tab" to="/chatbot">
                  Guide
                </Link>
                <Link className="mode-tab" to="/quiz">
                  Quiz
                </Link>
              </div>
            </div>

            <div className="hero-actions" data-reveal>
              <Link className="btn-primary" to={isAuthenticated ? "/quiz" : "/signup"}>
                Start Learning
              </Link>
              <Link className="btn-secondary" to="/about">
                Explore Platform
              </Link>
            </div>
          </div>

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
              </div>
            </article>
            <article className="board-card">
              <div className="metric-badge">
                <PsychologyIcon />
              </div>
              <h3>Designed for information overload</h3>
              <p>
                The requirement document targets students and educators who need
                automation for meta-tasks like organization, summaries, and practice.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="page-shell">
        <div className="container">
          <div className="page-header" data-reveal>
            <p className="eyebrow">Workspace modules</p>
            <h2 className="page-title">Pick the tool that fits the study job.</h2>
            <p className="section-copy">
              The interface keeps core actions visible, uses compact cards for
              scanning, and adapts cleanly across desktop, tablet, and mobile.
            </p>
          </div>

          <div className="feature-grid">
            {modules.map((module) => (
              <Link className="feature-item" to={module.to} key={module.title} data-reveal>
                <span className="feature-icon">{module.icon}</span>
                <h2>{module.title}</h2>
                <p>{module.text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
