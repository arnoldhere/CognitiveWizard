import React from "react";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import StarIcon from "@mui/icons-material/Star";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";

export default function CapstoneSection({ topic, capstoneData }) {
  const capstone = capstoneData || {
    title: `Full-Stack ${topic || "Project"} Capstone Showcase`,
    description: `Synthesize everything you have learned throughout this roadmap into a production-ready application and open-source project.`,
    skills: ["System Architecture", "Best Practices", "End-to-End Build", "Documentation"],
    deliverables: [
      "Working live application demo or open-source repository",
      "Comprehensive README.md with setup guide & architecture diagram",
      "Suite of unit and integration tests verifying functionality",
    ],
    bonus_features: [
      "Deploy to cloud platform (Vercel / Render / AWS)",
      "Add interactive UI dashboard or CLI interface",
    ],
  };

  return (
    <div className="capstone-section-root">
      <div className="capstone-banner-header">
        <div className="capstone-icon-badge">
          <RocketLaunchIcon sx={{ fontSize: 24, color: "#a855f7" }} />
        </div>
        <div>
          <div className="capstone-tag">Final Mastery Outcome</div>
          <h2 className="capstone-title">{capstone.title}</h2>
        </div>
      </div>

      <p className="capstone-desc">{capstone.description}</p>

      {/* Skills Pill Row */}
      {capstone.skills && capstone.skills.length > 0 && (
        <div className="capstone-group">
          <div className="group-label">Skills Applied</div>
          <div className="skills-pill-row">
            {capstone.skills.map((skill, sIdx) => (
              <span key={sIdx} className="skill-pill">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Deliverables */}
      {capstone.deliverables && capstone.deliverables.length > 0 && (
        <div className="capstone-group">
          <div className="group-label">Required Deliverables</div>
          <ul className="capstone-list">
            {capstone.deliverables.map((item, dIdx) => (
              <li key={dIdx}>
                <TaskAltIcon sx={{ fontSize: 16, color: "#10b981" }} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Bonus Features */}
      {capstone.bonus_features && capstone.bonus_features.length > 0 && (
        <div className="capstone-group">
          <div className="group-label">Bonus Showcase Goals</div>
          <ul className="capstone-list bonus">
            {capstone.bonus_features.map((item, bIdx) => (
              <li key={bIdx}>
                <StarIcon sx={{ fontSize: 16, color: "#f59e0b" }} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
