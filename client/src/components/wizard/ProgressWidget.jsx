import React from "react";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import FlagIcon from "@mui/icons-material/Flag";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

export default function ProgressWidget({
  completedCount = 0,
  totalCount = 0,
  nextPhaseTitle,
  onContinueLearning,
}) {
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="progress-widget-root">
      <div className="progress-widget-header">
        <TrendingUpIcon sx={{ color: "#1ED9F2", fontSize: 20 }} />
        <h3>Your Learning Progress</h3>
      </div>

      <div className="progress-gauge-container">
        <div className="progress-circle-outer">
          <svg className="progress-svg" viewBox="0 0 100 100">
            <circle className="progress-bg-circle" cx="50" cy="50" r="42" />
            <circle
              className="progress-fill-circle"
              cx="50"
              cy="50"
              r="42"
              style={{
                strokeDasharray: 264,
                strokeDashoffset: 264 - (264 * percent) / 100,
              }}
            />
          </svg>
          <div className="progress-circle-text">
            <span className="percent-num">{percent}%</span>
            <span className="percent-label">Complete</span>
          </div>
        </div>

        <div className="progress-stats-column">
          <div className="stat-row">
            <span className="stat-label">Completed</span>
            <span className="stat-val">{completedCount} of {totalCount}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Remaining</span>
            <span className="stat-val">{totalCount - completedCount} Phases</span>
          </div>
        </div>
      </div>

      {nextPhaseTitle && percent < 100 && (
        <div className="next-task-box">
          <div className="box-title">
            <FlagIcon sx={{ fontSize: 14, color: "#7655F6" }} />
            <span>Next Target</span>
          </div>
          <div className="next-phase-name">{nextPhaseTitle}</div>
        </div>
      )}

      {percent === 100 && (
        <div className="congrats-box">
          <CheckCircleIcon sx={{ color: "#1ED9F2", fontSize: 20 }} />
          <span>Congratulations! You completed this roadmap!</span>
        </div>
      )}

      {onContinueLearning && percent < 100 && (
        <button className="continue-learning-btn" onClick={onContinueLearning}>
          <span>Continue Learning</span>
          <ArrowForwardIcon fontSize="small" />
        </button>
      )}
    </div>
  );
}
