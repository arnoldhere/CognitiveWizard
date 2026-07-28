import React, { useState, useRef, useEffect } from "react";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import RefreshIcon from "@mui/icons-material/Refresh";
import CircularProgress from "@mui/material/CircularProgress";
import MarkdownRenderer from "../utils/MarkdownRenderer";
import { exportWizardPdf } from "../../services/api";
import { uploadDocument, createChatSession, askRagQuestion } from "../../services/rag";

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
      // 1. Check localStorage for an existing session bound to this roadmap
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

      // 2. Generate the roadmap PDF
      let pdfBlob = null;
      if (pdfPayload) {
        try {
          pdfBlob = await exportWizardPdf(pdfPayload);
        } catch (pdfErr) {
          console.warn("[AI Tutor] PDF generation failed, skipping upload:", pdfErr.message);
        }
      }

      // 3. Upload PDF to RAG knowledge base
      if (pdfBlob) {
        const filename = `${(topic || "roadmap").replace(/\s+/g, "_")}_roadmap.pdf`;
        const file = new File([pdfBlob], filename, { type: "application/pdf" });
        await uploadDocument(file);
      }

      // 4. Create a named chat session
      const sessionTitle = `🗺️ ${topic || "Roadmap"}`;
      const sessionResult = await createChatSession({ title: sessionTitle });
      // createChatSession returns payload?.data ?? payload from rag.js
      const sessionId =
        sessionResult?.session_id ||
        sessionResult?.data?.session_id ||
        null;

      // 5. Persist to localStorage
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
    // Clear cached session so we create a fresh one
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

  // Format message text — replaced by MarkdownRenderer
  // (kept as no-op for any remaining callsites)
  const formatText = (text) => text;

  return (
    <div className="floating-ai-root">
      {/* FAB trigger button */}
      {!isOpen && (
        <button className="floating-ai-fab" onClick={() => setIsOpen(true)} aria-label="Open AI Tutor">
          <AutoAwesomeIcon />
          <span>Ask AI Tutor</span>
        </button>
      )}

      {/* Drawer panel */}
      {isOpen && (
        <div className="floating-ai-drawer" role="dialog" aria-label="AI Tutor chat">
          {/* Header */}
          <div className="drawer-header">
            <div className="drawer-header-title">
              <AutoAwesomeIcon sx={{ color: "#7655F6" }} />
              <div>
                <h4>AI Learning Tutor</h4>
                <span>RAG-powered · {topic || "Roadmap"}</span>
              </div>
            </div>
            <button
              className="drawer-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close AI Tutor"
            >
              <CloseIcon fontSize="small" />
            </button>
          </div>

          {/* ── Initializing overlay ── */}
          {isInitializing && (
            <div className="drawer-init-overlay">
              <CircularProgress size={36} sx={{ color: "#7655F6", mb: "16px" }} />
              <p className="drawer-init-step">{INIT_STEPS[initStepIndex]}</p>
              <p className="drawer-init-sub">Setting up your personal AI tutor…</p>
            </div>
          )}

          {/* ── Error state ── */}
          {initError && !isInitializing && (
            <div className="drawer-error-box">
              <p className="drawer-error-msg">{initError}</p>
              <button className="drawer-retry-btn" onClick={resetAndRetry}>
                <RefreshIcon sx={{ fontSize: 16, mr: "4px" }} /> Retry
              </button>
            </div>
          )}

          {/* ── Chat ready ── */}
          {isRagReady && !isInitializing && (
            <>
              <div className="drawer-chat-body" ref={chatBodyRef}>
                  {chatHistory.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`chat-bubble-row ${msg.sender === "user" ? "user" : "ai"}`}
                    >
                      {msg.sender === "ai" ? (
                        <div className="chat-bubble chat-bubble-ai-md">
                          <MarkdownRenderer content={msg.text} />
                        </div>
                      ) : (
                        <div className="chat-bubble">{msg.text}</div>
                      )}
                    </div>
                  ))}
                {isTyping && (
                  <div className="chat-bubble-row ai">
                    <div className="chat-bubble typing-indicator">
                      <span /><span /><span />
                    </div>
                  </div>
                )}
              </div>

              <div className="drawer-input-row">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ask anything about this roadmap…"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isTyping}
                  aria-label="Chat input"
                />
                <button
                  className="send-btn"
                  onClick={() => handleSend()}
                  disabled={isTyping || !inputMsg.trim()}
                  aria-label="Send message"
                >
                  <SendIcon fontSize="small" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
