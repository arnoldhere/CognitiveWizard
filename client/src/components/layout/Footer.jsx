import { Link } from "react-router-dom";

export default function Footer() {
    return (
        <footer className="footer">
            <div className="container footer-inner">
                <div>
                    <p className="footer-title">CognitiveWizardAI</p>
                    <p className="footer-copy">Your Smart Preparation Guide, powered by AI.</p>
                </div>
                <div className="footer-links">
                    <Link to="/">Home</Link>
                    <Link to="/about">About</Link>
                    <Link to="/contact">Contact</Link>
                </div>
            </div>
        </footer>
    );
}
