import { useState } from "react";
import { Delete } from "@mui/icons-material";
import ErrorMessage from "../utils/ErrorMessage";
import { deleteRagDocument } from "../../services/rag";
import "../../styles/ContextDisplay.css";

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
    <section className="rag-panel context-display">
      <div className="rag-panel-header">
        <h2>Your Retrieval Context</h2>
        <p>Only your uploaded files are indexed here and used for your own RAG answers.</p>
      </div>

      <div className="context-stats-grid">
        <article className="context-stat-card">
          <span className="context-stat-label">Mode</span>
          <span className={`context-stat-value ${isReady ? "is-ready" : "is-fallback"}`}>
            {isReady ? "Private RAG" : "LLM Fallback"}
          </span>
        </article>
        <article className="context-stat-card">
          <span className="context-stat-label">Documents</span>
          <span className="context-stat-value">{status?.documents_ingested ?? 0}</span>
        </article>
        <article className="context-stat-card">
          <span className="context-stat-label">Chunks</span>
          <span className="context-stat-value">{status?.chunks_ingested ?? 0}</span>
        </article>
      </div>

      <div className="context-actions">
        <button type="button" onClick={onRefresh} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh Context"}
        </button>
      </div>

      {error ? <ErrorMessage message={error} /> : null}

      <div className="context-uploads">
        <h3>Upload History</h3>
        {visibleDocuments.length ? (
          <ul className="document-list">
            {visibleDocuments.map((doc, index) => (
              <li key={`${doc}-${index}`} className="document-item">
                <span className="doc-name">{doc}</span>
                <button
                  type="button"
                  className="doc-delete"
                  onClick={() => handleDeleteDocument(doc)}
                  disabled={deletingDocuments.has(doc) || optimisticDeletedDocuments.has(doc)}
                  aria-label={`Delete ${doc}`}
                >
                  <span className="doc-delete-icon" aria-hidden="true">
                    <Delete fontSize="small" />
                  </span>
                  <span>{optimisticDeletedDocuments.has(doc) ? "Deleting..." : "Delete"}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="context-placeholder">No documents uploaded yet.</p>
        )}
      </div>

      {deleteError ? <ErrorMessage message={deleteError} /> : null}

      <div className="context-recent">
        <h3>Recent Chunks</h3>
        {recentChunks.length ? (
          <ul>
            {recentChunks.map((chunk, index) => (
              <li key={`${chunk.slice(0, 32)}-${index}`}>{chunk}</li>
            ))}
          </ul>
        ) : (
          <p className="context-placeholder">
            No chunks yet. Upload a file to enable retrieval-grounded answers.
          </p>
        )}
      </div>
    </section>
  );
}
