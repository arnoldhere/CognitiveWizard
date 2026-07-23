import React from "react";
import CodeIcon from "@mui/icons-material/Code";
import TerminalIcon from "@mui/icons-material/Terminal";
import LaunchIcon from "@mui/icons-material/Launch";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import TimerIcon from "@mui/icons-material/Timer";

export default function CodingSection({ topic, modules = [] }) {
  const defaultCodingDrills = [
    {
      title: `${topic || "Core"} Fundamentals Drill`,
      difficulty: "Easy",
      estimated_time: "30 mins",
      tags: ["Hands-on", "Syntax", "Basics"],
      description: `Build a small working script implementing fundamental primitives in ${topic}.`,
      platform: "Internal Drill",
    },
    {
      title: "Data Structure & Algorithm Application",
      difficulty: "Medium",
      estimated_time: "45 mins",
      tags: ["Algorithms", "Problem Solving"],
      description: `Solve challenge problems reinforcing key algorithmic structures for ${topic}.`,
      link: "https://leetcode.com/",
      platform: "LeetCode",
    },
    {
      title: "Real-World Mini Project Execution",
      difficulty: "Hard",
      estimated_time: "90 mins",
      tags: ["System Design", "Integration"],
      description: `Construct a functional end-to-end service module incorporating best practices.`,
      link: "https://www.hackerrank.com/",
      platform: "HackerRank",
    },
  ];

  return (
    <div className="learning-style-section coding-section-root">
      <div className="section-header">
        <div className="header-icon-pill coding-pill">
          <TerminalIcon sx={{ fontSize: 20 }} />
          <span>Interactive & Coding Path</span>
        </div>
        <h2>Hands-on Coding Drills & Practice Problems</h2>
        <p>
          Reinforce roadmap concepts through interactive coding challenges, external problem sets, and drills.
        </p>
      </div>

      <div className="coding-drills-grid">
        {defaultCodingDrills.map((drill, idx) => (
          <div key={idx} className="coding-card">
            <div className="coding-card-top">
              <div className="drill-platform">
                <CodeIcon sx={{ fontSize: 16 }} />
                <span>{drill.platform}</span>
              </div>
              <div className="drill-badges">
                <span className={`diff-tag ${drill.difficulty.toLowerCase()}`}>
                  {drill.difficulty}
                </span>
                <span className="time-tag">
                  <TimerIcon sx={{ fontSize: 12 }} />
                  {drill.estimated_time}
                </span>
              </div>
            </div>

            <h3 className="coding-card-title">{drill.title}</h3>
            <p className="coding-card-desc">{drill.description}</p>

            <div className="tags-row">
              {drill.tags.map((tag, tIdx) => (
                <span key={tIdx} className="drill-tag-chip">
                  #{tag}
                </span>
              ))}
            </div>

            {drill.link && (
              <a
                href={drill.link}
                target="_blank"
                rel="noopener noreferrer"
                className="drill-link-btn"
              >
                <span>Start Practice</span>
                <LaunchIcon sx={{ fontSize: 14 }} />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
