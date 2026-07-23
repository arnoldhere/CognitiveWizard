import React, { useState } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import ShareIcon from "@mui/icons-material/Share";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckIcon from "@mui/icons-material/Check";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

export default function RoadmapHeader({
  title,
  onBack,
  onRegenerate,
  onExportPdf,
}) {


  return (
    <header className="roadmap-header-root">
      <div className="roadmap-header-left">
        {onBack && (
          <button
            onClick={onBack}
            className="roadmap-btn-icon"
            title="Back to generator"
          >
            <ArrowBackIcon fontSize="small" />
            <span className="btn-text">Back</span>
          </button>
        )}
        <div className="roadmap-header-title-group">
          <div className="agent-badge">
            <AutoAwesomeIcon sx={{ fontSize: 14 }} />
            <span>Agent Enriched</span>
          </div>
          <h1 className="roadmap-header-title">{title || "AI Learning Roadmap"}</h1>
        </div>
      </div>

      <div className="roadmap-header-actions">
        <button
          onClick={onExportPdf}
          className="roadmap-btn-secondary"
          title="Export as PDF / Print"
        >
          <PictureAsPdfIcon fontSize="small" />
          <span>Export PDF</span>
        </button>

        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="roadmap-btn-primary"
            title="Regenerate with AI"
          >
            <RefreshIcon fontSize="small" />
            <span>Regenerate</span>
          </button>
        )}
      </div>
    </header>
  );
}
