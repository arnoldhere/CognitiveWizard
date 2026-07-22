import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ScheduleIcon from "@mui/icons-material/Schedule";
import PsychologyIcon from "@mui/icons-material/Psychology";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import ExploreIcon from "@mui/icons-material/Explore";
import LocalLibraryIcon from "@mui/icons-material/LocalLibrary";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import HistoryIcon from "@mui/icons-material/History";
import CreateIcon from "@mui/icons-material/Create";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import DeleteIcon from "@mui/icons-material/Delete";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import { useGsapReveal } from "../hooks/useGsapReveal";
import { generateWizardContent, getWizardHistory, deleteWizardContent, API } from "../services/api";
import { CircularProgress } from "@mui/material";
import RoadmapDisplay from "../components/wizard/RoadmapDisplay";

// Icon mapping for dynamic icon names from admin config
const ICON_MAP = {
  ExploreRounded: <ExploreIcon sx={{ fontSize: 28 }} />,
  LocalLibraryRounded: <LocalLibraryIcon sx={{ fontSize: 28 }} />,
  MenuBookRounded: <MenuBookIcon sx={{ fontSize: 28 }} />,
  ScheduleRounded: <ScheduleIcon sx={{ fontSize: 28 }} />,
  PsychologyRounded: <PsychologyIcon sx={{ fontSize: 28 }} />,
  // Fallback
  default: <ExploreIcon sx={{ fontSize: 28 }} />,
};

function getIcon(iconName) {
  return ICON_MAP[iconName] || ICON_MAP.default;
}


// Expandable module component
const ModuleItem = ({ mod, type }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: "16px", padding: "24px", position: "relative", overflow: "hidden", transition: "all 0.3s", cursor: "pointer" }} onClick={() => setExpanded(!expanded)} className="hover-lift">
      <div style={{ position: "absolute", top: 0, left: 0, width: "6px", height: "100%", background: "linear-gradient(to bottom, #7c3aed, #06b6d4)" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <h3 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: "var(--text)" }}>{mod.title}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {mod.estimated_time && (
            <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.05)", padding: "4px 10px", borderRadius: "20px", color: "var(--text-light)", fontSize: "0.8rem", fontWeight: 600 }}>
              <ScheduleIcon style={{ fontSize: "1rem", marginRight: "4px" }} /> {mod.estimated_time}
            </div>
          )}
          {expanded ? <KeyboardArrowUpIcon style={{ color: "var(--text-light)" }} /> : <KeyboardArrowDownIcon style={{ color: "var(--text-light)" }} />}
        </div>
      </div>

      <p style={{ color: "var(--text-light)", fontSize: "1rem", lineHeight: 1.6, margin: expanded ? "0 0 20px" : "0" }}>
        {mod.description}
      </p>

      {expanded && mod.key_takeaways && mod.key_takeaways.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <h4 style={{ margin: "0 0 8px", color: "var(--text)", fontSize: "0.95rem" }}>Key Takeaways:</h4>
          <ul style={{ margin: 0, paddingLeft: "20px", color: "#a855f7", fontSize: "0.95rem" }}>
            {mod.key_takeaways.map((k, i) => <li key={i}>{k}</li>)}
          </ul>
        </div>
      )}

      {expanded && mod.topics && mod.topics.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {mod.topics.map((topic, idx) => (
            <div key={idx} style={{
              background: "rgba(6, 182, 212, 0.05)",
              padding: "16px", borderRadius: "12px",
              border: "1px solid rgba(6, 182, 212, 0.1)"
            }}>
              <h4 style={{ margin: "0 0 6px", color: "#22d3ee", fontSize: "1rem", fontWeight: 700 }}>
                {topic.name || topic}
              </h4>
              {(topic.details || topic.content) && (
                <p style={{ margin: 0, color: "var(--text-light)", fontSize: "0.9rem", lineHeight: 1.5 }}>
                  {topic.details || topic.content}
                </p>
              )}
              {topic.practical_task && (
                <div style={{ marginTop: "12px", padding: "8px 12px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "6px", color: "#10b981", fontSize: "0.85rem", fontWeight: 600 }}>
                  <TaskAltIcon sx={{ fontSize: "1rem", marginRight: "4px", verticalAlign: "middle" }} />
                  Task: {topic.practical_task}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function WizardModule() {
  const [activeTab, setActiveTab] = useState("generate"); // 'generate' or 'history'

  // Dynamic question sets loaded from admin API
  const [questionSets, setQuestionSets] = useState([]); // array of { content_type, label, description, icon, questions }
  const [setsLoading, setSetsLoading] = useState(true);

  // Generator State
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ contentType: "", topic: "" });
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedData, setGeneratedData] = useState(null);

  // History State
  const [historyItems, setHistoryItems] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

  const rootRef = useRef(null);
  useGsapReveal(rootRef);

  // Load admin-managed question sets on mount
  useEffect(() => {
    API.get("/wizard/question-sets")
      .then(res => setQuestionSets(res.data))
      .catch(err => console.error("Failed to load wizard question sets", err))
      .finally(() => setSetsLoading(false));
  }, []);

  // Active questions for selected content type
  const activeQuestionSet = questionSets.find(qs => qs.content_type === answers.contentType);
  const activeQuestions = activeQuestionSet?.questions || [];

  // Fetch History
  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const data = await getWizardHistory();
      setHistoryItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleDeleteHistory = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteWizardContent(id);
      fetchHistory();
      if (selectedHistoryItem?.id === id) setSelectedHistoryItem(null);
    } catch (err) {
      console.error("Delete failed");
    }
  };

  const handleNext = () => {
    setError(null);
    if (step === 0 && !answers.contentType) { setError("Please select an option."); return; }
    if (step === 1 && !answers.topic.trim()) { setError("Please provide a topic."); return; }

    if (step >= 2 && step < 2 + activeQuestions.length) {
      const qIndex = step - 2;
      const qKey = activeQuestions[qIndex].key;
      if (!answers[qKey]) { setError("Please answer the question."); return; }
    }

    setStep(s => s + 1);
  };

  const handleBack = () => {
    setError(null);
    setStep(s => Math.max(s - 1, 0));
  };

  const handleGenerate = async () => {
    setError(null);
    setMessage(null);
    setIsLoading(true);
    setGeneratedData(null);
    const targetStep = 2 + activeQuestions.length + 1; // Summary step + 1
    setStep(targetStep);

    let details = "";
    activeQuestions.forEach((q) => {
      details += `Q: ${q.label}\nA: ${answers[q.key]}\n\n`;
    });

    try {
      const response = await generateWizardContent({
        topic: answers.topic,
        content_type: answers.contentType,
        details: details.trim()
      });

      setGeneratedData(response);
      setMessage(`Successfully generated your ${answers.contentType.toLowerCase()}!`);
    } catch (err) {
      setError(err.message || "An error occurred while generating.");
      setStep(targetStep - 1);
    } finally {
      setIsLoading(false);
    }
  };

  const startOver = () => {
    setStep(0);
    setGeneratedData(null);
    setAnswers({ contentType: "", topic: "" });
    setSelectedHistoryItem(null);
    setActiveTab("generate");
  };

  const renderContentData = (data) => {
    const isRoadmap = (data?.content_type || "").toLowerCase() === "roadmap";
    const learningStyle = answers?.learningStyle || data?.content?.learning_style || "Visual & Project-based";

    if (isRoadmap) {
      return (
        <div style={{ animation: "fadeIn 0.5s ease", width: "100%", maxWidth: "1100px", margin: "0 auto" }}>
          <RoadmapDisplay data={data} learningStyle={learningStyle} topic={answers.topic || data?.topic} />
        </div>
      );
    }

    return (
      <div style={{ animation: "fadeIn 0.5s ease", width: "100%", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <span style={{ display: "inline-block", background: "rgba(6, 182, 212, 0.1)", color: "#06b6d4", padding: "6px 16px", borderRadius: "20px", fontSize: "0.85rem", fontWeight: 700, marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {data.content_type}
          </span>
          <h1 style={{ fontSize: "2.8rem", fontWeight: 900, color: "var(--text)", marginBottom: "16px", lineHeight: 1.2 }}>
            {data.content?.title || data.topic}
          </h1>
          {data.content?.description && (
            <p style={{ color: "var(--text-light)", fontSize: "1.15rem", maxWidth: "600px", margin: "0 auto", lineHeight: 1.6 }}>
              {data.content.description}
            </p>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {data.content?.modules?.map((mod, i) => (
            <ModuleItem key={i} mod={mod} type={data.content_type} />
          ))}
        </div>
      </div>
    );
  };

  const renderGeneratorSteps = () => {
    const totalSteps = activeQuestions.length > 0 ? 2 + activeQuestions.length + 1 : 4;

    if (step === 0) {
      return (
        <div style={{ animation: "fadeInUp 0.4s ease" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: 900, textAlign: "center", marginBottom: "16px", color: "var(--text)" }}>What do you want to generate?</h2>
          <p style={{ textAlign: "center", color: "var(--text-light)", marginBottom: "40px", fontSize: "1rem" }}>
            Select an AI curriculum template to begin.
          </p>
          {setsLoading ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <CircularProgress size={36} sx={{ color: "#06b6d4" }} />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {questionSets.map(type => (
                <div
                  key={type.content_type}
                  onClick={() => {
                    setAnswers({ contentType: type.content_type, topic: "" });
                    setTimeout(() => setStep(1), 150);
                  }}
                  style={{
                    display: "flex", alignItems: "center", padding: "20px 24px",
                    borderRadius: "12px", cursor: "pointer", transition: "all 0.2s ease",
                    background: answers.contentType === type.content_type ? "rgba(6, 182, 212, 0.1)" : "var(--surface-soft)",
                    border: answers.contentType === type.content_type ? "1px solid #06b6d4" : "1px solid var(--border)"
                  }}
                  className="wiz-hover-card"
                >
                  <div style={{ color: answers.contentType === type.content_type ? "#06b6d4" : "var(--primary-light)", marginRight: "20px" }}>
                    {getIcon(type.icon)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: "0 0 4px", fontSize: "1.1rem", fontWeight: 700, color: "var(--text)" }}>{type.label}</h3>
                    <p style={{ margin: 0, color: "var(--text-light)", fontSize: "0.9rem" }}>{type.description}</p>
                  </div>
                  <ChevronRightIcon style={{ color: "var(--text-light)" }} />
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (step === 1) {
      return (
        <div style={{ animation: "fadeInUp 0.4s ease", textAlign: "center" }}>
          <div style={{ display: "inline-block", background: "rgba(6, 182, 212, 0.1)", color: "#06b6d4", padding: "6px 16px", borderRadius: "20px", fontSize: "0.85rem", fontWeight: 700, marginBottom: "24px" }}>
            {answers.contentType}
          </div>
          <h2 style={{ fontSize: "2.2rem", fontWeight: 900, marginBottom: "16px", color: "var(--text)" }}>What is the topic?</h2>
          <p style={{ color: "var(--text-light)", marginBottom: "40px", fontSize: "1rem" }}>
            Enter the main subject or goal you want to focus on.
          </p>
          <input
            autoFocus
            className="wiz-input-clean"
            placeholder="e.g. Frontend Development, Machine Learning..."
            value={answers.topic}
            onChange={e => setAnswers({ ...answers, topic: e.target.value })}
            onKeyDown={e => e.key === 'Enter' && handleNext()}
            style={{
              width: "100%", padding: "20px", fontSize: "1.2rem", textAlign: "center",
              background: "transparent", border: "none", borderBottom: "2px solid var(--border)",
              color: "var(--text)", outline: "none", transition: "border-color 0.3s"
            }}
          />
        </div>
      );
    }

    if (step >= 2 && step < 2 + activeQuestions.length) {
      const qIndex = step - 2;
      const currentQ = activeQuestions[qIndex];
      const ansKey = currentQ.key;

      return (
        <div style={{ animation: "fadeInUp 0.4s ease", textAlign: "center" }}>
          <h2 style={{ fontSize: "2.2rem", fontWeight: 900, marginBottom: "16px", color: "var(--text)", lineHeight: 1.2 }}>{currentQ.label}</h2>
          <p style={{ color: "var(--text-light)", marginBottom: "40px", fontSize: "1rem" }}>
            Help the AI understand your specific needs.
          </p>

          {/* Single-choice select */}
          {currentQ.type === "select" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "400px", margin: "0 auto" }}>
              {currentQ.options.map(opt => (
                <button
                  key={opt}
                  onClick={() => {
                    setAnswers({ ...answers, [ansKey]: opt });
                    setTimeout(() => handleNext(), 150);
                  }}
                  style={{
                    padding: "16px 24px", borderRadius: "12px", fontSize: "1.05rem",
                    background: answers[ansKey] === opt ? "rgba(168, 85, 247, 0.15)" : "var(--surface-soft)",
                    border: answers[ansKey] === opt ? "1px solid #a855f7" : "1px solid var(--border)",
                    color: answers[ansKey] === opt ? "#c084fc" : "var(--text)",
                    fontWeight: 600, cursor: "pointer", transition: "all 0.2s", textAlign: "center"
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : currentQ.type === "multiselect" ? (
            /* Multi-choice select */
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "400px", margin: "0 auto" }}>
              {currentQ.options.map(opt => {
                const selected = (answers[ansKey] || []).includes(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => {
                      const current = answers[ansKey] || [];
                      const updated = selected ? current.filter(v => v !== opt) : [...current, opt];
                      setAnswers({ ...answers, [ansKey]: updated });
                    }}
                    style={{
                      padding: "16px 24px", borderRadius: "12px", fontSize: "1.05rem",
                      background: selected ? "rgba(6, 182, 212, 0.15)" : "var(--surface-soft)",
                      border: selected ? "1px solid #06b6d4" : "1px solid var(--border)",
                      color: selected ? "#06b6d4" : "var(--text)",
                      fontWeight: 600, cursor: "pointer", transition: "all 0.2s", textAlign: "left",
                      display: "flex", alignItems: "center", gap: "12px"
                    }}
                  >
                    <span style={{
                      width: 18, height: 18, borderRadius: 4, border: `2px solid ${selected ? "#06b6d4" : "var(--border)"}`,
                      background: selected ? "#06b6d4" : "transparent", display: "inline-flex",
                      alignItems: "center", justifyContent: "center", flexShrink: 0
                    }}>
                      {selected && <span style={{ color: "#fff", fontSize: 12, fontWeight: 900 }}>✓</span>}
                    </span>
                    {opt}
                  </button>
                );
              })}
              <p style={{ color: "var(--text-light)", fontSize: "0.85rem", textAlign: "center", marginTop: 8 }}>Select all that apply, then click Continue</p>
            </div>
          ) : (
            /* Text / number / date / short_text inputs */
            <input
              autoFocus
              type={currentQ.type === "short_text" ? "text" : currentQ.type}
              className="wiz-input-clean"
              placeholder={currentQ.placeholder}
              value={answers[ansKey] || ""}
              onChange={e => setAnswers({ ...answers, [ansKey]: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleNext()}
              style={{
                width: "100%", maxWidth: "500px", margin: "0 auto", padding: "20px", fontSize: "1.2rem", textAlign: "center",
                background: "transparent", border: "none", borderBottom: "2px solid var(--border)",
                color: "var(--text)", outline: "none", transition: "border-color 0.3s", display: "block"
              }}
            />
          )}
        </div>
      );
    }

    if (step === 2 + activeQuestions.length) {
      return (
        <div style={{ animation: "fadeInUp 0.4s ease", textAlign: "center" }}>
          <div style={{ display: "inline-block", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", padding: "12px", borderRadius: "50%", marginBottom: "24px" }}>
            <AutoAwesomeIcon sx={{ fontSize: 40 }} />
          </div>
          <h2 style={{ fontSize: "2.2rem", fontWeight: 900, marginBottom: "16px", color: "var(--text)" }}>Ready to Generate</h2>
          <p style={{ color: "var(--text-light)", marginBottom: "40px", fontSize: "1rem" }}>
            Review your inputs before we construct your personalized {answers.contentType.toLowerCase()}.
          </p>

          <div style={{ background: "var(--surface-soft)", border: "1px solid var(--border)", borderRadius: "16px", padding: "32px", textAlign: "left", maxWidth: "500px", margin: "0 auto 40px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <div style={{ color: "var(--text-light)", fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Format</div>
                <div style={{ color: "#06b6d4", fontWeight: 700, fontSize: "1.1rem" }}>{answers.contentType}</div>
              </div>
              <div>
                <div style={{ color: "var(--text-light)", fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Topic</div>
                <div style={{ color: "var(--text)", fontWeight: 600, fontSize: "1.1rem" }}>{answers.topic}</div>
              </div>
              {activeQuestions.map((q) => (
                <div key={q.key}>
                  <div style={{ color: "var(--text-light)", fontSize: "0.85rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>{q.label}</div>
                  <div style={{ color: "var(--text)", fontWeight: 500, fontSize: "1rem" }}>{answers[q.key]}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <section ref={rootRef} className="page-shell" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "6vh", paddingBottom: "10vh" }}>

      {/* TABS NAVIGATION */}
      {!generatedData && !selectedHistoryItem && step < (2 + activeQuestions.length + 1) && (
        <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: "30px", padding: "6px", marginBottom: "40px", border: "1px solid var(--border)" }}>
          <button
            onClick={() => setActiveTab("generate")}
            style={{ padding: "10px 24px", borderRadius: "24px", background: activeTab === "generate" ? "var(--surface-light)" : "transparent", color: activeTab === "generate" ? "var(--text)" : "var(--text-light)", border: "none", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", transition: "all 0.2s" }}
          >
            <CreateIcon sx={{ fontSize: "1.1rem", mr: 1 }} /> Generate New
          </button>
          <button
            onClick={() => setActiveTab("history")}
            style={{ padding: "10px 24px", borderRadius: "24px", background: activeTab === "history" ? "var(--surface-light)" : "transparent", color: activeTab === "history" ? "var(--text)" : "var(--text-light)", border: "none", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", transition: "all 0.2s" }}
          >
            <HistoryIcon sx={{ fontSize: "1.1rem", mr: 1 }} /> My Content
          </button>
        </div>
      )}

      <div style={{ width: "100%", maxWidth: "800px", padding: "0 20px" }}>

        {/* --- GENERATOR FLOW --- */}
        {activeTab === "generate" && !selectedHistoryItem && (
          <>
            {step < (2 + activeQuestions.length + 1) && (
              <div>
                {/* Header / Back Button */}
                <div style={{ display: "flex", alignItems: "center", marginBottom: "40px", height: "40px" }}>
                  {step > 0 && (
                    <button onClick={handleBack} style={{ background: "none", border: "none", color: "var(--text-light)", display: "flex", alignItems: "center", cursor: "pointer", fontSize: "0.95rem", fontWeight: 600 }}>
                      <ArrowBackIcon style={{ fontSize: "1.2rem", marginRight: "4px" }} /> Back
                    </button>
                  )}
                  <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
                    {Array.from({ length: activeQuestions.length > 0 ? 3 + activeQuestions.length : 1 }).map((_, idx) => (
                      <div key={idx} style={{
                        width: "24px", height: "4px", borderRadius: "2px",
                        background: idx === step ? "#06b6d4" : idx < step ? "rgba(6, 182, 212, 0.3)" : "rgba(255,255,255,0.1)",
                        transition: "all 0.3s ease"
                      }} />
                    ))}
                  </div>
                </div>

                <div style={{ minHeight: "400px" }}>
                  {renderGeneratorSteps()}
                  {error && <div style={{ color: "#ef4444", textAlign: "center", marginTop: "20px", fontWeight: 500 }}>{error}</div>}
                </div>

                <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
                  {step > 0 && step < (2 + activeQuestions.length) && (
                    <button onClick={handleNext} className="btn-primary" style={{ padding: "14px 40px", fontSize: "1.1rem", borderRadius: "30px", background: "linear-gradient(135deg, #7c3aed, #06b6d4)", minWidth: "200px" }}>
                      Continue
                    </button>
                  )}
                  {step === (2 + activeQuestions.length) && (
                    <button onClick={handleGenerate} className="btn-primary" style={{ padding: "14px 40px", fontSize: "1.1rem", borderRadius: "30px", background: "linear-gradient(135deg, #10b981, #059669)", minWidth: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <AutoAwesomeIcon style={{ marginRight: "8px" }} /> Generate Now
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Loading & Result View */}
            {step === (2 + activeQuestions.length + 1) && (
              <div style={{ animation: "fadeIn 0.5s ease", width: "100%" }}>
                {isLoading ? (
                  <div style={{ textAlign: "center", padding: "100px 0" }}>
                    <CircularProgress size={60} thickness={4} sx={{ color: "#06b6d4", marginBottom: "32px" }} />
                    <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text)", marginBottom: "12px" }}>Generating {answers.contentType}...</h2>
                    <p style={{ color: "var(--text-light)", fontSize: "1.1rem" }}>This usually takes a few seconds.</p>
                  </div>
                ) : generatedData ? (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
                      <button onClick={startOver} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text)", padding: "10px 20px", borderRadius: "20px", cursor: "pointer", display: "flex", alignItems: "center", fontWeight: 600, transition: "all 0.2s" }} className="hover-bg-surface">
                        <ArrowBackIcon style={{ fontSize: "1.1rem", marginRight: "6px" }} /> Start Over
                      </button>
                      {message && <div style={{ display: "flex", alignItems: "center", color: "#10b981", fontWeight: 600, fontSize: "0.95rem" }}><CheckCircleIcon style={{ fontSize: "1.2rem", marginRight: "6px" }} /> Done</div>}
                    </div>

                    {renderContentData(generatedData)}
                  </div>
                ) : null}
              </div>
            )}
          </>
        )}

        {/* --- MY CONTENT FLOW --- */}
        {activeTab === "history" && !selectedHistoryItem && (
          <div style={{ animation: "fadeInUp 0.4s ease", width: "100%" }}>
            <h2 style={{ fontSize: "2.2rem", fontWeight: 900, marginBottom: "8px", color: "var(--text)" }}>My Generated Content</h2>
            <p style={{ color: "var(--text-light)", marginBottom: "32px", fontSize: "1rem" }}>
              View and manage your previously generated roadmaps and schedules.
            </p>

            {isHistoryLoading ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <CircularProgress size={40} sx={{ color: "#06b6d4" }} />
              </div>
            ) : historyItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", background: "var(--surface-soft)", borderRadius: "16px", border: "1px dashed var(--border)" }}>
                <MenuBookIcon sx={{ fontSize: 48, color: "var(--text-light)", opacity: 0.5, mb: 2 }} />
                <h3 style={{ color: "var(--text)", mb: 1 }}>No content generated yet</h3>
                <p style={{ color: "var(--text-light)", fontSize: "0.95rem" }}>Head over to the Generate tab to create your first learning plan.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {historyItems.map(item => (
                  <div key={item.id} onClick={() => setSelectedHistoryItem(item)} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "all 0.2s" }} className="hover-lift">
                    <div>
                      <div style={{ display: "inline-block", background: "rgba(6, 182, 212, 0.1)", color: "#06b6d4", padding: "4px 10px", borderRadius: "12px", fontSize: "0.7rem", fontWeight: 700, marginBottom: "8px", textTransform: "uppercase" }}>
                        {item.content_type}
                      </div>
                      <h4 style={{ margin: "0 0 4px", fontSize: "1.1rem", fontWeight: 700, color: "var(--text)" }}>{item.topic}</h4>
                      <p style={{ margin: 0, color: "var(--text-light)", fontSize: "0.85rem" }}>Generated on {new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                    <button onClick={(e) => handleDeleteHistory(item.id, e)} style={{ background: "transparent", border: "none", color: "var(--text-light)", cursor: "pointer", padding: "8px" }} className="hover-text-red">
                      <DeleteIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Viewing a specific history item */}
        {activeTab === "history" && selectedHistoryItem && (
          <div style={{ animation: "fadeIn 0.5s ease", width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
              <button onClick={() => setSelectedHistoryItem(null)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", color: "var(--text)", padding: "10px 20px", borderRadius: "20px", cursor: "pointer", display: "flex", alignItems: "center", fontWeight: 600, transition: "all 0.2s" }} className="hover-bg-surface">
                <ArrowBackIcon style={{ fontSize: "1.1rem", marginRight: "6px" }} /> Back to History
              </button>
            </div>
            {renderContentData(selectedHistoryItem)}
          </div>
        )}

      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .wiz-hover-card:hover {
          transform: translateY(-2px);
          border-color: #06b6d4 !important;
          background: rgba(6, 182, 212, 0.05) !important;
        }
        .wiz-input-clean:focus {
          border-bottom-color: #06b6d4 !important;
        }
        .hover-lift:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .hover-bg-surface:hover {
          background: rgba(255,255,255,0.1) !important;
        }
        .hover-text-red:hover {
          color: #ef4444 !important;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </section>
  );
}
