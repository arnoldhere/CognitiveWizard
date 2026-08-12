import { useQuiz } from "../hooks/useQuiz";
import { useAuth } from "../hooks/useAuth";
import QuizForm from "../components/quiz/QuizForm";
import QuizCard from "../components/quiz/QuizCard";
import QuizResults from "../components/quiz/QuizResults";
import ErrorMessage from "../components/utils/ErrorMessage";
import Loader from "../components/utils/Loader";
import { Brain, Gauge, Trophy } from "lucide-react";
import { motion } from "framer-motion";

const benefits = [
    ["AI questions", "Generate practice from any subject or topic.", <Brain size={24} />],
    ["Fast setup", "Choose count, difficulty, and format quickly.", <Gauge size={24} />],
    ["Track outcomes", "Review scores and history from your profile.", <Trophy size={24} />],
];

export default function QuizPage() {
    const { user } = useAuth();
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
        <section className="min-h-screen bg-light py-20 px-4 sm:px-6 lg:px-8 flex items-center">
            <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                <motion.div 
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col gap-8"
                >
                    <div>
                        <p className="text-primary font-bold uppercase tracking-wider text-sm mb-4">AI Quiz Builder</p>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-dark mb-6 leading-tight">
                            Generate smart practice tests in seconds.
                        </h1>
                        <p className="text-lg text-slate-600 leading-relaxed">
                            Create focused quizzes, tune difficulty, and use results to
                            identify weak areas before your next study session.
                        </p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-6 mt-4">
                        {benefits.map(([title, text, icon], idx) => (
                            <motion.article 
                                key={title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
                            >
                                <div className="text-primary bg-accent/30 w-12 h-12 flex items-center justify-center rounded-xl mb-4">
                                    {icon}
                                </div>
                                <h2 className="font-bold text-dark mb-2">{title}</h2>
                                <p className="text-sm text-slate-500 leading-relaxed">{text}</p>
                            </motion.article>
                        ))}
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="bg-white p-8 md:p-10 rounded-3xl shadow-lg border border-slate-100">
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Signed in as</p>
                        <h2 className="text-2xl font-bold text-dark mb-8">{user?.full_name || user?.email}</h2>
                        
                        {generating && (
                            <div className="py-12">
                                <Loader
                                    title="Generating your quiz"
                                    subtitle="We are assembling a secure question set and preparing your exam session."
                                />
                            </div>
                        )}
                        {!generating && !result && (
                            <>
                                <p className="text-slate-600 mb-6">
                                    Add your subject, topic, difficulty, and question count.
                                </p>
                                <QuizForm onSubmit={createQuiz} disabled={generating} />
                            </>
                        )}
                        {error && <div className="mt-4"><ErrorMessage message={error} /></div>}
                    </div>
                </motion.div>
            </div>

            {result && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="fixed inset-0 z-50 bg-light flex flex-col items-center justify-center p-4 sm:p-8"
                >
                    <div className="w-full max-w-4xl max-h-full overflow-y-auto">
                        <QuizResults result={result} onStartAgain={resetQuiz} />
                    </div>
                </motion.div>
            )}
        </section>
    );
}
