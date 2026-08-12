import React from "react";
import { CheckCircle, RotateCcw, TrendingUp, X, Info } from "lucide-react";
import { motion } from "framer-motion";
import Button from "../ui/Button";

export default function QuizResults({ result, onStartAgain }) {
  const passPercentage = result.result === "pass" ? 100 : (result.score_percentage / 100) * 100;
  const isPass = result.result === "pass";

  const formatDuration = (seconds) => {
    if (seconds === null || seconds === undefined) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="w-full bg-slate-900 rounded-3xl p-6 sm:p-8 md:p-10 text-white shadow-2xl my-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        
        {/* Results Summary Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`
            p-6 sm:p-8 md:p-10 rounded-[2rem] border relative overflow-hidden
            ${isPass 
              ? 'bg-gradient-to-br from-cyan-900/40 to-slate-900 border-cyan-500/20 shadow-[0_20px_40px_-10px_rgba(6,182,212,0.15)]' 
              : 'bg-gradient-to-br from-rose-900/40 to-slate-900 border-rose-500/20 shadow-[0_20px_40px_-10px_rgba(225,29,72,0.15)]'
            }
          `}
        >
          <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${isPass ? 'text-cyan-400' : 'text-rose-400'}`}>
                  Quiz Completed
                </p>
                <h3 className="text-3xl font-extrabold mb-3 text-white">{result.topic}</h3>
                <p className="text-lg text-slate-300">{result.summary}</p>

                {result.is_auto_submitted && (
                  <div className="mt-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm flex items-start gap-3">
                    <Info className="shrink-0 mt-0.5 text-amber-400" size={18} />
                    <span>Time limit reached. This quiz was submitted automatically.</span>
                  </div>
                )}
              </div>

              <div className={`
                flex items-center gap-3 px-6 py-4 rounded-2xl border-2 font-black text-xl tracking-wider
                ${isPass 
                  ? 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10' 
                  : 'text-rose-400 border-rose-400/30 bg-rose-400/10'
                }
              `}>
                {isPass ? <CheckCircle size={28} /> : <X size={28} />}
                {result.result.toUpperCase()}
              </div>
            </div>

            <hr className="border-slate-700/50" />

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {/* Score card */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 hover:-translate-y-1 transition-transform">
                <p className="text-sm font-semibold text-slate-400 mb-2">Final Score</p>
                <p className={`text-4xl font-black bg-clip-text text-transparent ${result.score_percentage >= 60 ? 'bg-gradient-to-r from-cyan-400 to-blue-400' : 'bg-gradient-to-r from-indigo-400 to-purple-400'}`}>
                  {result.score_percentage}%
                </p>
              </div>

              {/* Time taken card */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 hover:-translate-y-1 transition-transform">
                <p className="text-sm font-semibold text-slate-400 mb-2">Time Taken</p>
                <p className="text-3xl font-bold text-white mb-1">{formatDuration(result.time_taken)}</p>
                <p className="text-xs font-medium text-slate-400">Limit: {formatDuration(result.time_limit_seconds)}</p>
              </div>

              {/* Correct answers card */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 hover:-translate-y-1 transition-transform">
                <p className="text-sm font-semibold text-slate-400 mb-2">Correct Answers</p>
                <p className="text-3xl font-bold text-white">
                  <span className="text-cyan-400">{result.correct_answers}</span>
                  <span className="text-slate-500 text-2xl ml-1">/ {result.total_questions}</span>
                </p>
              </div>

              {/* Difficulty card */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 hover:-translate-y-1 transition-transform flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="text-indigo-400" size={20} />
                  <p className="text-sm font-semibold text-slate-400">Difficulty</p>
                </div>
                <p className="text-2xl font-bold text-indigo-400 capitalize">{result.difficulty}</p>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span className="text-slate-400">Passing Accuracy Target</span>
                <span className="text-white">{Math.round(passPercentage)}% Achieved</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ${result.score_percentage >= 60 ? 'bg-gradient-to-r from-cyan-400 to-blue-400' : 'bg-gradient-to-r from-indigo-400 to-purple-400'}`}
                  style={{ width: `${passPercentage}%` }}
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={onStartAgain}
                className="flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-lg shadow-[0_8px_25px_-8px_rgba(99,102,241,0.6)] hover:shadow-[0_12px_30px_-8px_rgba(99,102,241,0.8)] hover:-translate-y-1 transition-all"
              >
                <RotateCcw size={20} /> Start Another Quiz
              </button>
            </div>
          </div>
        </motion.div>

        {/* Detailed Feedback Section */}
        <div>
          <h4 className="flex items-center gap-3 text-2xl font-bold text-white mb-8">
            <Info className="text-indigo-400" size={32} /> Question Analysis
          </h4>

          <div className="flex flex-col gap-6">
            {result.feedback && result.feedback.length > 0 ? (
              result.feedback.map((item, index) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  key={item.question_id}
                  className={`
                    p-6 md:p-8 rounded-3xl border transition-all hover:bg-slate-800/30
                    ${item.is_correct 
                      ? 'bg-gradient-to-br from-cyan-900/10 to-slate-900/10 border-cyan-500/20 hover:border-cyan-500/40' 
                      : 'bg-gradient-to-br from-rose-900/10 to-slate-900/10 border-rose-500/20 hover:border-rose-500/40'
                    }
                  `}
                >
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <h6 className="text-lg text-white font-medium leading-relaxed">
                        <span className="text-slate-400 mr-2">{index + 1}.</span>
                        {item.question}
                      </h6>
                      <div className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold shrink-0
                        ${item.is_correct 
                          ? 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10' 
                          : 'text-rose-400 border-rose-400/30 bg-rose-400/10'
                        }
                      `}>
                        {item.is_correct ? <CheckCircle size={16} /> : <X size={16} />}
                        {item.is_correct ? "Correct" : "Incorrect"}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm font-semibold text-slate-400 mb-2">Your Answer</p>
                        <div className={`
                          p-4 rounded-2xl border
                          ${item.is_correct 
                            ? 'bg-cyan-900/20 border-cyan-500/30 text-cyan-300' 
                            : 'bg-rose-900/20 border-rose-500/30 text-rose-300'
                          }
                        `}>
                          <p className="font-semibold">{item.selected_option || "Not answered"}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-slate-400 mb-2">Correct Answer</p>
                        <div className="p-4 rounded-2xl border bg-cyan-900/20 border-cyan-500/30 text-cyan-300">
                          <p className="font-bold">{item.correct_answer}</p>
                        </div>
                      </div>
                    </div>

                    <div className={`
                      flex items-start gap-3 p-4 rounded-2xl border text-sm font-medium leading-relaxed
                      ${item.is_correct 
                        ? 'bg-cyan-900/10 border-cyan-500/20 text-cyan-200' 
                        : 'bg-indigo-900/10 border-indigo-500/20 text-indigo-300'
                      }
                    `}>
                      {item.is_correct ? <CheckCircle className="shrink-0 mt-0.5" size={18} /> : <Info className="shrink-0 mt-0.5" size={18} />}
                      <p>{item.feedback}</p>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="p-4 rounded-2xl border bg-indigo-900/20 border-indigo-500/30 text-indigo-300 flex items-center gap-3">
                <Info size={20} />
                <p>No detailed feedback is available for this quiz.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}