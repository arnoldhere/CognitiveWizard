import React from "react";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import LaunchIcon from "@mui/icons-material/Launch";
import DescriptionIcon from "@mui/icons-material/Description";
import ArticleIcon from "@mui/icons-material/Article";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import StarIcon from "@mui/icons-material/Star";

export default function ReadingSection({ topic, references = {} }) {
  const articles = references.article || [];
  const docs = references.official_docs || [];
  const papers = references.research_paper || [];

  const allReadingResources = [...articles, ...docs, ...papers];

  const defaultReadingCards = [
    {
      title: `${topic || "Subject"} Official Documentation & Guides`,
      source: "Official Docs",
      description: `Comprehensive reference manual and core specification guides for ${topic}.`,
      url: `https://www.google.com/search?q=${encodeURIComponent(topic || "")}+official+documentation`,
      relevance_score: 0.98,
    },
    {
      title: `Deep-Dive Architecture & Research Notes on ${topic || "Core Concepts"}`,
      source: "Research Papers & Articles",
      description: `In-depth technical papers and blog articles detailing best practices and underlying algorithms.`,
      url: `https://scholar.google.com/scholar?q=${encodeURIComponent(topic || "")}`,
      relevance_score: 0.94,
    },
  ];

  const displayList = allReadingResources.length > 0 ? allReadingResources : defaultReadingCards;

  return (
    <div className="learning-style-section reading-section-root">
      <div className="section-header">
        <div className="header-icon-pill reading-pill">
          <MenuBookIcon sx={{ fontSize: 20 }} />
          <span>Theoretical & Reading Path</span>
        </div>
        <h2>Curated Reading, Docs & Research Papers</h2>
        <p>
          Master theoretical foundations with authoritative documentation, articles, and research papers for {topic}.
        </p>
      </div>

      <div className="reading-cards-grid">
        {displayList.map((item, idx) => (
          <div key={idx} className="reading-card">
            <div className="reading-card-header">
              <div className="source-badge">
                <DescriptionIcon sx={{ fontSize: 14 }} />
                <span>{item.source || "Curated Reference"}</span>
              </div>
              {item.relevance_score && (
                <div className="score-badge">
                  <StarIcon sx={{ fontSize: 12, color: "#A38CFF" }} />
                  <span>{Math.round(item.relevance_score * 100)}% match</span>
                </div>
              )}
            </div>

            <h3 className="reading-card-title">{item.title}</h3>
            {item.description && (
              <p className="reading-card-desc">{item.description}</p>
            )}

            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="open-link-btn"
              >
                <span>Read Reference</span>
                <LaunchIcon sx={{ fontSize: 14 }} />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
