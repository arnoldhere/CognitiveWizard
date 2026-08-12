import React, { useState } from "react";
import {
  TvMinimalPlay as Youtube,
  FileText, BookOpen, GraduationCap,
  File, ExternalLink, Search, Star, Sparkles
} from "lucide-react";

const CATEGORY_MAP = {
  youtube: { label: "Videos", icon: <Youtube size={16} className="text-rose-500" /> },
  article: { label: "Articles", icon: <FileText size={16} className="text-blue-500" /> },
  official_docs: { label: "Documentation", icon: <BookOpen size={16} className="text-indigo-500" /> },
  course: { label: "Courses & Repos", icon: <GraduationCap size={16} className="text-cyan-500" /> },
  research_paper: { label: "Research Papers", icon: <File size={16} className="text-purple-500" /> },
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

  if (item.url) {
    try {
      const domain = new URL(item.url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    } catch (e) {
      // ignore
      console.log("Error parsing URL for thumbnail:", e);
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
    <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary mb-2">
            <Sparkles size={12} />
            <span>Agent Reference Retriever</span>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Curated Reference Resources</h2>
          <p className="text-slate-500 font-medium">
            Dynamic video tutorials, documentation, articles, and research papers fetched for <span className="text-slate-700 font-bold">{topic}</span>.
          </p>
        </div>

        <div className="relative shrink-0 w-full md:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium text-slate-700 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-4 mb-4 hide-scrollbar">
        {categoriesAvailable.map((catKey) => {
          const meta = CATEGORY_MAP[catKey] || { label: catKey, icon: <File size={16} /> };
          const isSelected = selectedCategory === catKey;
          const count = catKey === "all" ? allItems.length : references[catKey]?.length || 0;

          return (
            <button
              key={catKey}
              onClick={() => setSelectedCategory(catKey)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap shrink-0 ${isSelected ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
            >
              {catKey !== "all" && meta.icon}
              <span>{catKey === "all" ? "All Resources" : meta.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${isSelected ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Resource Cards Grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item, idx) => {
            const catMeta = CATEGORY_MAP[item.category] || {
              label: item.category,
              icon: <File size={14} className="text-slate-500" />,
            };

            const thumb = getResourceThumbnail(item);
            const isYoutube = item.category === "youtube" || item.url?.includes("youtube.com");

            return (
              <div key={idx} className="flex flex-col bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-lg hover:border-primary/30 transition-all group h-full">
                {thumb && (
                  <div className={`relative w-full overflow-hidden bg-slate-200 shrink-0 ${isYoutube ? 'aspect-video' : 'h-32 p-4 flex items-center justify-center'}`}>
                    <img
                      src={thumb}
                      alt={item.title}
                      className={isYoutube ? "w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" : "max-w-[64px] max-h-[64px] object-contain drop-shadow-sm transition-transform duration-500 group-hover:scale-110"}
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                    {isYoutube && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
                        <div className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                          <Youtube size={24} className="text-rose-600 ml-1" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-bold uppercase tracking-wider text-slate-600 shadow-sm">
                      {catMeta.icon}
                      <span>{catMeta.label}</span>
                    </div>
                    {item.relevance_score > 0 && (
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                        <Star size={10} className="fill-indigo-600" />
                        <span>{Math.round(item.relevance_score * 100)}% Match</span>
                      </div>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 mb-2 leading-snug line-clamp-2 group-hover:text-primary transition-colors" title={item.title}>
                    {item.title}
                  </h3>

                  {item.description && (
                    <p className="text-sm text-slate-500 line-clamp-3 mb-4 flex-1" title={item.description}>
                      {item.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-200/60">
                    <span className="text-xs font-bold text-slate-400 truncate pr-2">{item.source || "Web Reference"}</span>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm font-bold text-primary hover:text-primary/80 transition-colors shrink-0"
                      >
                        <span>Open</span>
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
          <File size={48} className="text-slate-300 mb-4" />
          <h4 className="text-xl font-bold text-slate-700 mb-2">No matching resources found</h4>
          <p className="text-slate-500 font-medium">Try adjusting your search query or switching categories.</p>
        </div>
      )}
    </div>
  );
}
