import { useEffect, useRef, useState } from "react";
import ErrorMessage from "../utils/ErrorMessage";
import MarkdownRenderer from "../utils/MarkdownRenderer";
import { askRagQuestion, fetchChatSessionHistory } from "../../services/rag";
import { parseMessageTimestamp } from "../../utils/apiError";
import { Send, Clock, Activity, CornerDownRight } from "lucide-react";

function createMessage(sender, text, extra = {}) {
  const normalizedSender = sender === "assistant" ? "bot" : sender;
  return {
    id: crypto.randomUUID(),
    sender: normalizedSender,
    text,
    createdAt: new Date().toISOString(),
    tokenUsage: extra.tokenUsage || extra.metadata?.token_usage || extra.metadata?.tokenUsage || null,
    sources: extra.metadata?.sources ?? extra.sources ?? [],
    modeUsed: extra.metadata?.mode_used ?? extra.modeUsed,
    warning: extra.metadata?.warning ?? extra.warning,
    ...extra,
  };
}

function formatResetTime(resetTime) {
  if (!resetTime) return "not available";

  const parsed = parseMessageTimestamp(resetTime);
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

function getTokenValue(tokenUsage, keys) {
  if (!tokenUsage) return null;
  for (const key of keys) {
    const value = tokenUsage[key];
    if (Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function formatMessageTime(createdAt) {
  return parseMessageTimestamp(createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MessageBubble({ message }) {
  const time = formatMessageTime(message.createdAt);
  const inputTokens = getTokenValue(message.tokenUsage, [
    "input_tokens",
    "prompt_tokens",
    "input",
    "prompt",
  ]);
  const outputTokens = getTokenValue(message.tokenUsage, [
    "output_tokens",
    "completion_tokens",
    "output",
    "completion",
  ]);
  const showTokens =
    message.sender === "bot" && (inputTokens !== null || outputTokens !== null);

  const isBot = message.sender === "bot";

  return (
    <div className={`flex flex-col gap-1 w-full max-w-3xl mx-auto px-4 ${isBot ? 'items-start' : 'items-end'}`}>
      <div className={`
        relative px-5 py-4 rounded-2xl max-w-[90%] md:max-w-[85%]
        ${isBot
          ? 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
          : 'bg-primary text-slate-900 font-medium rounded-tr-sm shadow-md'
        }
      `}>
        {isBot ? (
          <div className="prose prose-slate prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-slate-800 prose-pre:text-slate-50">
            <MarkdownRenderer content={message.text} />
          </div>
        ) : (
          <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
        )}

        {message.warning ? (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            {message.warning}
          </div>
        ) : null}
      </div>

      <div className={`flex items-center gap-3 text-[11px] font-medium text-slate-400 mt-1 px-1 ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
        <span className="flex items-center gap-1"><Clock size={12} /> {time}</span>
        {showTokens ? (
          <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            <Activity size={12} />
            {inputTokens !== null ? `in ${inputTokens}` : null}
            {inputTokens !== null && outputTokens !== null ? " / " : null}
            {outputTokens !== null ? `out ${outputTokens}` : null}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function UploadedHistory({ documents }) {
  if (!documents?.length) {
    return (
      <div className="flex items-center gap-3 p-4 mx-4 mb-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-sm text-slate-500">
        <span className="px-2 py-1 bg-slate-200 text-slate-600 rounded text-xs font-bold uppercase tracking-wider">uploaded files</span>
        <p>No personal RAG documents uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4 mx-4 mb-4 bg-slate-50 border border-slate-200 rounded-xl">
      <div className="flex items-center gap-3 text-sm font-semibold">
        <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-bold uppercase tracking-wider">uploaded files</span>
        <span className="text-slate-500">{documents.length} files available</span>
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {documents.map((doc, index) => (
          <span key={`${doc}-${index}`} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 shadow-sm truncate max-w-[200px]">
            {doc}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ChatWindow({ ragReady, status, selectedSession, onSessionAssigned }) {
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
  const [sessionError, setSessionError] = useState("");
  const [lastFailedQuery, setLastFailedQuery] = useState("");
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [chatLimitInfo, setChatLimitInfo] = useState(initialLimitInfo);
  const [chatLimitReached, setChatLimitReached] = useState(
    Boolean(initialLimitInfo?.limit_reached || initialLimitInfo?.can_send === false),
  );
  const [sessionLoading, setSessionLoading] = useState(false);

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

  useEffect(() => {
    if (!selectedSession || !selectedSession.session_id) {
      setMessages([
        createMessage(
          "bot",
          "Private RAG session ready. Upload a document to ground answers in your own knowledge base.",
          { modeUsed: "llm", sources: [] },
        ),
      ]);
      setSessionError("");
      setSessionLoading(false);
      return;
    }

    let mounted = true;
    const loadSessionHistory = async () => {
      setSessionLoading(true);
      setSessionError("");

      try {
        const data = await fetchChatSessionHistory(selectedSession.session_id);
        if (!mounted) return;

        const rawMessages = Array.isArray(data)
          ? data
          : (data?.messages ?? []);

        const sessionMessages = rawMessages.map((item) =>
          createMessage(item.role, item.content, {
            createdAt: item.created_at,
            metadata: item.metadata,
          }),
        );

        if (sessionMessages.length > 0) {
          setMessages(sessionMessages);
        } else {
          setMessages([
            createMessage(
              "bot",
              "Private RAG session ready. Upload a document to ground answers in your own knowledge base.",
              { modeUsed: "llm", sources: [] },
            ),
          ]);
        }
      } catch (err) {
        if (!mounted) return;
        setSessionError(err.message || "Failed to load chat history.");
      } finally {
        if (mounted) setSessionLoading(false);
      }
    };

    loadSessionHistory();
    return () => {
      mounted = false;
    };
  }, [selectedSession]);

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
        session_id: selectedSession?.session_id,
      });

      setMessages((prev) => [
        ...prev,
        createMessage("bot", data.answer, {
          createdAt: new Date().toISOString(),
          modeUsed: data.mode_used,
          warning: data.warning ?? "",
          tokenUsage: data.token_usage ?? null,
        }),
      ]);

      if (data.chat_limit_info) {
        setChatLimitInfo(data.chat_limit_info);
        setChatLimitReached(Boolean(data.chat_limit_info.limit_reached));
      }

      if (data.session_id && onSessionAssigned) {
        onSessionAssigned({
          session_id: data.session_id,
          title: data.session_title || selectedSession?.title || "Chat Session",
          message_count: selectedSession?.message_count ?? 0,
          last_message_at: selectedSession?.last_message_at,
        });
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
  const planName = chatLimitInfo?.subscription_name || "Free";
  const planLimit = chatLimitInfo?.subscription_daily_limit ?? chatLimitInfo?.max_per_day ?? 5;
  const planBadgeLabel = `${planName} | ${planLimit} chats/day`;
  const remainingLabel = `${chatLimitInfo?.messages_remaining ?? 0} remaining today`;

  return (
    <div className="flex flex-col h-full bg-white relative">
      <header className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 backdrop-blur z-10">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Session</p>
          <h2 className="text-xl font-bold text-dark leading-none">RAG Assistant Console</h2>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-2">
            <span className="font-semibold text-slate-700">{selectedSession ? selectedSession.title : "No session selected"}</span>
            <span>•</span>
            <span>{selectedSession ? `${selectedSession.message_count ?? 0} messages` : "Choose or create a chat session."}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${ragReady ? "bg-cyan-50 text-cyan-600 border-cyan-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
            {ragReady ? "user-scoped rag" : "llm fallback"}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold border bg-indigo-50 text-indigo-600 border-indigo-200">
            {planBadgeLabel}
          </span>
        </div>
      </header>

      {sessionLoading && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-20 flex items-center justify-center">
          <div className="px-4 py-2 bg-slate-800 text-white rounded-full text-sm font-medium shadow-lg animate-pulse">
            Loading chat history...
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pt-6 pb-24 scroll-smooth" ref={chatContainerRef}>
        <UploadedHistory documents={uploadedDocuments} />

        {sessionError ? (
          <div className="px-4 mb-6">
            <ErrorMessage message={sessionError} />
          </div>
        ) : null}

        <div className={`mx-4 mb-8 px-4 py-3 rounded-xl text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 border ${chatLimitReached ? "bg-red-50 text-red-700 border-red-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
          <div className="flex items-center gap-2">
            <strong>Daily limit:</strong> 5 chat requests per day.
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold uppercase tracking-wider">
            <span>{remainingLabel}</span>
            <span className="px-2 py-1 rounded-md bg-white/50">Resets: {resetAtLabel}</span>
          </div>
        </div>

        <div className="flex flex-col gap-6 pb-6">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {loading && (
            <div className="flex flex-col gap-1 w-full max-w-3xl mx-auto px-4 items-start">
              <div className="px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 rounded-tl-sm shadow-sm flex items-center gap-2">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {!isNearBottom && (
        <button
          type="button"
          className="absolute bottom-28 right-8 p-3 rounded-full bg-white border border-slate-200 shadow-xl text-slate-500 hover:text-primary hover:border-primary transition-all z-30"
          onClick={() => smoothScrollToBottom(300)}
          title="Scroll to bottom"
        >
          <CornerDownRight size={20} className="rotate-90" />
        </button>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent p-4 md:p-6 z-20">
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
          {error && (
            <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm mb-2 shadow-sm">
              <span className="font-medium">{error}</span>
              {lastFailedQuery && !chatLimitReached && (
                <button type="button" onClick={handleRetry} disabled={loading} className="px-3 py-1 rounded-md bg-red-100 font-bold hover:bg-red-200 transition-colors">
                  Retry Question
                </button>
              )}
            </div>
          )}

          {chatLimitReached && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm mb-2 shadow-sm flex flex-col gap-1">
              <h3 className="font-bold">Daily chat limit reached</h3>
              <p>You have used all 5 chat requests for today. Chat is disabled until the limit resets at {resetAtLabel}.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative w-full shadow-lg rounded-2xl group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={chatLimitReached ? "Chat limit reached for today" : "Ask about your private uploaded documents..."}
              disabled={loading || chatLimitReached}
              className="w-full pl-6 pr-16 py-4 rounded-2xl border-2 border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400 bg-white shadow-inner font-medium"
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || chatLimitReached}
              className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-primary hover:bg-opacity-90 disabled:bg-slate-300 text-slate-900 rounded-xl transition-all shadow-sm"
            >
              <Send size={18} className={`${input.trim() && !loading && !chatLimitReached ? 'ml-1' : ''} transition-all`} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
