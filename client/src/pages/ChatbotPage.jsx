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
import { motion } from "framer-motion";

export default function ChatbotPage() {
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState("");
  const [selectedSession, setSelectedSession] = useState(null);
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
    <div className="min-h-screen bg-light flex flex-col pt-16">
      <section className="bg-white border-b border-slate-200 py-10 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto"
        >
          <p className="text-primary font-bold uppercase tracking-wider text-sm mb-2">Private Retrieval Workspace</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-dark mb-4">Console RAG Chat</h1>
          <p className="text-slate-600 max-w-2xl">
            Each uploaded document is isolated to your account, visible in your own
            workspace history, and available only to your retrieval flow.
          </p>
        </motion.div>
      </section>

      <section className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 h-full">
        <aside className="w-full lg:w-80 flex flex-col gap-6 shrink-0 h-full overflow-y-auto">
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

        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[600px] h-[calc(100vh-250px)]">
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
