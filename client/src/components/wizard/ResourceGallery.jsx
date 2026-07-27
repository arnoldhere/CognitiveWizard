import React, { useState } from "react";
import YouTubeIcon from "@mui/icons-material/YouTube";
import ArticleIcon from "@mui/icons-material/Article";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SchoolIcon from "@mui/icons-material/School";
import DescriptionIcon from "@mui/icons-material/Description";
import LaunchIcon from "@mui/icons-material/Launch";
import SearchIcon from "@mui/icons-material/Search";
import StarIcon from "@mui/icons-material/Star";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

const CATEGORY_MAP = {
  youtube: { label: "Videos", icon: <YouTubeIcon sx={{ color: "#ef4444" }} /> },
  article: { label: "Articles", icon: <ArticleIcon sx={{ color: "#148CFF" }} /> },
  official_docs: { label: "Documentation", icon: <MenuBookIcon sx={{ color: "#7655F6" }} /> },
  course: { label: "Courses & Repos", icon: <SchoolIcon sx={{ color: "#1ED9F2" }} /> },
  research_paper: { label: "Research Papers", icon: <DescriptionIcon sx={{ color: "#A38CFF" }} /> },
};

function getYoutubeThumbnail(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (match && match[1]) {
    return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
  }
  return null;
}

function getResourceThumbnail(item) {
  if (item.image) return item.image;

  if (item.category === "youtube" || item.url?.includes("youtube.com") || item.url?.includes("youtu.be")) {
    const ytThumb = getYoutubeThumbnail(item.url);
    if (ytThumb) return ytThumb;
  }

  // Favicon fallback for articles / docs / research papers
  if (item.url) {
    try {
      const domain = new URL(item.url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    } catch (e) {
      // ignore
    }
  }

  return null;
}

function truncateText(text, maxLength = 125) {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

export default function ResourceGallery({ topic, references = {} }) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Flatten all references into an array with category tags
  const allItems = [];
  Object.keys(references).forEach((cat) => {
    const list = references[cat];
    if (Array.isArray(list)) {
      list.forEach((item) => {
        allItems.push({
          ...item,
          category: cat,
        });
      });
    }
  });

  const categoriesAvailable = ["all", ...Object.keys(references).filter((cat) => references[cat]?.length > 0)];

  const filteredItems = allItems.filter((item) => {
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.source?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="resource-gallery-root">
      <div className="gallery-header">
        <div className="gallery-title-group">
          <div className="agent-tag">
            <AutoAwesomeIcon sx={{ fontSize: 14 }} />
            <span>Agent Reference Retriever</span>
          </div>
          <h2>Curated Reference Resources</h2>
          <p>
            Dynamic video tutorials, documentation, articles, and research papers fetched for {topic}.
          </p>
        </div>

        <div className="gallery-search-bar">
          <SearchIcon sx={{ color: "var(--text-light)" }} />
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="gallery-tabs">
        {categoriesAvailable.map((catKey) => {
          const meta = CATEGORY_MAP[catKey] || { label: catKey, icon: null };
          const isSelected = selectedCategory === catKey;
          const count = catKey === "all" ? allItems.length : references[catKey]?.length || 0;

          return (
            <button
              key={catKey}
              className={`gallery-tab-btn ${isSelected ? "active" : ""}`}
              onClick={() => setSelectedCategory(catKey)}
            >
              {meta.icon}
              <span>{catKey === "all" ? "All Resources" : meta.label}</span>
              <span className="tab-count-badge">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Resource Cards Grid */}
      {filteredItems.length > 0 ? (
        <div className="gallery-grid">
          {filteredItems.map((item, idx) => {
            const catMeta = CATEGORY_MAP[item.category] || {
              label: item.category,
              icon: <DescriptionIcon />,
            };

            const thumb = getResourceThumbnail(item);
            const isYoutube = item.category === "youtube" || item.url?.includes("youtube.com");

            return (
              <div key={idx} className="resource-card">
                {/* Thumbnail Image Header if available */}
                {thumb && (
                  <div className={`resource-thumb-box ${isYoutube ? "yt-thumb" : ""}`}>
                    <img
                      src={thumb}
                      alt={item.title}
                      className="resource-thumb-img"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                    {isYoutube && (
                      <div className="play-badge">
                        <YouTubeIcon sx={{ color: "#ef4444", fontSize: 28 }} />
                      </div>
                    )}
                  </div>
                )}

                <div className="resource-card-top">
                  <div className="resource-cat-badge">
                    {catMeta.icon}
                    <span>{catMeta.label}</span>
                  </div>
                  {item.relevance_score > 0 && (
                    <div className="resource-score-pill">
                      <StarIcon sx={{ fontSize: 12, color: "#A38CFF" }} />
                      <span>{Math.round(item.relevance_score * 100)}% Match</span>
                    </div>
                  )}
                </div>

                <h3 className="resource-title" title={item.title}>
                  {truncateText(item.title, 70)}
                </h3>

                {item.description && (
                  <p className="resource-desc" title={item.description}>
                    {truncateText(item.description, 120)}
                  </p>
                )}

                <div className="resource-footer">
                  <span className="resource-source">{item.source || "Web Reference"}</span>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="resource-open-btn"
                    >
                      <span>Open Link</span>
                      <LaunchIcon sx={{ fontSize: 14 }} />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="gallery-empty-state">
          <DescriptionIcon sx={{ fontSize: 40, color: "var(--text-light)" }} />
          <h4>No matching resources found</h4>
          <p>Try adjusting your search query or switching categories.</p>
        </div>
      )}
    </div>
  );
}
