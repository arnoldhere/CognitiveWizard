import React, { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, RefreshCw, Loader2 } from "lucide-react";
import MarkdownRenderer from "../utils/MarkdownRenderer";
import { exportWizardPdf } from "../../services/api";
import { uploadDocument, createChatSession, askRagQuestion } from "../../services/rag";
import { motion, AnimatePresence } from "framer-motion";

const SESSION_STORAGE_KEY = (id) => `wiz_rag_session_${id}`;

const INIT_STEPS = [
  "Preparing roadmap document…",
  "Building knowledge base…",
  "Creating your tutor session…",
  "Almost ready…",
];

export default function FloatingAIAssistant({ topic, roadmapId, pdfPayload }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMsg, setInputMsg] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  // RAG init state
  const [ragSessionId, setRagSessionId] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initStepIndex, setInitStepIndex] = useState(0);
  const [initError, setInitError] = useState(null);
  const [isRagReady, setIsRagReady] = useState(false);

  const chatBodyRef = useRef(null);
  const inputRef = useRef(null);
  const stepTimerRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [chatHistory, isTyping]);

  // Focus input when ready
  useEffect(() => {
    if (isRagReady && isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isRagReady, isOpen]);

  // When drawer opens, initialize RAG if not already done
  useEffect(() => {
    if (isOpen && !isRagReady && !isInitializing) {
      initializeRagSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const initializeRagSession = async () => {
    setIsInitializing(true);
    setInitError(null);
    setInitStepIndex(0);

    // Animate through init steps
    let stepIdx = 0;
    stepTimerRef.current = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, INIT_STEPS.length - 1);
      setInitStepIndex(stepIdx);
    }, 1200);

    try {
      if (roadmapId) {
        const cachedId = localStorage.getItem(SESSION_STORAGE_KEY(roadmapId));
        if (cachedId) {
          clearInterval(stepTimerRef.current);
          setRagSessionId(cachedId);
          setIsRagReady(true);
          setChatHistory([
            {
              sender: "ai",
              text: `Hi! I'm your AI Learning Tutor for **${topic || "this roadmap"}**. I have your roadmap loaded as my knowledge base — ask me anything about the curriculum, phases, topics, or resources!`,
            },
          ]);
          setIsInitializing(false);
          return;
        }
      }

      let pdfBlob = null;
      if (pdfPayload) {
        try {
          pdfBlob = await exportWizardPdf(pdfPayload);
        } catch (pdfErr) {
          console.warn("[AI Tutor] PDF generation failed, skipping upload:", pdfErr.message);
        }
      }

      if (pdfBlob) {
        const filename = `${(topic || "roadmap").replace(/\s+/g, "_")}_roadmap.pdf`;
        const file = new File([pdfBlob], filename, { type: "application/pdf" });
        await uploadDocument(file);
      }

      const sessionTitle = `🗺️ ${topic || "Roadmap"}`;
      const sessionResult = await createChatSession({ title: sessionTitle });
      
      const sessionId =
        sessionResult?.session_id ||
        sessionResult?.data?.session_id ||
        null;

      if (roadmapId && sessionId) {
        localStorage.setItem(SESSION_STORAGE_KEY(roadmapId), sessionId);
      }

      clearInterval(stepTimerRef.current);
      setRagSessionId(sessionId);
      setIsRagReady(true);
      setChatHistory([
        {
          sender: "ai",
          text: `Hi! I'm your AI Learning Tutor for **${topic || "this roadmap"}**. I've loaded your roadmap as my knowledge base. Ask me anything about the curriculum, phases, topics, or resources!`,
        },
      ]);
    } catch (err) {
      clearInterval(stepTimerRef.current);
      console.error("[AI Tutor] Initialization failed:", err);
      setInitError(err.message || "Failed to set up AI Tutor. Please try again.");
    } finally {
      setIsInitializing(false);
    }
  };

  const resetAndRetry = () => {
    if (roadmapId) {
      localStorage.removeItem(SESSION_STORAGE_KEY(roadmapId));
    }
    setRagSessionId(null);
    setIsRagReady(false);
    setInitError(null);
    setChatHistory([]);
    initializeRagSession();
  };

  const handleSend = async (overrideText) => {
    const query = overrideText || inputMsg;
    if (!query.trim() || !isRagReady || isTyping) return;

    setChatHistory((prev) => [...prev, { sender: "user", text: query }]);
    setInputMsg("");
    setIsTyping(true);

    try {
      const result = await askRagQuestion({
        query,
        use_rag: true,
        session_id: ragSessionId,
        use_langchain: true,
      });
      const answer = result?.answer || "I couldn't find a relevant answer. Try rephrasing your question.";
      setChatHistory((prev) => [...prev, { sender: "ai", text: answer }]);
    } catch (err) {
      console.error("[AI Tutor] Chat error:", err);
      setChatHistory((prev) => [
        ...prev,
        { sender: "ai", text: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {!isOpen && (
          <motion.button 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="flex items-center gap-2 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-white px-5 py-3.5 rounded-full font-bold shadow-xl shadow-primary/30 transition-transform hover:scale-105" 
            onClick={() => setIsOpen(true)} 
            aria-label="Open AI Tutor"
          >
            <Sparkles size={20} />
            <span>Ask AI Tutor</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute bottom-0 right-0 w-[380px] max-w-[calc(100vw-32px)] h-[600px] max-h-[calc(100vh-100px)] bg-white rounded-3xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden" 
            role="dialog" 
            aria-label="AI Tutor chat"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-indigo-600/10 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <Sparkles size={20} className="text-primary" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 leading-tight">AI Learning Tutor</h4>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary truncate max-w-[150px] inline-block">
                    RAG-powered · {topic || "Roadmap"}
                  </span>
                </div>
              </div>
              <button
                className="w-8 h-8 rounded-full bg-white/50 hover:bg-white flex items-center justify-center text-slate-500 transition-colors shadow-sm"
                onClick={() => setIsOpen(false)}
                aria-label="Close AI Tutor"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 flex flex-col gap-4 relative" ref={chatBodyRef}>
                {isInitializing && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center">
                    <Loader2 size={36} className="text-primary animate-spin mb-4" />
                    <p className="text-slate-900 font-bold mb-1">{INIT_STEPS[initStepIndex]}</p>
                    <p className="text-sm text-slate-500">Setting up your personal AI tutor…</p>
                  </div>
                )}

                {initError && !isInitializing && (
                  <div className="absolute inset-0 bg-white z-10 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-4">
                      <X size={24} />
                    </div>
                    <p className="text-slate-700 font-medium mb-6">{initError}</p>
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors" onClick={resetAndRetry}>
                      <RefreshCw size={16} /> Retry
                    </button>
                  </div>
                )}

                {isRagReady && !isInitializing && (
                  <>
                    {chatHistory.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex w-full ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                      >
                        {msg.sender === "ai" ? (
                          <div className="bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-tl-sm p-4 max-w-[85%] shadow-sm prose prose-sm prose-slate">
                            <MarkdownRenderer content={msg.text} />
                          </div>
                        ) : (
                          <div className="bg-primary text-slate-900 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] shadow-md">
                            {msg.text}
                          </div>
                        )}
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm p-4 shadow-sm flex gap-1.5 items-center">
                          <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-2 h-2 bg-slate-300 rounded-full" />
                          <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 bg-slate-300 rounded-full" />
                          <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 bg-slate-300 rounded-full" />
                        </div>
                      </div>
                    )}
                  </>
                )}
            </div>

            {/* Input Footer */}
            <div className="p-4 bg-white border-t border-slate-100 shrink-0">
              <div className="relative flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ask anything about this roadmap…"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isTyping || !isRagReady || isInitializing}
                  className="w-full bg-slate-50 border border-slate-200 rounded-full pl-4 pr-12 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-sm disabled:opacity-50 transition-all"
                  aria-label="Chat input"
                />
                <button
                  className="absolute right-1.5 w-9 h-9 flex items-center justify-center bg-primary text-slate-900 rounded-full disabled:opacity-50 disabled:bg-slate-300 transition-colors"
                  onClick={() => handleSend()}
                  disabled={isTyping || !inputMsg.trim() || !isRagReady || isInitializing}
                  aria-label="Send message"
                >
                  <Send size={14} className="-ml-0.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
