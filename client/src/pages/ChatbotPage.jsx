import { useEffect, useState } from "react";
import ChatWindow from "../components/rag/ChatWindow";
import FileUpload from "../components/rag/FileUpload";
import ContextDisplay from "../components/rag/ContextDisplay";
import { fetchRagStatus } from "../services/rag";
import "../styles/ChatbotPage.css";

export default function ChatbotPage() {
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState("");

  const refreshStatus = async () => {
    setStatusLoading(true);
    setStatusError("");
    try {
      const payload = await fetchRagStatus();
      setStatus(payload);
    } catch (error) {
      setStatusError(error.message);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  return (
    <div className="chatbot-page">
      <div className="chatbot-page-overlay" />
      <section className="chatbot-hero">
        <p className="eyebrow">Knowledge Assistant</p>
        <h1>RAG-Powered Chatbot</h1>
        <p>
          Upload documents and ask grounded questions, or chat directly with fallback LLM mode
          when no documents are available.
        </p>
      </section>

      <section className="chatbot-layout">
        <aside className="chatbot-sidebar">
          <FileUpload onUploadSuccess={refreshStatus} />
          <ContextDisplay
            status={status}
            loading={statusLoading}
            error={statusError}
            onRefresh={refreshStatus}
          />
        </aside>
        <div className="chatbot-main">
          <ChatWindow ragReady={Boolean(status?.ready_for_rag)} />
        </div>
      </section>
    </div>
  );
}
