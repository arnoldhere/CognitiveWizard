import { Link } from "react-router-dom";

const footerLinks = [
  { label: "Home", to: "/" },
  { label: "AI Wizard", to: "/wizard" },
  { label: "Quiz", to: "/quiz" },
  { label: "Quick Study", to: "/quick-study" },
  { label: "AI Chat", to: "/chatbot" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer" role="contentinfo">
      <div className="container footer-inner">
        <div>
          <p className="footer-title">CognitiveWizard</p>
          <p className="footer-copy">
            AI-powered adaptive learning — personalized courses, smart quizzes,
            spaced repetition, and summarization in one secure workspace.
          </p>
          <p className="footer-copy" style={{ marginTop: "10px" }}>
            &copy; {year} CognitiveWizard. All rights reserved.
          </p>
        </div>
        <nav className="footer-links" aria-label="Footer navigation">
          {footerLinks.map(link => (
            <Link key={link.to} to={link.to}>{link.label}</Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
