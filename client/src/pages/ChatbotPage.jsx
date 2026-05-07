import { useEffect, useState } from "react";
import ChatWindow from "../components/rag/ChatWindow";
import FileUpload from "../components/rag/FileUpload";
import ContextDisplay from "../components/rag/ContextDisplay";
import SessionManager from "../components/rag/SessionManager";
import {
  fetchChatSessions,
  createChatSession,
  deleteChatSession,
  renameChatSession,
  fetchRagStatus,
} from "../services/rag";
import "../styles/ChatbotPage.css";

export default function ChatbotPage() {
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState("");
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionSwitchingLoading, setSessionSwitchingLoading] = useState(false);

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

  const refreshSessions = async () => {
    setSessionsLoading(true);
    setSessionsError("");

    try {
      const payload = await fetchChatSessions();
      setSessions(payload || []);
      if (!selectedSession && payload?.length) {
        setSelectedSession(payload[0]);
      } else if (selectedSession) {
        const found = payload?.find((item) => item.session_id === selectedSession.session_id);
        setSelectedSession(found || selectedSession);
      }
    } catch (error) {
      setSessionsError(error.message);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleCreateSession = async () => {
    setSessionsError("");
    try {
      const session = await createChatSession();
      await refreshSessions();
      setSelectedSession(session);
    } catch (error) {
      setSessionsError(error.message);
    }
  };

  const handleSelectSession = (session) => {
    setSelectedSession(session);
  };

  const handleDeleteSession = async (sessionId) => {
    setSessionsError("");
    try {
      await deleteChatSession(sessionId);
      await refreshSessions();
      if (selectedSession?.session_id === sessionId) {
        setSelectedSession(null);
      }
    } catch (error) {
      setSessionsError(error.message);
    }
  };

  const handleRenameSession = async (sessionId, newTitle) => {
    setSessionsError("");
    try {
      await renameChatSession(sessionId, newTitle);
      await refreshSessions();
      // Update selected session if it's the one being renamed
      if (selectedSession?.session_id === sessionId) {
        setSelectedSession(prev => prev ? { ...prev, title: newTitle } : null);
      }
    } catch (error) {
      setSessionsError(error.message);
    }
  };

  useEffect(() => {
    refreshStatus();
    refreshSessions();
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
          <SessionManager
            sessions={sessions}
            selectedSession={selectedSession}
            loading={sessionsLoading}
            error={sessionsError}
            onCreateSession={handleCreateSession}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onRenameSession={handleRenameSession}
          />
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
            selectedSession={selectedSession}
            onSessionAssigned={(session) => setSelectedSession(session)}
          />
        </div>
      </section>
    </div>
  );
}
