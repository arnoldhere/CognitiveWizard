import { Link } from "react-router-dom";
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PsychologyIcon from '@mui/icons-material/Psychology';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SecurityIcon from '@mui/icons-material/Security';
import DevicesIcon from '@mui/icons-material/Devices';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import '../styles/About.css';

export default function About() {
    return (
        <section className="page-section container about-page">
            <div className="about-card card card-surface">
                {/* Animated Wizard */}
                <div className="wizard-animation">
                    <div className="wizard-hat">🧙‍♂️</div>
                    <div className="sparkles">
                        <span>✨</span>
                        <span>✨</span>
                        <span>✨</span>
                    </div>
                </div>

                <p className="eyebrow">About CognitiveWizard</p>
                <h1>Transform Your Learning Journey with AI Magic</h1>
                <p className="section-copy">
                    CognitiveWizard is your intelligent study companion that harnesses the power
                    of artificial intelligence to revolutionize how you prepare for exams and master
                    new concepts. Whether you're a student tackling challenging subjects or a
                    professional expanding your knowledge, our platform adapts to your unique
                    learning style and pace.
                </p>

                <div className="feature-grid">
                    <article className="feature-item">
                        <div className="feature-icon">
                            <AutoAwesomeIcon />
                        </div>
                        <h2>AI-Powered Quiz Generation</h2>
                        <p>
                            Create personalized quizzes on any topic instantly. Choose your difficulty
                            level, question count, and format while our AI crafts questions tailored
                            to your learning objectives.
                        </p>
                    </article>

                    <article className="feature-item">
                        <div className="feature-icon">
                            <PsychologyIcon />
                        </div>
                        <h2>Adaptive Learning Paths</h2>
                        <p>
                            Our intelligent system analyzes your performance and identifies knowledge
                            gaps, automatically adjusting difficulty and suggesting targeted practice
                            areas for maximum improvement.
                        </p>
                    </article>

                    <article className="feature-item">
                        <div className="feature-icon">
                            <TrendingUpIcon />
                        </div>
                        <h2>Progress Analytics</h2>
                        <p>
                            Track your journey with comprehensive insights. Visualize your strengths,
                            monitor improvement over time, and celebrate milestones as you master
                            new topics.
                        </p>
                    </article>

                    <article className="feature-item">
                        <div className="feature-icon">
                            <LightbulbIcon />
                        </div>
                        <h2>Concept Explanations</h2>
                        <p>
                            Get instant, clear explanations for complex topics. Our AI breaks down
                            difficult concepts into digestible insights, helping you truly understand
                            rather than just memorize.
                        </p>
                    </article>

                    <article className="feature-item">
                        <div className="feature-icon">
                            <SecurityIcon />
                        </div>
                        <h2>Secure & Private</h2>
                        <p>
                            Your data is protected with JWT authentication and encrypted storage.
                            Study with confidence knowing your progress and personal information
                            remain secure.
                        </p>
                    </article>

                    <article className="feature-item">
                        <div className="feature-icon">
                            <DevicesIcon />
                        </div>
                        <h2>Study Anywhere</h2>
                        <p>
                            Seamlessly switch between desktop, tablet, and mobile. Our responsive
                            design ensures a smooth experience whether you're at your desk or
                            on the go.
                        </p>
                    </article>
                </div>

                <div className="cta-section">
                    <h3>Ready to unlock your full potential?</h3>
                    <p>Join thousands of learners who are achieving their goals with CognitiveWizard.</p>
                    <Link to="/" className="btn-primary">
                        Start Your Journey
                    </Link>
                </div>
            </div>
        </section>
    );
}