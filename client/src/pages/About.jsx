import { useRef } from "react";
import { Link } from "react-router-dom";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import PsychologyIcon from "@mui/icons-material/Psychology";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import SecurityIcon from "@mui/icons-material/Security";
import DevicesIcon from "@mui/icons-material/Devices";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import { useGsapReveal } from "../hooks/useGsapReveal";

const features = [
    ["AI-powered quiz generation", "Create controlled practice tests with difficulty, count, scoring, and feedback.", <AutoAwesomeIcon />],
    ["Adaptive learning support", "Use performance and weak-area signals to guide the next learning action.", <PsychologyIcon />],
    ["Progress analytics", "Review history and outcomes so revision work stays targeted.", <TrendingUpIcon />],
    ["Concept explanations", "Break down complex material into summaries and digestible study points.", <LightbulbIcon />],
    ["Secure and private", "JWT authentication, private user workspaces, and face login support.", <SecurityIcon />],
    ["Study anywhere", "Responsive layouts for laptops, tablets, and phones.", <DevicesIcon />],
];

export default function About() {
    const rootRef = useRef(null);
    useGsapReveal(rootRef);

    return (
        <section ref={rootRef} className="page-shell">
            <div className="container">
                <div className="page-header" data-reveal>
                    <p className="eyebrow">About CognitiveWizard</p>
                    <h1 className="page-title">A calmer AI workspace for serious preparation.</h1>
                    <p className="section-copy">
                        CognitiveWizard is an intelligent study companion for students,
                        educators, and independent learners. It reduces cognitive load by
                        combining document understanding, quiz practice, summaries, and
                        learning history in one secure platform.
                    </p>
                    <div className="hero-actions">
                        <Link to="/quiz" className="btn-primary">Try Quiz Builder</Link>
                        <Link to="/chatbot" className="btn-secondary">Open AI Tutor</Link>
                    </div>
                </div>

                <div className="feature-grid">
                    {features.map(([title, text, icon]) => (
                        <article className="feature-item" key={title} data-reveal>
                            <span className="feature-icon">{icon}</span>
                            <h2>{title}</h2>
                            <p>{text}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
