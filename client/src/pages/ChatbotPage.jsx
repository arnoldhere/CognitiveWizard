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
        <p className="eyebrow">Private Retrieval Workspace</p>
        <h1>Console RAG Chat</h1>
        <p>
          Each uploaded document is isolated to your account, visible in your own
          workspace history, and available only to your retrieval flow.
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
          <ChatWindow
            ragReady={Boolean(status?.ready_for_rag)}
            status={status}
          />
        </div>
      </section>
    </div>
  );
}
