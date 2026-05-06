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
}) {
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
                                <button
                                    type="button"
                                    className="session-item-button"
                                    onClick={() => onSelectSession(session)}
                                >
                                    <span className="session-title">{session.title}</span>
                                    <span className="session-meta">
                                        {session.message_count ?? 0} messages • {session.last_message_at ? new Date(session.last_message_at).toLocaleString() : "new"}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    className="session-delete"
                                    onClick={() => onDeleteSession(session.session_id)}
                                    title="Archive chat"
                                >
                                    ×
                                </button>
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
