import React, { useState, useEffect } from "react";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CircularProgress from "@mui/material/CircularProgress";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlinedIcon from "@mui/icons-material/ErrorOutlined";

const LOADING_STEPS = [
  "Connecting to AI PDF Generation Engine...",
  "Formatting Roadmap Milestones & Phase Deliverables...",
  "Curating Reference Resources & Links...",
  "Applying Professional Typography & Page Layout...",
  "Finalizing High-Resolution PDF Download...",
];

export default function PdfExportModal({ isOpen, currentStepIndex, isSuccess, error, onRetry, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="pdf-modal-backdrop no-print">
      <div className="pdf-modal-card">
        {!error && !isSuccess && (
          <div className="pdf-modal-content">
            <div className="pdf-icon-pulse-wrapper">
              <div className="pulse-ring" />
              <PictureAsPdfIcon sx={{ fontSize: 44, color: "#ef4444" }} />
              <AutoAwesomeIcon className="sparkle-icon" sx={{ fontSize: 20, color: "#a855f7" }} />
            </div>

            <h3 className="pdf-modal-title">Preparing Your PDF Document</h3>

            <div className="pdf-loading-message">
              <CircularProgress size={20} sx={{ color: "#06b6d4" }} />
              <span>{LOADING_STEPS[Math.min(currentStepIndex, LOADING_STEPS.length - 1)]}</span>
            </div>

            <div className="pdf-progress-bar-bg">
              <div
                className="pdf-progress-bar-fill"
                style={{ width: `${Math.min(((currentStepIndex + 1) / LOADING_STEPS.length) * 100, 95)}%` }}
              />
            </div>

            <p className="pdf-modal-hint">Please wait a moment while your roadmap PDF is being generated.</p>
          </div>
        )}

        {isSuccess && (
          <div className="pdf-modal-content">
            <div className="success-icon-wrapper">
              <CheckCircleIcon sx={{ fontSize: 56, color: "#10b981" }} />
            </div>
            <h3 className="pdf-modal-title">PDF Download Ready!</h3>
            <p className="pdf-modal-hint">Your roadmap PDF has been generated and downloaded successfully.</p>
          </div>
        )}

        {error && (
          <div className="pdf-modal-content">
            <div className="error-icon-wrapper">
              <ErrorOutlinedIcon sx={{ fontSize: 56, color: "#ef4444" }} />
            </div>
            <h3 className="pdf-modal-title">PDF Generation Error</h3>
            <p className="pdf-modal-hint">{error}</p>
            <div className="pdf-modal-actions">
              <button className="pdf-modal-btn retry" onClick={onRetry}>
                Try Again
              </button>
              <button className="pdf-modal-btn cancel" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
