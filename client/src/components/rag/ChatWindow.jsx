import { useEffect, useRef, useState } from "react";
import ErrorMessage from "../utils/ErrorMessage";
import { askRagQuestion } from "../../services/rag";
import "../../styles/ChatWindow.css";

function createMessage(sender, text, extra = {}) {
  return {
    id: crypto.randomUUID(),
    sender,
    text,
    createdAt: new Date().toISOString(),
    tokenUsage: extra.tokenUsage || null,
    ...extra,
  };
}

function MessageSources({ sources }) {
  if (!sources?.length) return null;

  return (
    <div className="source-list">
      {sources.map((source) => (
        <article key={source.id} className="source-card">
          <header>
            <span>{source.title}</span>
            <small>Score: {Number(source.score).toFixed(3)}</small>
          </header>
          <p>{source.snippet}</p>
        </article>
      ))}
    </div>
  );
}

function MessageBubble({ message }) {
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`chat-msg ${message.sender}`}>
      <p>{message.text}</p>
      {message.warning ? (
        <small className="chat-warning">{message.warning}</small>
      ) : null}
      {message.sender === "bot" ? (
        <MessageSources sources={message.sources} />
      ) : null}
      <div className="message-footer">
        {message.tokenUsage && (
          <small className="token-usage">
            {message.tokenUsage.total_tokens} tokens
          </small>
        )}
        <small>{time}</small>
      </div>
    </div>
  );
}

export default function ChatWindow({ ragReady }) {
  const [messages, setMessages] = useState([
    createMessage(
      "bot",
      "Hello! Ask anything. Upload a document to enable retrieval-grounded answers.",
      { modeUsed: "llm", sources: [] }
    ),
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastFailedQuery, setLastFailedQuery] = useState("");
  const [isNearBottom, setIsNearBottom] = useState(true);

  const chatContainerRef = useRef(null);
  const currentRequestRef = useRef(null);
  const scrollAnimationRef = useRef(null);
  const prefersReducedMotionRef = useRef(false);

  const smoothScrollToBottom = (duration = 380) => {
    const container = chatContainerRef.current;
    if (!container) return;
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
      scrollAnimationRef.current = null;
    }

    if (prefersReducedMotionRef.current) {
      container.scrollTop = container.scrollHeight;
      return;
    }

    const startTop = container.scrollTop;
    const targetTop = container.scrollHeight - container.clientHeight;
    const distance = targetTop - startTop;
    if (distance <= 0) return;

    const startTime = performance.now();
    const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);

    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      container.scrollTop = startTop + distance * easeOutCubic(progress);
      if (progress < 1) {
        scrollAnimationRef.current = requestAnimationFrame(step);
      } else {
        scrollAnimationRef.current = null;
      }
    };

    scrollAnimationRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotionRef.current = media.matches;
    const handleMotionChange = (event) => {
      prefersReducedMotionRef.current = event.matches;
    };
    media.addEventListener("change", handleMotionChange);

    const container = chatContainerRef.current;
    if (!container) {
      return () => media.removeEventListener("change", handleMotionChange);
    }

    const handleScroll = () => {
      const distanceToBottom =
        container.scrollHeight - (container.scrollTop + container.clientHeight);
      setIsNearBottom(distanceToBottom < 90);
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      media.removeEventListener("change", handleMotionChange);
    };
  }, []);

  useEffect(() => {
    if (isNearBottom) {
      smoothScrollToBottom();
    }
  }, [messages, loading, isNearBottom]);

  useEffect(() => {
    return () => {
      currentRequestRef.current?.abort();
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
      }
    };
  }, []);

  const sendQuery = async (query) => {
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    const userMessage = createMessage("user", trimmed);
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError("");

    currentRequestRef.current?.abort();
    const controller = new AbortController();
    currentRequestRef.current = controller;

    try {
      const data = await askRagQuestion({
        query: trimmed,
        use_rag: ragReady,
        signal: controller.signal,
      });

      setMessages((prev) => [
        ...prev,
        createMessage("bot", data.answer, {
          modeUsed: data.mode_used,
          sources: data.sources ?? [],
          warning: data.warning ?? "",
          tokenUsage: data.token_usage ?? null,
        }),
      ]);

      setLastFailedQuery("");
    } catch (err) {
      if (err.name === "CanceledError") return;

      setError(err.message);
      setLastFailedQuery(trimmed);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await sendQuery(input);
  };

  const handleRetry = async () => {
    if (!lastFailedQuery) return;
    await sendQuery(lastFailedQuery);
  };

  return (
    <section className="rag-panel chat-window">
      <header className="chat-header">
        <h2>RAG Assistant</h2>
        <span className={`chat-mode-chip ${ragReady ? "rag" : "llm"}`}>
          {ragReady ? "RAG Mode Active" : "LLM Fallback Active"}
        </span>
      </header>

      {/* Attach ref to container */}
      <div className="chat-history" ref={chatContainerRef}>
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {loading && (
          <div className="typing-indicator">
            Assistant is thinking...
          </div>
        )}
      </div>
      {!isNearBottom ? (
        <button
          type="button"
          className="scroll-to-bottom-btn"
          onClick={() => smoothScrollToBottom(300)}
        >
          Jump to latest
        </button>
      ) : null}

      {error && (
        <div className="chat-error-wrap">
          <ErrorMessage message={error} />
          {lastFailedQuery && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={loading}
            >
              Retry Last Question
            </button>
          )}
        </div>
      )}

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your uploaded docs or any topic..."
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          {loading ? "Sending..." : "Send"}
        </button>
      </form>
    </section>
  );
}
