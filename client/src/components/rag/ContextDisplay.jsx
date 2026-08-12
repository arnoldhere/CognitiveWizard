import { useState } from "react";
import { Trash2, RefreshCw } from "lucide-react";
import ErrorMessage from "../utils/ErrorMessage";
import { deleteRagDocument } from "../../services/rag";

export default function ContextDisplay({ status, loading, error, onRefresh }) {
  const isReady = Boolean(status?.ready_for_rag);
  const recentChunks = status?.recent_chunks ?? [];
  const uploadedDocuments = status?.uploaded_documents ?? [];
  const [deleteError, setDeleteError] = useState("");
  const [deletingDocuments, setDeletingDocuments] = useState(new Set());
  const [optimisticDeletedDocuments, setOptimisticDeletedDocuments] = useState(new Set());

  const handleDeleteDocument = async (documentName) => {
    const confirmed = window.confirm(
      `Delete '${documentName}' from your knowledge base? This will remove the stored embeddings, metadata, and uploaded file.`
    );
    if (!confirmed) {
      return;
    }

    setDeleteError("");
    setDeletingDocuments((prev) => new Set(prev).add(documentName));
    setOptimisticDeletedDocuments((prev) => new Set(prev).add(documentName));

    try {
      await deleteRagDocument(documentName);
      if (onRefresh) {
        await onRefresh();
      }
      setOptimisticDeletedDocuments(new Set());
    } catch (err) {
      setOptimisticDeletedDocuments((prev) => {
        const next = new Set(prev);
        next.delete(documentName);
        return next;
      });
      setDeleteError(err.message || "Failed to delete document.");
    } finally {
      setDeletingDocuments((prev) => {
        const next = new Set(prev);
        next.delete(documentName);
        return next;
      });
    }
  };

  const visibleDocuments = uploadedDocuments.filter(
    (doc) => !optimisticDeletedDocuments.has(doc),
  );

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold text-dark mb-1">Your Retrieval Context</h2>
        <p className="text-sm text-slate-500">Only your uploaded files are indexed here and used for your own RAG answers.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Mode</span>
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${isReady ? "bg-cyan-100 text-cyan-700" : "bg-slate-200 text-slate-700"}`}>
            {isReady ? "Private RAG" : "LLM Fallback"}
          </span>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Docs</span>
          <span className="text-lg font-black text-dark">{status?.documents_ingested ?? 0}</span>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Chunks</span>
          <span className="text-lg font-black text-dark">{status?.chunks_ingested ?? 0}</span>
        </div>
      </div>

      <button 
        type="button" 
        onClick={onRefresh} 
        disabled={loading}
        className="flex items-center justify-center gap-2 w-full py-2 rounded-xl font-semibold text-sm border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
      >
        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        {loading ? "Refreshing..." : "Refresh Context"}
      </button>

      {error ? <ErrorMessage message={error} /> : null}

      <div>
        <h3 className="text-sm font-bold text-dark mb-3">Upload History</h3>
        {visibleDocuments.length ? (
          <ul className="flex flex-col gap-2">
            {visibleDocuments.map((doc, index) => (
              <li key={`${doc}-${index}`} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50">
                <span className="text-sm font-medium text-slate-700 truncate min-w-0 flex-1" title={doc}>{doc}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteDocument(doc)}
                  disabled={deletingDocuments.has(doc) || optimisticDeletedDocuments.has(doc)}
                  title={`Delete ${doc}`}
                  className="flex items-center gap-1 shrink-0 px-2 py-1 rounded-md text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 size={12} />
                  <span>{optimisticDeletedDocuments.has(doc) ? "Deleting" : "Delete"}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500 italic bg-slate-50 p-4 rounded-xl text-center border border-dashed border-slate-200">No documents uploaded yet.</p>
        )}
      </div>

      {deleteError ? <ErrorMessage message={deleteError} /> : null}

      <div>
        <h3 className="text-sm font-bold text-dark mb-3">Recent Chunks</h3>
        {recentChunks.length ? (
          <ul className="flex flex-col gap-2">
            {recentChunks.map((chunk, index) => (
              <li key={`${chunk.slice(0, 32)}-${index}`} className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 line-clamp-3">
                {chunk}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500 italic bg-slate-50 p-4 rounded-xl text-center border border-dashed border-slate-200">
            No chunks yet. Upload a file to enable retrieval-grounded answers.
          </p>
        )}
      </div>
    </section>
  );
}
