import { Link } from "react-router-dom";
import { Sparkles, Brain, TrendingUp, Shield, MonitorSmartphone, Lightbulb, Timer, FileQuestion, Check } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  ["AI-powered quiz generation", "Create controlled practice tests with difficulty, count, scoring, and detailed feedback.", <Sparkles size={24} />],
  ["Adaptive learning support", "Performance and weak-area signals guide every next learning action.", <Brain size={24} />],
  ["Progress analytics", "Review history and outcomes so revision work stays targeted and measurable.", <TrendingUp size={24} />],
  ["Concept summarization", "Break down complex material into concise study points and quick-reference summaries.", <Lightbulb size={24} />],
  ["Pomodoro focus timer", "Built-in 35-min focus + 5-min break rhythm integrated directly into the AI Wizard.", <Timer size={24} />],
  ["Quiz builder", "AI-generated quizzes from any subject with difficulty tuning and score tracking.", <FileQuestion size={24} />],
  ["Secure and private", "JWT authentication, private user workspaces, and optional face login support.", <Shield size={24} />],
  ["Study anywhere", "Fully responsive layouts for laptops, tablets, and phones.", <MonitorSmartphone size={24} />],
];

const timeline = [
  { phase: "Phase 1", label: "RAG Tutor + Quiz Engine", done: true },
  { phase: "Phase 2", label: "Summarization + Quick Study", done: true },
  { phase: "Phase 3", label: "AI Wizard — Curriculum Generator", done: true },
  { phase: "Phase 4", label: "Analytics Dashboard + Streak Tracker", done: false },
  { phase: "Phase 5", label: "Collaborative Study Rooms", done: false },
];

export default function About() {
  return (
    <section className="min-h-screen bg-light py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mb-20"
        >
          <p className="text-primary font-bold uppercase tracking-wider text-sm mb-4">About CognitiveWizard</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-dark mb-6 leading-tight">
            A calmer AI workspace for serious preparation.
          </h1>
          <p className="text-lg text-slate-600 mb-8 leading-relaxed">
            CognitiveWizard is an intelligent study companion for students,
            educators, and independent learners. It reduces cognitive load by
            combining document understanding, quiz practice, AI curriculum planning,
            summaries, and learning history in one secure platform.
          </p>
          <div className="flex flex-wrap gap-4 mt-8">
            <Link to="/wizard" className="bg-primary hover:bg-opacity-90 text-white px-6 py-3 rounded-xl font-semibold transition-colors">
              Try AI Wizard
            </Link>
            <Link to="/chatbot" className="bg-white border-2 border-slate-200 hover:border-slate-300 text-dark px-6 py-3 rounded-xl font-semibold transition-colors">
              Open AI Tutor
            </Link>
          </div>
        </motion.div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
          {features.map(([title, text, icon], idx) => (
            <motion.article 
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-accent/30 rounded-2xl flex items-center justify-center text-primary mb-5">
                {icon}
              </div>
              <h2 className="text-lg font-bold text-dark mb-2">{title}</h2>
              <p className="text-sm text-slate-500 leading-relaxed">{text}</p>
            </motion.article>
          ))}
        </div>

        {/* Roadmap timeline */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl"
        >
          <p className="text-primary font-bold uppercase tracking-wider text-sm mb-4">Product roadmap</p>
          <h2 className="text-3xl font-extrabold text-dark mb-10">Where we are &amp; where we're going.</h2>
          
          <div className="space-y-4">
            {timeline.map((item, i) => (
              <div 
                key={item.phase} 
                className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 sm:gap-6"
              >
                <div className={`
                  flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                  ${item.done 
                    ? 'bg-primary text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-400 border-2 border-slate-200'}
                `}>
                  {item.done ? <Check size={18} /> : i + 1}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{item.phase}</div>
                  <div className={`font-bold ${item.done ? 'text-dark' : 'text-slate-500'}`}>{item.label}</div>
                </div>
                {item.done && (
                  <span className="hidden sm:inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                    Live
                  </span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
