import ErrorMessage from "../utils/ErrorMessage";
import "../../styles/ContextDisplay.css";

export default function ContextDisplay({ status, loading, error, onRefresh }) {
  const isReady = Boolean(status?.ready_for_rag);
  const recentChunks = status?.recent_chunks ?? [];

  return (
    <section className="rag-panel context-display">
      <div className="rag-panel-header">
        <h2>RAG Context Status</h2>
        <p>Monitor ingestion health and currently available context.</p>
      </div>

      <div className="context-stats-grid">
        <article className="context-stat-card">
          <span className="context-stat-label">Mode</span>
          <span className={`context-stat-value ${isReady ? "is-ready" : "is-fallback"}`}>
            {isReady ? "RAG Ready" : "Fallback LLM"}
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
