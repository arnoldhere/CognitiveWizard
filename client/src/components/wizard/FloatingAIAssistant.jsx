import React, { useState } from "react";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import QuizIcon from "@mui/icons-material/Quiz";
import StyleIcon from "@mui/icons-material/Style";
import SummarizeIcon from "@mui/icons-material/Summarize";
import LightbulbIcon from "@mui/icons-material/Lightbulb";

export default function FloatingAIAssistant({ topic, currentPhaseTitle }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMsg, setInputMsg] = useState("");
  const [chatHistory, setChatHistory] = useState([
    {
      sender: "ai",
      text: `Hi! I'm your AI Learning Mentor for ${topic || "this topic"}. How can I assist your study session today?`,
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = (textToSend) => {
    const query = textToSend || inputMsg;
    if (!query.trim()) return;

    // Add user message
    setChatHistory((prev) => [...prev, { sender: "user", text: query }]);
    if (!textToSend) setInputMsg("");
    setIsTyping(true);

    // Simulate AI response based on topic/query
    setTimeout(() => {
      let aiText = `Here is a quick overview regarding "${query}": Keep breaking down concepts into hands-on code examples and review key takeaways after each phase.`;
      if (query.toLowerCase().includes("quiz")) {
        aiText = `Here is a quick quiz question for ${topic}: What is the main architectural benefit of breaking down learning into milestone phases? (A) Rapid feedback (B) Less distraction (C) Both A and B.`;
      } else if (query.toLowerCase().includes("summarize")) {
        aiText = `Summary of ${currentPhaseTitle || "Phase"}: Focus on mastering core definitions, completing the practical task, and reviewing recommended references before moving to the next milestone.`;
      } else if (query.toLowerCase().includes("flashcard")) {
        aiText = `Flashcard 1: [Term] ${topic} Core Concept — [Definition] Key mechanism for structuring applications efficiently.`;
      }

      setChatHistory((prev) => [...prev, { sender: "ai", text: aiText }]);
      setIsTyping(false);
    }, 1000);
  };

  const handleActionChip = (actionLabel, promptText) => {
    handleSend(promptText);
  };

  return (
    <div className="floating-ai-root">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button className="floating-ai-fab" onClick={() => setIsOpen(true)}>
          <AutoAwesomeIcon />
          <span>Ask AI Mentor</span>
        </button>
      )}

      {/* AI Assistant Chat Window Drawer */}
      {isOpen && (
        <div className="floating-ai-drawer">
          <div className="drawer-header">
            <div className="drawer-header-title">
              <AutoAwesomeIcon sx={{ color: "#a855f7" }} />
              <div>
                <h4>AI Mentor & Assistant</h4>
                <span>Active on {topic || "Roadmap"}</span>
              </div>
            </div>
            <button className="drawer-close-btn" onClick={() => setIsOpen(false)}>
              <CloseIcon fontSize="small" />
            </button>
          </div>

          {/* Quick Action Chips */}
          <div className="drawer-actions-row">
            <button
              className="action-chip"
              onClick={() =>
                handleActionChip(
                  "Explain Topic",
                  `Can you explain the main concepts of ${topic} in simple terms?`
                )
              }
            >
              <LightbulbIcon sx={{ fontSize: 14 }} />
              <span>Explain Topic</span>
            </button>

            <button
              className="action-chip"
              onClick={() =>
                handleActionChip(
                  "Summarize Phase",
                  `Summarize key takeaways for ${currentPhaseTitle || "current phase"}`
                )
              }
            >
              <SummarizeIcon sx={{ fontSize: 14 }} />
              <span>Summarize Phase</span>
            </button>

            <button
              className="action-chip"
              onClick={() =>
                handleActionChip(
                  "Generate Quiz",
                  `Generate a quick quiz question for ${topic}`
                )
              }
            >
              <QuizIcon sx={{ fontSize: 14 }} />
              <span>Generate Quiz</span>
            </button>

            <button
              className="action-chip"
              onClick={() =>
                handleActionChip(
                  "Flashcards",
                  `Generate flashcards for ${topic}`
                )
              }
            >
              <StyleIcon sx={{ fontSize: 14 }} />
              <span>Flashcards</span>
            </button>
          </div>

          {/* Chat History */}
          <div className="drawer-chat-body">
            {chatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`chat-bubble-row ${msg.sender === "user" ? "user" : "ai"}`}
              >
                <div className="chat-bubble">{msg.text}</div>
              </div>
            ))}
            {isTyping && (
              <div className="chat-bubble-row ai">
                <div className="chat-bubble typing">AI is thinking...</div>
              </div>
            )}
          </div>

          {/* Input Box */}
          <div className="drawer-input-row">
            <input
              type="text"
              placeholder="Ask anything about this roadmap..."
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button className="send-btn" onClick={() => handleSend()}>
              <SendIcon fontSize="small" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
