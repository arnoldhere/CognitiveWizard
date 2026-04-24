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

function formatResetTime(resetTime) {
  if (!resetTime) return "not available";

  const parsed = new Date(resetTime);
  if (Number.isNaN(parsed.getTime())) return "not available";

  return parsed.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function MessageSources({ sources }) {
  if (!sources?.length) return null;

  return (
    <div className="source-list">
      {sources.map((source) => (
        <article key={source.id} className="source-card">
          <header>
            <span>{source.title}</span>
            <small>score {Number(source.score).toFixed(3)}</small>
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
      {message.sender === "bot" ? <MessageSources sources={message.sources} /> : null}
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

function UploadedHistory({ documents }) {
  if (!documents?.length) {
    return (
      <div className="chat-upload-history empty">
        <span className="history-label">uploaded files</span>
        <p>No personal RAG documents uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="chat-upload-history">
      <div className="history-topline">
        <span className="history-label">uploaded files</span>
        <span className="history-count">{documents.length}</span>
      </div>
      <div className="history-chip-row">
        {documents.map((doc, index) => (
          <span key={`${doc}-${index}`} className="history-chip">
            {doc}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ChatWindow({ ragReady, status }) {
  const uploadedDocuments = status?.uploaded_documents ?? [];
  const initialLimitInfo = status?.chat_limit_info ?? null;

  const [messages, setMessages] = useState([
    createMessage(
      "bot",
      "Private RAG session ready. Upload a document to ground answers in your own knowledge base.",
      { modeUsed: "llm", sources: [] },
    ),
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastFailedQuery, setLastFailedQuery] = useState("");
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [chatLimitInfo, setChatLimitInfo] = useState(initialLimitInfo);
  const [chatLimitReached, setChatLimitReached] = useState(
    Boolean(initialLimitInfo?.limit_reached || initialLimitInfo?.can_send === false),
  );

  const chatContainerRef = useRef(null);
  const currentRequestRef = useRef(null);
  const scrollAnimationRef = useRef(null);
  const prefersReducedMotionRef = useRef(false);

  useEffect(() => {
    const nextLimitInfo = status?.chat_limit_info ?? null;
    setChatLimitInfo(nextLimitInfo);
    setChatLimitReached(
      Boolean(nextLimitInfo?.limit_reached || nextLimitInfo?.can_send === false),
    );
  }, [status?.chat_limit_info]);

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
    if (!trimmed || loading || chatLimitReached) return;

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

      if (data.chat_limit_info) {
        setChatLimitInfo(data.chat_limit_info);
        setChatLimitReached(Boolean(data.chat_limit_info.limit_reached));
      }

      setLastFailedQuery("");
    } catch (err) {
      if (err.name === "CanceledError") return;

      if (err.message?.includes("Daily chat limit reached")) {
        setChatLimitReached(true);
        setChatLimitInfo((prev) => ({
          can_send: false,
          messages_used: prev?.max_per_day ?? 5,
          messages_remaining: 0,
          max_per_day: prev?.max_per_day ?? 5,
          limit_reached: true,
          reset_time: prev?.reset_time,
          subscribed: prev?.subscribed ?? null,
        }));
      }

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

  const resetAtLabel = formatResetTime(chatLimitInfo?.reset_time);
  const remainingLabel = chatLimitInfo?.subscribed
    ? "unlimited premium access"
    : `${chatLimitInfo?.messages_remaining ?? 0} remaining today`;

  return (
    <section className="rag-panel chat-window">
      <header className="chat-header">
        <div>
          <p className="chat-kicker">session</p>
          <h2>RAG Assistant Console</h2>
        </div>
        <span className={`chat-mode-chip ${ragReady ? "rag" : "llm"}`}>
          {ragReady ? "user-scoped rag" : "llm fallback"}
        </span>
      </header>

      <UploadedHistory documents={uploadedDocuments} />

      <div className={`chat-limit-banner ${chatLimitReached ? "is-blocked" : ""}`}>
        <div>
          <strong>Daily limit:</strong> 5 chat requests per day.
        </div>
        <div>{remainingLabel}</div>
        <div className="chat-reset-time">Resets at: {resetAtLabel}</div>
      </div>

      <div className="chat-history" ref={chatContainerRef}>
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {loading && <div className="typing-indicator">assistant thinking</div>}
      </div>
      {!isNearBottom ? (
        <button
          type="button"
          className="scroll-to-bottom-btn"
          onClick={() => smoothScrollToBottom(300)}
        >
          jump to latest
        </button>
      ) : null}

      {error && (
        <div className="chat-error-wrap">
          <ErrorMessage message={error} />
          {lastFailedQuery && !chatLimitReached && (
            <button type="button" onClick={handleRetry} disabled={loading}>
              Retry Last Question
            </button>
          )}
        </div>
      )}

      {chatLimitReached && (
        <div className="chat-limit-alert" role="alert">
          <div className="limit-alert-content">
            <h3>Daily chat limit reached</h3>
            <p>
              You have used all 5 chat requests for today. Premium purchase flow
              can be connected here later. For now, chat is disabled until the
              limit resets at {resetAtLabel}.
            </p>
          </div>
        </div>
      )}

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your private uploaded documents..."
          disabled={loading || chatLimitReached}
        />
        <button type="submit" disabled={loading || !input.trim() || chatLimitReached}>
          {loading ? "Sending..." : "Send"}
        </button>
      </form>
    </section>
  );
}
