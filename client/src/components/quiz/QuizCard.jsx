import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle, Maximize } from "lucide-react";
import Button from "../ui/Button";

function preventClipboardAction(event) {
  event.preventDefault();
}

export default function QuizCard({ quiz, onSubmit, submitting }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenNotice, setFullscreenNotice] = useState("");
  const [timeLeft, setTimeLeft] = useState(quiz?.time_limit_seconds || 0);
  const examRef = useRef(null);
  const autoSubmitTriggered = useRef(false);

  const currentQuestion = quiz?.questions?.[currentIndex];
  const totalQuestions = quiz?.questions?.length || 0;
  const answeredCount = useMemo(
    () => Object.values(answers).filter(Boolean).length,
    [answers]
  );
  const progress = totalQuestions ? ((currentIndex + 1) / totalQuestions) * 100 : 0;
  const isLastTwoMinutes = timeLeft > 0 && timeLeft <= 120;

  const formatSeconds = (seconds) => {
    const safeSeconds = Math.max(0, seconds);
    const mins = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const buildFormattedAnswers = useCallback(
    () =>
      quiz.questions.map((question) => ({
        question_id: question.question_id,
        selected_option: answers[question.question_id] || "",
      })),
    [answers, quiz.questions]
  );

  const enterFullscreen = async () => {
    const node = examRef.current;
    if (!node?.requestFullscreen || document.fullscreenElement === node) {
      return;
    }

    try {
      await node.requestFullscreen();
      setFullscreenNotice("");
    } catch {
      setFullscreenNotice("Fullscreen was blocked by the browser. Tap below to continue in fullscreen mode.");
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    const handleShortcutBlock = (event) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && ["c", "v", "x"].includes(key)) {
        event.preventDefault();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleShortcutBlock);
    
    // Using a tiny timeout often helps with browser user-gesture requirements for fullscreen, but it may still block
    const fullscreenTimer = window.setTimeout(() => {
      // enterFullscreen();
    }, 100);

    return () => {
      window.clearTimeout(fullscreenTimer);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleShortcutBlock);

      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => { });
      }
    };
  }, []);

  useEffect(() => {
    if (!quiz?.time_limit_seconds || submitting || autoSubmitTriggered.current) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [quiz?.time_limit_seconds, submitting]);

  useEffect(() => {
    if (timeLeft !== 0 || autoSubmitTriggered.current || submitting) {
      return;
    }
    autoSubmitTriggered.current = true;
    const formattedAnswers = buildFormattedAnswers();
    void onSubmit({ answers: formattedAnswers, isAutoSubmitted: true }).catch((err) => {
      console.error("Auto submission failed:", err);
      autoSubmitTriggered.current = false;
    });
  }, [timeLeft, submitting, onSubmit, buildFormattedAnswers]);

  const handleSelect = (questionId, selectedOption) => {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: selectedOption,
    }));
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((value) => value + 1);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex((value) => value - 1);
    }
  };

  const handleSubmit = async () => {
    const formattedAnswers = buildFormattedAnswers();
    try {
      await onSubmit({ answers: formattedAnswers, isAutoSubmitted: false });
    } catch (err) {
      console.error("Quiz submission failed:", err);
    }
  };

  if (!currentQuestion) {
    return null;
  }

  return (
    <div
      ref={examRef}
      onCopy={preventClipboardAction}
      onCut={preventClipboardAction}
      onPaste={preventClipboardAction}
      onContextMenu={preventClipboardAction}
      className="min-h-screen w-full bg-slate-950 p-4 sm:p-6 lg:p-8 flex items-center justify-center select-none"
      style={{
        background: "radial-gradient(circle at top, rgba(14,165,233,0.18), transparent 36%), linear-gradient(180deg, #0f172a 0%, #020617 100%)"
      }}
    >
      <div className="max-w-4xl w-full mx-auto">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-[2rem] p-6 sm:p-8 md:p-10 text-white shadow-2xl">
          
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-8">
            <div>
              <p className="text-cyan-400 text-xs font-bold uppercase tracking-[0.2em] mb-2">Secure Quiz Mode</p>
              <h1 className="text-2xl md:text-3xl font-extrabold mb-3">{quiz.topic}</h1>
              <div className="flex flex-wrap gap-2 text-sm font-semibold">
                <span className="bg-sky-400/10 text-sky-200 px-3 py-1 rounded-full border border-sky-400/20">{quiz.difficulty}</span>
                <span className="bg-indigo-400/10 text-indigo-200 px-3 py-1 rounded-full border border-indigo-400/20">{answeredCount}/{totalQuestions} answered</span>
                <span className={`px-3 py-1 rounded-full border ${isLastTwoMinutes ? 'bg-red-500/20 text-red-200 border-red-500/30' : 'bg-cyan-400/10 text-cyan-100 border-cyan-400/30'}`}>
                  Timer: {formatSeconds(timeLeft)}
                </span>
                <span className="bg-green-400/10 text-green-200 px-3 py-1 rounded-full border border-green-400/20">
                  {isFullscreen ? "Fullscreen active" : "Fullscreen recommended"}
                </span>
              </div>
            </div>

            {!isFullscreen && (
              <button
                onClick={enterFullscreen}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-600 hover:bg-slate-800 transition-colors text-sm font-semibold shrink-0"
              >
                <Maximize size={16} /> Enter Fullscreen
              </button>
            )}
          </div>

          {fullscreenNotice && (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm flex items-center gap-3">
              {fullscreenNotice}
            </div>
          )}

          {isLastTwoMinutes && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm font-medium">
              Quick reminder: only {formatSeconds(timeLeft)} left. Please complete and submit.
            </div>
          )}

          {timeLeft === 0 && (
            <div className="mb-6 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-200 text-sm font-medium">
              Time is up. Your quiz is being submitted automatically.
            </div>
          )}

          <div className="mb-8">
            <div className="flex justify-between text-sm text-slate-300 font-medium mb-3">
              <span>Question {currentIndex + 1} of {totalQuestions}</span>
              <span>Progress {Math.round(progress)}%</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-300 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 md:p-10 text-slate-900 shadow-xl mb-8">
            <h2 className="text-xl md:text-2xl font-bold leading-relaxed mb-8">
              {currentQuestion.question}
            </h2>

            <div className="flex flex-col gap-3">
              {currentQuestion.options.map((option, index) => {
                const isSelected = answers[currentQuestion.question_id] === option;
                const optionLabel = String.fromCharCode(65 + index); // A, B, C, D

                return (
                  <label 
                    key={option}
                    className={`
                      flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200
                      ${isSelected 
                        ? 'border-indigo-500 bg-indigo-50 hover:bg-indigo-100' 
                        : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'
                      }
                    `}
                  >
                    <div className="pt-0.5">
                      <input 
                        type="radio" 
                        name={`question-${currentQuestion.question_id}`}
                        value={option}
                        checked={isSelected}
                        onChange={() => handleSelect(currentQuestion.question_id, option)}
                        className="sr-only"
                      />
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors
                        ${isSelected ? 'bg-indigo-500 text-white' : 'bg-indigo-100 text-indigo-600'}
                      `}>
                        {optionLabel}
                      </div>
                    </div>
                    <div className={`text-base leading-relaxed ${isSelected ? 'font-semibold text-indigo-950' : 'font-medium text-slate-700'}`}>
                      {option}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-between gap-4">
            <button
              onClick={handleBack}
              disabled={currentIndex === 0 || submitting}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-slate-600 hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-transparent transition-colors font-semibold text-sm"
            >
              <ArrowLeft size={18} /> Previous
            </button>

            {currentIndex < totalQuestions - 1 ? (
              <button
                onClick={handleNext}
                disabled={!answers[currentQuestion.question_id] || submitting}
                className="flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 transition-colors font-bold text-sm shadow-lg shadow-indigo-500/25"
              >
                Next Question <ArrowRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={answeredCount !== totalQuestions || submitting}
                className="flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 disabled:opacity-50 transition-colors font-bold text-sm text-slate-900 shadow-lg shadow-cyan-500/25"
              >
                {submitting ? "Submitting..." : "Submit Quiz"} <CheckCircle size={18} />
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
