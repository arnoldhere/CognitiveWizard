import React, { useState } from "react";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import ScheduleIcon from "@mui/icons-material/Schedule";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import CodeIcon from "@mui/icons-material/Code";

export default function PhaseCard({
  phaseIndex,
  phase,
  defaultExpanded = true,
  cardRef,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const topics = phase.topics || [];
  const deliverables = phase.deliverables || phase.practical_tasks || [];

  return (
    <div
      ref={cardRef}
      id={`phase-card-${phaseIndex}`}
      className={`phase-card-root ${expanded ? "is-expanded" : ""}`}
    >
      <div className="phase-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="phase-header-left">
          <div className="phase-title-meta">
            <div className="phase-number-tag">Phase {phaseIndex + 1}</div>
            <h3 className="phase-title">{phase.title}</h3>
          </div>
        </div>

        <div className="phase-header-right">
          {phase.estimatedTime && (
            <div className="phase-time-pill">
              <ScheduleIcon sx={{ fontSize: 14 }} />
              <span>{phase.estimatedTime}</span>
            </div>
          )}
          {phase.difficulty && (
            <div className="phase-diff-pill">{phase.difficulty}</div>
          )}
          <button className="expand-btn" aria-label="Toggle details">
            {expanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="phase-card-body">
          {phase.description && (
            <p className="phase-description">{phase.description}</p>
          )}

          {/* Topics & Concepts */}
          {topics.length > 0 && (
            <div className="phase-section">
              <div className="phase-section-title">
                <LightbulbIcon sx={{ fontSize: 18, color: "#A38CFF" }} />
                <span>Key Concepts & Objectives</span>
              </div>

              <div className="topics-grid">
                {topics.map((topic, tIdx) => (
                  <div key={tIdx} className="topic-card">
                    <div className="topic-card-header">
                      <h4 className="topic-name">{topic.name || topic.title || topic}</h4>
                      {topic.importance && (
                        <span className="importance-badge">{topic.importance}</span>
                      )}
                    </div>
                    {(topic.details || topic.description || topic.content) && (
                      <p className="topic-details">
                        {topic.details || topic.description || topic.content}
                      </p>
                    )}
                    {topic.practical_task && (
                      <div className="topic-task-pill">
                        <CodeIcon sx={{ fontSize: 14 }} />
                        <span>Task: {topic.practical_task}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deliverables / Practical Outcomes */}
          {deliverables.length > 0 && (
            <div className="phase-section">
              <div className="phase-section-title">
                <TaskAltIcon sx={{ fontSize: 18, color: "#1ED9F2" }} />
                <span>Phase Deliverables</span>
              </div>
              <ul className="deliverables-list">
                {deliverables.map((item, dIdx) => (
                  <li key={dIdx}>
                    <CheckCircleIcon sx={{ fontSize: 14, color: "#1ED9F2" }} />
                    <span>{typeof item === "string" ? item : item.title || item.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
