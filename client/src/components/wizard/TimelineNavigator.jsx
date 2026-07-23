import React from "react";

export default function TimelineNavigator({
  phases = [],
  activePhaseIndex = 0,
  onSelectPhase,
}) {
  return (
    <div className="timeline-nav-container">
      <div className="timeline-nav-header">
        <h3>Roadmap Timeline</h3>
        <span className="phase-count-badge">{phases.length} Phases</span>
      </div>

      {/* Desktop Vertical Timeline */}
      <div className="timeline-vertical-list">
        {phases.map((phase, idx) => {
          const isActive = activePhaseIndex === idx;

          return (
            <div
              key={idx}
              className={`timeline-step-item ${isActive ? "active" : ""}`}
              onClick={() => onSelectPhase(idx)}
            >
              <div className="timeline-step-indicator">
                <div className="indicator-icon">
                  <span>{idx + 1}</span>
                </div>
                {idx < phases.length - 1 && <div className="timeline-connector-line" />}
              </div>

              <div className="timeline-step-content">
                <div className="step-phase-number">Phase {idx + 1}</div>
                <div className="step-title">{phase.title || `Phase ${idx + 1}`}</div>
                {phase.estimatedTime && (
                  <div className="step-time">{phase.estimatedTime}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile Horizontal Timeline */}
      <div className="timeline-horizontal-scroll">
        {phases.map((phase, idx) => {
          const isActive = activePhaseIndex === idx;

          return (
            <button
              key={idx}
              className={`mobile-step-chip ${isActive ? "active" : ""}`}
              onClick={() => onSelectPhase(idx)}
            >
              <span className="chip-num">{idx + 1}</span>
              <span className="chip-label">{phase.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
