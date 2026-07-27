import React from "react";
import DownloadIcon from "@mui/icons-material/Download";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PsychologyIcon from "@mui/icons-material/Psychology";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import VerifiedIcon from "@mui/icons-material/Verified";

export default function RoadmapHero({
  title,
  description,
  goal,
  totalDuration,
  difficulty,
  learningStyle,
  prerequisites = [],
  outcomes = [],
  totalPhases = 0,
  onExplorePhases,
  onExportPdf,
  isSaved,
  onToggleSave,
}) {
  const hasPrereqs = Array.isArray(prerequisites) && prerequisites.length > 0;
  const hasOutcomes = Array.isArray(outcomes) && outcomes.length > 0;

  return (
    <div className="roadmap-hero-card">
      <div className="hero-gradient-overlay" />

      <div className="hero-top-row">
        <div className="hero-badge-group">
          <span className="hero-pill style-pill">
            <PsychologyIcon sx={{ fontSize: 16 }} />
            {learningStyle || "Visual & Project-based"}
          </span>
          <span className="hero-pill difficulty-pill">
            <LocalFireDepartmentIcon sx={{ fontSize: 16 }} />
            {difficulty || "Intermediate"}
          </span>
        </div>
      </div>

      <h1 className="hero-title">{title || "Personalized AI Roadmap"}</h1>
      <p className="hero-description">
        {description ||
          "A structured milestone roadmap curated with AI and enhanced with reference resources."}
      </p>

      <div className="hero-meta-grid">
        <div className="hero-meta-item">
          <TrackChangesIcon className="meta-icon" />
          <div>
            <div className="meta-label">Primary Goal</div>
            <div className="meta-value">{goal || "Master Core Concepts"}</div>
          </div>
        </div>

        <div className="hero-meta-item">
          <AccessTimeIcon className="meta-icon" />
          <div>
            <div className="meta-label">Estimated Duration</div>
            <div className="meta-value">{totalDuration || "4-6 Weeks"}</div>
          </div>
        </div>

        <div className="hero-meta-item">
          <FormatListNumberedIcon className="meta-icon" />
          <div>
            <div className="meta-label">Total Phases</div>
            <div className="meta-value">{totalPhases} Learning Milestones</div>
          </div>
        </div>
      </div>

      {(hasPrereqs || hasOutcomes) && (
        <div className="hero-req-outcomes-grid">
          {hasPrereqs && (
            <div className="hero-info-box prereq-box">
              <div className="info-box-header">
                <AssignmentTurnedInIcon sx={{ fontSize: 18, color: "#0666d9" }} />
                <span>Prerequisites</span>
              </div>
              <div className="prereq-pills">
                {prerequisites.map((req, idx) => (
                  <span key={idx} className="prereq-chip">
                    • {typeof req === "string" ? req : req.title || req.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {hasOutcomes && (
            <div className="hero-info-box outcomes-box">
              <div className="info-box-header">
                <VerifiedIcon sx={{ fontSize: 18, color: "#10b981" }} />
                <span>Expected Outcomes</span>
              </div>
              <ul className="outcomes-list">
                {outcomes.map((out, idx) => (
                  <li key={idx}>
                    <span className="outcome-bullet">✓</span>
                    <span>{typeof out === "string" ? out : out.title || out.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="hero-actions">
        {onExplorePhases && (
          <button className="hero-btn-primary" onClick={onExplorePhases}>
            <ArrowDownwardIcon fontSize="small" />
            <span>Explore Milestones</span>
          </button>
        )}

        <button className="hero-btn-secondary" onClick={onExportPdf}>
          <DownloadIcon fontSize="small" />
          <span>Download PDF</span>
        </button>
      </div>
    </div>
  );
}
