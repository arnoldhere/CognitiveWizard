import { useState } from "react";
import { Check, X, Pencil, Plus } from "lucide-react";
import ErrorMessage from "../utils/ErrorMessage";

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
        <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
            <div>
                <h2 className="text-lg font-bold text-dark mb-1">Chat Sessions</h2>
                <p className="text-sm text-slate-500">Start a new chat, reopen a saved session, or archive conversations.</p>
            </div>

            <button 
                type="button" 
                onClick={onCreateSession} 
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-opacity-90 text-slate-900 py-2.5 px-4 rounded-xl font-semibold transition-colors disabled:opacity-50"
            >
                <Plus size={18} />
                {loading ? "Starting..." : "New Chat"}
            </button>

            {error ? <ErrorMessage message={error} /> : null}

            <div className="flex-1 overflow-y-auto">
                {sessions.length ? (
                    <ul className="flex flex-col gap-2">
                        {sessions.map((session) => (
                            <li
                                key={session.session_id}
                                className={`
                                    group flex flex-col p-3 rounded-xl border transition-all
                                    ${selectedSession?.session_id === session.session_id 
                                        ? "bg-primary/5 border-primary/20" 
                                        : "bg-white border-transparent hover:border-slate-200 hover:bg-slate-50"}
                                `}
                            >
                                {editingSessionId === session.session_id ? (
                                    <div className="flex items-center gap-2 w-full">
                                        <input
                                            type="text"
                                            value={editingTitle}
                                            onChange={(e) => setEditingTitle(e.target.value)}
                                            onKeyDown={handleKeyPress}
                                            className="flex-1 min-w-0 px-3 py-1.5 rounded-lg border border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                                            autoFocus
                                            placeholder="Enter chat title..."
                                        />
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                type="button"
                                                onClick={handleSaveEdit}
                                                title="Save"
                                                className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                                            >
                                                <Check size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleCancelEdit}
                                                title="Cancel"
                                                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-start justify-between gap-2 w-full">
                                        <button
                                            type="button"
                                            className="flex-1 text-left min-w-0 flex flex-col"
                                            onClick={() => onSelectSession(session)}
                                        >
                                            <span className={`text-sm font-semibold truncate w-full ${selectedSession?.session_id === session.session_id ? 'text-primary' : 'text-slate-700'}`}>
                                                {session.title}
                                            </span>
                                            <span className="text-xs text-slate-400 truncate w-full mt-0.5">
                                                {session.message_count ?? 0} msgs • {session.last_message_at ? new Date(session.last_message_at).toLocaleDateString() : "new"}
                                            </span>
                                        </button>
                                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                type="button"
                                                onClick={() => handleStartEdit(session)}
                                                title="Rename chat"
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onDeleteSession(session.session_id)}
                                                title="Archive chat"
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center py-6 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <p className="text-sm font-semibold text-slate-600 mb-1">No saved chats yet.</p>
                        <p className="text-xs text-slate-500">Click New Chat to begin.</p>
                    </div>
                )}
            </div>
        </section>
    );
}
