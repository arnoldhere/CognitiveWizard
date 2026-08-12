import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";

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
    <footer className="bg-slate-50 dark:bg-[#384959] border-t border-slate-200 dark:border-slate-800 py-12 md:py-16">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-6 lg:gap-12">

          <div className="md:col-span-5 lg:col-span-4">
            <Link to="/" className="flex items-center gap-2 mb-4 group w-fit">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6A89A7] to-[#88BDF2] flex items-center justify-center text-white shadow-md">
                <BookOpen size={16} strokeWidth={2.5} />
              </div>
              <span className="text-xl font-black tracking-tight text-[#384959] dark:text-white">
                Cognitive<span className="text-[#6A89A7]">Wizard</span>
              </span>
            </Link>
            <p className="text-slate-500 dark:text-slate-300 text-sm leading-relaxed mb-6 max-w-sm">
              AI-powered adaptive learning — personalized courses, smart quizzes,
              spaced repetition, and summarization in one secure workspace.
            </p>
            <div className="flex items-center gap-4">
              {/* <a href="#" className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-[#88BDF2] hover:shadow-md transition-all">
                <Twitter size={18} />
              </a> */}
              {/* <a href="#" className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-[#88BDF2] hover:shadow-md transition-all">
                <Linkedin size={18} />
              </a> */}
            </div>
          </div>

          <div className="md:col-span-7 lg:col-span-8 flex flex-col sm:flex-row gap-10 justify-between md:justify-end">
            <div>
              <h4 className="font-bold text-[#384959] dark:text-white mb-6 uppercase tracking-wider text-sm">Navigation</h4>
              <nav className="flex flex-col gap-3">
                {footerLinks.slice(0, 4).map(link => (
                  <Link key={link.to} to={link.to} className="text-slate-500 dark:text-slate-400 hover:text-[#6A89A7] dark:hover:text-white text-sm font-medium transition-colors">
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div>
              <h4 className="font-bold text-[#384959] dark:text-white mb-6 uppercase tracking-wider text-sm">Company</h4>
              <nav className="flex flex-col gap-3">
                {footerLinks.slice(4).map(link => (
                  <Link key={link.to} to={link.to} className="text-slate-500 dark:text-slate-400 hover:text-[#6A89A7] dark:hover:text-white text-sm font-medium transition-colors">
                    {link.label}
                  </Link>
                ))}
                <Link to="/privacy" className="text-slate-500 dark:text-slate-400 hover:text-[#6A89A7] dark:hover:text-white text-sm font-medium transition-colors">
                  Privacy Policy
                </Link>
                <Link to="/terms" className="text-slate-500 dark:text-slate-400 hover:text-[#6A89A7] dark:hover:text-white text-sm font-medium transition-colors">
                  Terms of Service
                </Link>
              </nav>
            </div>
          </div>

        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">
            &copy; {year} CognitiveWizard. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
