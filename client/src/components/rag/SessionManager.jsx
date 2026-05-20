import { useState } from "react";
import { Check, Close, Edit } from "@mui/icons-material";
import ErrorMessage from "../utils/ErrorMessage";
import "../../styles/SessionManager.css";

export default function SessionManager({
    sessions,
    selectedSession,
    loading,
    error,
    onSelectSession,
    onCreateSession,
    onDeleteSession,
    onRenameSession,
}) {
    const [editingSessionId, setEditingSessionId] = useState(null);
    const [editingTitle, setEditingTitle] = useState("");

    const handleStartEdit = (session) => {
        setEditingSessionId(session.session_id);
        setEditingTitle(session.title);
    };

    const handleSaveEdit = async () => {
        if (editingTitle.trim() && onRenameSession) {
            await onRenameSession(editingSessionId, editingTitle.trim());
        }
        setEditingSessionId(null);
        setEditingTitle("");
    };

    const handleCancelEdit = () => {
        setEditingSessionId(null);
        setEditingTitle("");
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            handleSaveEdit();
        } else if (e.key === "Escape") {
            handleCancelEdit();
        }
    };
    return (
        <section className="rag-panel session-manager-panel">
            <div className="rag-panel-header">
                <h2>Chat Sessions</h2>
                <p>Start a new chat, reopen a saved session, or archive stale conversations.</p>
            </div>

            <div className="session-actions">
                <button type="button" onClick={onCreateSession} disabled={loading}>
                    {loading ? "Starting..." : "New Chat"}
                </button>
            </div>

            {error ? <ErrorMessage message={error} /> : null}

            <div className="session-list-wrapper">
                {sessions.length ? (
                    <ul className="session-list">
                        {sessions.map((session) => (
                            <li
                                key={session.session_id}
                                className={`session-item ${selectedSession?.session_id === session.session_id ? "is-selected" : ""
                                    }`}
                            >
                                {editingSessionId === session.session_id ? (
                                    <div className="session-edit-mode">
                                        <input
                                            type="text"
                                            value={editingTitle}
                                            onChange={(e) => setEditingTitle(e.target.value)}
                                            onKeyDown={handleKeyPress}
                                            className="session-title-input"
                                            autoFocus
                                            placeholder="Enter chat title..."
                                        />
                                        <div className="session-edit-actions">
                                            <button
                                                type="button"
                                                className="session-edit-save"
                                                onClick={handleSaveEdit}
                                                title="Save"
                                            >
                                                <Check fontSize="small" />
                                            </button>
                                            <button
                                                type="button"
                                                className="session-edit-cancel"
                                                onClick={handleCancelEdit}
                                                title="Cancel"
                                            >
                                                <Close fontSize="small" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            className="session-item-button"
                                            onClick={() => onSelectSession(session)}
                                        >
                                            <span className="session-title">{session.title}</span>
                                            <span className="session-meta">
                                                {session.message_count ?? 0} messages | {session.last_message_at ? new Date(session.last_message_at).toLocaleString() : "new"}
                                            </span>
                                        </button>
                                        <div className="session-item-actions">
                                            <button
                                                type="button"
                                                className="session-edit"
                                                onClick={() => handleStartEdit(session)}
                                                title="Rename chat"
                                            >
                                                <Edit fontSize="small" />
                                            </button>
                                            <button
                                                type="button"
                                                className="session-delete"
                                                onClick={() => onDeleteSession(session.session_id)}
                                                title="Archive chat"
                                            >
                                                <Close fontSize="small" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="session-empty">
                        <p>No saved chats yet.</p>
                        <small>Click New Chat to begin a conversation that is stored and retrievable.</small>
                    </div>
                )}
            </div>
        </section>
    );
}
