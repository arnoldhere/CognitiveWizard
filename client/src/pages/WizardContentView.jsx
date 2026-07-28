import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { getWizardContentDetail } from "../services/api";
import RoadmapDisplay from "../components/wizard/RoadmapDisplay";
import { CircularProgress } from "@mui/material";
import ScheduleIcon from "@mui/icons-material/Schedule";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

// ─── ModuleItem (mirrored from WizardModule.jsx for non-roadmap display) ─────
const ModuleItem = ({ mod }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-strong)",
        borderRadius: "16px",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
        transition: "all 0.3s",
        cursor: "pointer",
      }}
      className="wcv-hover-lift"
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "6px",
          height: "100%",
          background: "linear-gradient(to bottom, #5736C8, #1ED9F2)",
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <h3 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: "var(--text)" }}>{mod.title}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {mod.estimated_time && (
            <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.05)", padding: "4px 10px", borderRadius: "20px", color: "var(--text-light)", fontSize: "0.8rem", fontWeight: 600 }}>
              <ScheduleIcon style={{ fontSize: "1rem", marginRight: "4px" }} /> {mod.estimated_time}
            </div>
          )}
          {expanded ? <KeyboardArrowUpIcon style={{ color: "var(--text-light)" }} /> : <KeyboardArrowDownIcon style={{ color: "var(--text-light)" }} />}
        </div>
      </div>

      <p style={{ color: "var(--text-light)", fontSize: "1rem", lineHeight: 1.6, margin: expanded ? "0 0 20px" : "0" }}>
        {mod.description}
      </p>

      {expanded && mod.key_takeaways?.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <h4 style={{ margin: "0 0 8px", color: "var(--text)", fontSize: "0.95rem" }}>Key Takeaways:</h4>
          <ul style={{ margin: 0, paddingLeft: "20px", color: "#7655F6", fontSize: "0.95rem" }}>
            {mod.key_takeaways.map((k, i) => <li key={i}>{k}</li>)}
          </ul>
        </div>
      )}

      {expanded && mod.topics?.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {mod.topics.map((topic, idx) => (
            <div key={idx} style={{ background: "rgba(30, 217, 242, 0.05)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(30, 217, 242, 0.1)" }}>
              <h4 style={{ margin: "0 0 6px", color: "#1ED9F2", fontSize: "1rem", fontWeight: 700 }}>
                {topic.name || topic}
              </h4>
              {(topic.details || topic.content) && (
                <p style={{ margin: 0, color: "var(--text-light)", fontSize: "0.9rem", lineHeight: 1.5 }}>
                  {topic.details || topic.content}
                </p>
              )}
              {topic.practical_task && (
                <div style={{ marginTop: "12px", padding: "8px 12px", background: "rgba(30, 217, 242, 0.1)", borderRadius: "6px", color: "#1ED9F2", fontSize: "0.85rem", fontWeight: 600 }}>
                  <TaskAltIcon sx={{ fontSize: "1rem", marginRight: "4px", verticalAlign: "middle" }} />
                  Task: {topic.practical_task}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function WizardContentView() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchContent() {
      try {
        const result = await getWizardContentDetail(id);
        setData(result);
      } catch (err) {
        setError(err.message || "Failed to load content.");
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchContent();
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "20px" }}>
        <CircularProgress size={52} thickness={3} sx={{ color: "#1ED9F2" }} />
        <p style={{ color: "var(--text-light)", fontSize: "1.1rem" }}>Loading your content…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "16px" }}>
        <p style={{ color: "#ef4444", fontSize: "1.1rem" }}>{error}</p>
        <button
          onClick={() => window.location.reload()}
          style={{ padding: "10px 24px", borderRadius: "20px", background: "linear-gradient(135deg, #5736C8, #1ED9F2)", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer" }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const isRoadmap = (data?.content_type || "").toLowerCase() === "roadmap";

  if (isRoadmap) {
    return (
      <div style={{ animation: "fadeIn 0.5s ease", width: "100%", margin: "0 auto" }}>
        <RoadmapDisplay
          data={data}
          learningStyle={data?.content?.learning_style}
          topic={data?.topic}
          onBack={() => window.history.back()}
          onRegenerate={() => { window.opener && window.close(); window.location.href = "/wizard"; }}
        />
      </div>
    );
  }

  // ── Non-roadmap content display ────────────────────────────────────────────
  return (
    <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "6vh", paddingBottom: "10vh" }}>
      <div style={{ width: "100%", maxWidth: "800px", padding: "0 20px", animation: "fadeIn 0.5s ease" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <span style={{ display: "inline-block", background: "rgba(30, 217, 242, 0.1)", color: "#1ED9F2", padding: "6px 16px", borderRadius: "20px", fontSize: "0.85rem", fontWeight: 700, marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {data.content_type}
          </span>
          <h1 style={{ fontSize: "2.8rem", fontWeight: 900, color: "var(--text)", marginBottom: "16px", lineHeight: 1.2 }}>
            {data.content?.title || data.topic}
          </h1>
          {data.content?.description && (
            <p style={{ color: "var(--text-light)", fontSize: "1.15rem", maxWidth: "600px", margin: "0 auto", lineHeight: 1.6 }}>
              {data.content.description}
            </p>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {data.content?.modules?.map((mod, i) => (
            <ModuleItem key={i} mod={mod} />
          ))}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .wcv-hover-lift:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      ` }} />
    </section>
  );
}
