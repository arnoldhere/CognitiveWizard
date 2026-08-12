import { useState, useMemo } from "react";
import {
  Link as LinkIcon,
  TvMinimalPlay as Youtube,
  Upload,
  Sparkles,
  CheckCircle2,
  Lightbulb,
  TrendingUp,
  Copy,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { summarizeContent, uploadSummaryFile } from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Parse summary text into structured content with paragraphs, lists, and emphasis
 */
const parseSummaryContent = (text) => {
  const sections = [];
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim());

  paragraphs.forEach((para) => {
    const trimmed = para.trim();
    if (!trimmed) return;

    if (/^[\s]*[-\u2022*]\s/.test(trimmed) || /^\d+[.)]\s/.test(trimmed)) {
      const items = trimmed.split(/\n/).filter((i) => i.trim());
      sections.push({
        type: "list",
        items: items.map((item) =>
          item.replace(/^[\s]*[-\u2022*\d.)]\s+/, "").trim()
        ),
      });
    } else {
      sections.push({ type: "paragraph", content: trimmed });
    }
  });

  return sections;
};

/**
 * Enhanced summary display
 */
const SummaryDisplay = ({ summary, mode, tokenUsage }) => {
  const sections = useMemo(() => parseSummaryContent(summary), [summary]);
  const [copied, setCopied] = useState(false);

  const modeConfig = {
    concise: {
      icon: <Lightbulb size={24} className="text-amber-500" />,
      title: "Quick Insight",
      subtitle: "Ultra-concise summary",
      bgClass: "bg-amber-50 border-amber-200",
      iconBgClass: "bg-amber-100 border-amber-200",
      markerClass: "text-amber-500",
    },
    brief: {
      icon: <CheckCircle2 size={24} className="text-primary" />,
      title: "Brief Overview",
      subtitle: "Key points summary",
      bgClass: "bg-blue-50 border-blue-200",
      iconBgClass: "bg-blue-100 border-blue-200",
      markerClass: "text-primary",
    },
    summary: {
      icon: <TrendingUp size={24} className="text-cyan-500" />,
      title: "Main Summary",
      subtitle: "Balanced overview",
      bgClass: "bg-cyan-50 border-cyan-200",
      iconBgClass: "bg-cyan-100 border-cyan-200",
      markerClass: "text-cyan-500",
    },
    detailed: {
      icon: <Sparkles size={24} className="text-indigo-500" />,
      title: "Detailed Analysis",
      subtitle: "Comprehensive summary",
      bgClass: "bg-indigo-50 border-indigo-200",
      iconBgClass: "bg-indigo-100 border-indigo-200",
      markerClass: "text-indigo-500",
    },
  };

  const config = modeConfig[mode] || modeConfig.brief;

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mt-10"
    >
      <div className={`p-6 md:p-10 rounded-3xl bg-white/90 backdrop-blur-xl border ${config.bgClass} shadow-xl`}>
        {/* HEADER */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-200/60">
          <div className={`p-3 rounded-2xl border ${config.iconBgClass} flex items-center justify-center shrink-0`}>
            {config.icon}
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{config.title}</h3>
            <p className="text-sm font-bold text-slate-500">{config.subtitle}</p>
          </div>
        </div>

        {/* CONTENT */}
        <div className="space-y-6">
          {sections.map((section, idx) => (
            <div key={idx}>
              {section.type === "paragraph" ? (
                <p className="text-slate-700 text-lg leading-relaxed">
                  {section.content.split(/(\*\*.*?\*\*)/g).map((part, i) =>
                    part.startsWith("**") ? (
                      <strong key={i} className="font-extrabold text-slate-900">
                        {part.replace(/\*\*/g, "")}
                      </strong>
                    ) : (
                      part
                    )
                  )}
                </p>
              ) : (
                <ul className="space-y-3 pl-2">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-700 text-lg leading-relaxed">
                      <span className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 ${config.markerClass} bg-current`} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* FOOTER STATS */}
        <hr className="my-8 border-slate-200/60" />
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            {summary.split(/\s+/).length} words · {sections.length} sections
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {tokenUsage && (
              <div className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 tracking-wider">
                TOKENS: <span className="text-primary">{tokenUsage.input_tokens || tokenUsage.prompt_tokens || 0}</span> IN / <span className="text-indigo-500">{tokenUsage.output_tokens || tokenUsage.completion_tokens || 0}</span> OUT
              </div>
            )}
            <button
              onClick={handleCopy}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm ${copied
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-primary hover:border-primary/30'
                }`}
            >
              <Copy size={16} />
              {copied ? "Copied!" : "Copy Summary"}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function SummarizerPage() {
  const [source, setSource] = useState("file");
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState("");
  const [youtube, setYoutube] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [tokenUsage, setTokenUsage] = useState(null);
  const [mode, setMode] = useState("brief");

  const handleTabChange = (newValue) => {
    setSource(newValue);
    setError("");
    setFile(null);
    setUrl("");
    setYoutube("");
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    if (
      ![
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ].includes(selected.type)
    ) {
      return setError("Only PDF & DOCX allowed");
    }

    if (selected.size > MAX_FILE_SIZE) {
      return setError("File must be under 50MB");
    }

    setError("");
    setFile(selected);
  };

  const handleSubmit = async () => {
    setError("");
    setSummary("");
    setTokenUsage(null);

    if (source === "file" && !file) return setError("Upload a document");
    if (source === "url" && !url.trim()) return setError("Enter a URL");
    if (source === "youtube" && !youtube.trim())
      return setError("Enter YouTube link");

    setLoading(true);

    try {
      let response;
      const model_mode = "api";

      if (source === "file") {
        response = await uploadSummaryFile(file, mode, model_mode);
      } else {
        response = await summarizeContent({
          input_type: source === "url" ? "url" : "youtube",
          source: source === "url" ? url : youtube,
          mode,
          model_mode,
        });
      }

      if (response?.status === "success") {
        setSummary(response.data.summary);
        setTokenUsage(response.data.token_usage);
      } else {
        console.log("API Error:", response);
        setError(response?.detail || "Unexpected error");
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to generate summary. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 md:py-20 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* PAGE HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-primary/10 to-cyan-500/10 border border-primary/20 rounded-full text-xs font-bold uppercase tracking-widest text-primary mb-4">
            <Sparkles size={14} />
            AI-Powered · Quick Study
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-900 via-primary to-cyan-500 mb-4 tracking-tight leading-tight">
            AI Summarizer
          </h1>
          <p className="text-lg md:text-xl text-slate-500 font-medium max-w-2xl mx-auto">
            Turn long content into powerful insights — instantly
          </p>
        </motion.div>

        {/* MAIN CARD */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white/80 backdrop-blur-2xl border border-slate-200 rounded-[2rem] p-6 md:p-10 shadow-2xl shadow-primary/5"
        >
          {/* TABS */}
          <div className="flex border-b border-slate-200 mb-8">
            <button
              onClick={() => handleTabChange("file")}
              className={`flex-1 flex items-center justify-center gap-2 py-4 font-bold transition-all border-b-2 ${source === "file" ? "text-primary border-primary" : "text-slate-500 border-transparent hover:text-slate-700"}`}
            >
              <Upload size={18} /> Document
            </button>
            <button
              onClick={() => handleTabChange("url")}
              className={`flex-1 flex items-center justify-center gap-2 py-4 font-bold transition-all border-b-2 ${source === "url" ? "text-primary border-primary" : "text-slate-500 border-transparent hover:text-slate-700"}`}
            >
              <LinkIcon size={18} /> URL
            </button>
            <button
              onClick={() => handleTabChange("youtube")}
              className={`flex-1 flex items-center justify-center gap-2 py-4 font-bold transition-all border-b-2 ${source === "youtube" ? "text-primary border-primary" : "text-slate-500 border-transparent hover:text-slate-700"}`}
            >
              <Youtube size={18} /> YouTube
            </button>
          </div>

          <div className="space-y-8">
            {/* FILE DROP ZONE */}
            {source === "file" && (
              <div className="relative border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 rounded-3xl p-10 text-center cursor-pointer transition-colors group">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  title=""
                />
                <div className="flex flex-col items-center justify-center pointer-events-none">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-md mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Upload size={32} className="text-cyan-500" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">Click or drag file to upload</h3>
                  <p className="text-sm font-medium text-slate-500 mb-6">PDF & DOCX up to 50MB</p>

                  <span className="px-6 py-2.5 bg-white border border-primary/20 text-primary font-bold rounded-xl shadow-sm group-hover:bg-primary group-hover:text-white transition-colors">
                    Browse File
                  </span>

                  {file && (
                    <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-white border border-primary/20 rounded-xl shadow-sm text-primary font-bold text-sm">
                      <CheckCircle2 size={16} />
                      {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* URL / YOUTUBE INPUT */}
            {(source === "url" || source === "youtube") && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  {source === "url" ? "Article URL" : "YouTube Link"}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    {source === "url" ? <LinkIcon size={20} /> : <Youtube size={20} />}
                  </div>
                  <input
                    type="text"
                    placeholder={source === "url" ? "Paste article URL here..." : "Paste YouTube link here..."}
                    value={source === "url" ? url : youtube}
                    onChange={(e) => source === "url" ? setUrl(e.target.value) : setYoutube(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium text-slate-700 shadow-inner"
                  />
                </div>
              </div>
            )}

            {/* SUMMARY MODE */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Summary Mode
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-bold text-slate-700 shadow-inner appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em' }}
              >
                <option value="concise">Concise - Quick highlights</option>
                <option value="brief">Brief - Key points</option>
                <option value="summary">Summary - Balanced overview</option>
                <option value="detailed">Detailed - Comprehensive analysis</option>
              </select>
            </div>

            {/* ERROR */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 font-medium">
                <div className="mt-0.5 shrink-0"><Sparkles size={18} className="rotate-45" /></div>
                <p>{error}</p>
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full relative overflow-hidden group flex items-center justify-center gap-2 py-4 rounded-2xl font-extrabold text-lg text-white bg-gradient-to-r from-primary to-cyan-500 shadow-xl shadow-primary/30 transition-transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 ease-in-out" />
              {loading ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={24} />
                  Generate Summary
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* RESULT */}
        {summary && (
          <SummaryDisplay summary={summary} mode={mode} tokenUsage={tokenUsage} />
        )}
      </div>
    </div>
  );
}
