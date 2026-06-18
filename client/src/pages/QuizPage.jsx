import { useRef } from "react";
import { useQuiz } from "../hooks/useQuiz";
import { useAuth } from "../hooks/useAuth";
import { useGsapReveal } from "../hooks/useGsapReveal";
import QuizForm from "../components/quiz/QuizForm";
import QuizCard from "../components/quiz/QuizCard";
import QuizResults from "../components/quiz/QuizResults";
import ErrorMessage from "../components/utils/ErrorMessage";
import Loader from "../components/utils/Loader";
import PsychologyIcon from "@mui/icons-material/Psychology";
import SpeedIcon from "@mui/icons-material/Speed";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";

const benefits = [
    ["AI questions", "Generate practice from any subject or topic.", <PsychologyIcon />],
    ["Fast setup", "Choose count, difficulty, and format quickly.", <SpeedIcon />],
    ["Track outcomes", "Review scores and history from your profile.", <EmojiEventsIcon />],
];

export default function QuizPage() {
    const { user } = useAuth();
    const rootRef = useRef(null);
    useGsapReveal(rootRef);
    const {
        generating,
        submitting,
        quizSession,
        result,
        error,
        createQuiz,
        submitQuiz,
        resetQuiz,
    } = useQuiz();

    if (quizSession) {
        return (
            <QuizCard
                quiz={quizSession}
                onSubmit={submitQuiz}
                submitting={submitting}
            />
        );
    }

    return (
        <section ref={rootRef} className="page-shell">
            <div className="container hero-content">
                <div className="hero-copy">
                    <p className="eyebrow" data-reveal>AI Quiz Builder</p>
                    <h1 className="page-title" data-reveal>Generate smart practice tests in seconds.</h1>
                    <p className="section-copy" data-reveal>
                        Create focused quizzes, tune difficulty, and use results to
                        identify weak areas before your next study session.
                    </p>
                    <div className="feature-grid" data-reveal>
                        {benefits.map(([title, text, icon]) => (
                            <article className="feature-item" key={title}>
                                <span className="feature-icon">{icon}</span>
                                <h2>{title}</h2>
                                <p>{text}</p>
                            </article>
                        ))}
                    </div>
                </div>

                <div className="auth-panel" data-reveal>
                    <p className="small-label">Signed in as</p>
                    <h2>{user?.full_name || user?.email}</h2>
                    {generating && (
                        <Loader
                            title="Generating your quiz"
                            subtitle="We are assembling a secure question set and preparing your exam session."
                        />
                    )}
                    {!generating && !result && (
                        <>
                            <p className="section-copy">
                                Add your subject, topic, difficulty, and question count.
                            </p>
                            <QuizForm onSubmit={createQuiz} disabled={generating} />
                        </>
                    )}
                    {error && <ErrorMessage message={error} />}
                </div>
            </div>

            {result && (
                <div className="container" data-reveal>
                    <QuizResults result={result} onStartAgain={resetQuiz} />
                </div>
            )}
        </section>
    );
}
