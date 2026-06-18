import { Link } from "react-router-dom";

export default function Footer() {
    return (
        <footer className="footer">
            <div className="container footer-inner">
                <div>
                    <p className="footer-title">CognitiveWizard</p>
                    <p className="footer-copy">A smart study planner, RAG tutor, quiz engine, and summarization workspace for focused preparation.</p>
                </div>
                <div className="footer-links">
                    <Link to="/">Home</Link>
                    <Link to="/quiz">Quiz</Link>
                    <Link to="/quick-study">Quick Study</Link>
                    <Link to="/chatbot">AI Chat</Link>
                    <Link to="/about">About</Link>
                    <Link to="/contact">Contact</Link>
                </div>
            </div>
        </footer>
    );
}
