import React, { useState, useRef } from "react";
import "../../styles/RoadmapDisplay.css";
import RoadmapHeader from "./RoadmapHeader";
import RoadmapHero from "./RoadmapHero";
import TimelineNavigator from "./TimelineNavigator";
import PhaseCard from "./PhaseCard";
import ResourceGallery from "./ResourceGallery";
import FloatingAIAssistant from "./FloatingAIAssistant";
import CapstoneSection from "./CapstoneSection";
import PdfExportModal from "./PdfExportModal";

import { exportWizardPdf } from "../../services/api";

import DashboardIcon from "@mui/icons-material/Dashboard";
import TimelineIcon from "@mui/icons-material/Timeline";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import StyleIcon from "@mui/icons-material/Style";

function normalizeRoadmapData(data, propLearningStyle, propTopic) {
  const rawContent = data?.content || data || {};

  const title = rawContent.title || data?.topic || propTopic || "Personalized AI Roadmap";
  const description =
    rawContent.description ||
    "A milestone-driven learning roadmap generated with AI and reference retriever intelligence.";
  const goal = rawContent.goal || data?.goal || "Master core subject concepts & practical skills";
  const difficulty = rawContent.skill_level || data?.skill_level || "Intermediate";
  const learningStyle =
    propLearningStyle || rawContent.learning_style || data?.learning_style || "Visual & Project-based";

  const prerequisites = Array.isArray(rawContent.prerequisites) ? rawContent.prerequisites : [];
  const outcomes = Array.isArray(rawContent.outcomes) ? rawContent.outcomes : [];

  // Parse modules/phases from LLM response schema
  let phases = [];

  if (Array.isArray(rawContent.phasewise_modules) && rawContent.phasewise_modules.length > 0) {
    phases = rawContent.phasewise_modules.map((pm, index) => {
      const subModules = Array.isArray(pm.modules) ? pm.modules : [];
      const firstMod = subModules[0] || {};

      const topics = subModules.flatMap((mod) =>
        Array.isArray(mod.topics) ? mod.topics : []
      );

      return {
        title: pm.phase || firstMod.title || `Phase ${index + 1}`,
        description: firstMod.description || "Structured learning phase milestone.",
        estimatedTime: firstMod.estimated_time || "1-2 Weeks",
        difficulty: firstMod.difficulty || difficulty,
        topics: topics.length > 0 ? topics : firstMod.topics || [],
        deliverables: firstMod.deliverables || firstMod.practical_tasks || [],
      };
    });
  } else if (Array.isArray(rawContent.modules) && rawContent.modules.length > 0) {
    phases = rawContent.modules.map((mod, index) => ({
      title: mod.title || `Phase ${index + 1}`,
      description: mod.description || mod.details || "Structured milestone module.",
      estimatedTime: mod.estimated_time || mod.duration || "Flexible",
      difficulty: mod.difficulty || difficulty,
      topics: Array.isArray(mod.topics) ? mod.topics : [],
      deliverables: mod.deliverables || mod.key_takeaways || [],
    }));
  } else if (Array.isArray(rawContent.learning_phases) && rawContent.learning_phases.length > 0) {
    phases = rawContent.learning_phases.map((pName, index) => ({
      title: typeof pName === "string" ? pName : pName.title || `Phase ${index + 1}`,
      description: pName.description || "Phase milestone details.",
      estimatedTime: "1 Week",
      difficulty: difficulty,
      topics: [],
      deliverables: [],
    }));
  } else {
    // Default fallback phase if empty
    phases = [
      {
        title: "Phase 1: Core Foundations",
        description: "Master essential principles, terminology, and key mechanics.",
        estimatedTime: "1 Week",
        difficulty: "Beginner",
        topics: [{ name: "Foundational Concepts", details: "Core building blocks", importance: "High" }],
      },
    ];
  }

  // Parse references and images injected by Reference Retriever Agent
  const references = rawContent.references || data?.references || {};
  const images = rawContent.images || data?.images || [];

  return {
    title,
    description,
    goal,
    difficulty,
    learningStyle,
    prerequisites,
    outcomes,
    phases,
    references,
    images,
  };
}

export default function RoadmapDisplay({ data, learningStyle, topic, onBack, onRegenerate }) {
  const roadmap = normalizeRoadmapData(data, learningStyle, topic);

  const [isSaved, setIsSaved] = useState(false);
  const [activeNavTab, setActiveNavTab] = useState("overview");

  // PDF Export State
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportStepIndex, setExportStepIndex] = useState(0);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState(null);

  // Section Refs for smooth scrolling
  const overviewRef = useRef(null);
  const timelineRef = useRef(null);
  const phasesRef = useRef(null);
  const resourcesRef = useRef(null);
  const capstoneRef = useRef(null);

  const totalPhases = roadmap.phases.length;

  const scrollToSection = (ref, tabName) => {
    setActiveNavTab(tabName);
    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const scrollToPhaseCard = (idx) => {
    setActiveNavTab("phases");
    const targetCard = document.getElementById(`phase-card-${idx}`);
    if (targetCard) {
      targetCard.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    setExportStepIndex(0);
    setExportSuccess(false);
    setExportError(null);

    const stepInterval = setInterval(() => {
      setExportStepIndex((prev) => (prev < 4 ? prev + 1 : prev));
    }, 800);

    try {
      const rawContent = data?.content || data || {};
      const payload = {
        topic: topic || roadmap.title,
        content_type: "roadmap",
        details: data?.details || "",
        content: rawContent,
        skill_level: roadmap.difficulty,
        goal: roadmap.goal,
        learning_style: roadmap.learningStyle,
      };

      const blob = await exportWizardPdf(payload);
      clearInterval(stepInterval);
      setExportStepIndex(4);
      setExportSuccess(true);

      // Create blob download link
      const downloadUrl = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = downloadUrl;
      const safeTitle = (topic || roadmap.title).replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");
      link.setAttribute("download", `${safeTitle}_roadmap.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setTimeout(() => {
        setIsExportingPdf(false);
        setExportSuccess(false);
      }, 1800);
    } catch (err) {
      clearInterval(stepInterval);
      setExportError(err.message || "Failed to generate PDF. Please try again.");
    }
  };

  return (
    <div className="roadmap-display-workspace printable-area">
      {/* Header Bar */}
      <RoadmapHeader
        title={roadmap.title}
        onBack={onBack}
        onRegenerate={onRegenerate}
        onExportPdf={handleExportPdf}
        isSaved={isSaved}
        onToggleSave={() => setIsSaved(!isSaved)}
      />

      <div className="roadmap-workspace-body">
        {/* Left Navigation Sidebar */}
        <aside className="roadmap-left-sidebar no-print">
          <div className="sidebar-title">Roadmap Sections</div>
          <nav className="sidebar-nav-links">
            <button
              className={`sidebar-link ${activeNavTab === "overview" ? "active" : ""}`}
              onClick={() => scrollToSection(overviewRef, "overview")}
            >
              <DashboardIcon sx={{ fontSize: 18 }} />
              <span>Overview</span>
            </button>

            <button
              className={`sidebar-link ${activeNavTab === "timeline" ? "active" : ""}`}
              onClick={() => scrollToSection(timelineRef, "timeline")}
            >
              <TimelineIcon sx={{ fontSize: 18 }} />
              <span>Timeline</span>
            </button>

            <button
              className={`sidebar-link ${activeNavTab === "phases" ? "active" : ""}`}
              onClick={() => scrollToSection(phasesRef, "phases")}
            >
              <StyleIcon sx={{ fontSize: 18 }} />
              <span>Phase Cards</span>
            </button>

            <button
              className={`sidebar-link ${activeNavTab === "resources" ? "active" : ""}`}
              onClick={() => scrollToSection(resourcesRef, "resources")}
            >
              <MenuBookIcon sx={{ fontSize: 18 }} />
              <span>Resources</span>
            </button>

            <button
              className={`sidebar-link ${activeNavTab === "capstone" ? "active" : ""}`}
              onClick={() => scrollToSection(capstoneRef, "capstone")}
            >
              <RocketLaunchIcon sx={{ fontSize: 18 }} />
              <span>Capstone</span>
            </button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="roadmap-main-content">
          {/* Section 1: Hero Summary */}
          <div ref={overviewRef}>
            <RoadmapHero
              title={roadmap.title}
              description={roadmap.description}
              goal={roadmap.goal}
              difficulty={roadmap.difficulty}
              learningStyle={roadmap.learningStyle}
              prerequisites={roadmap.prerequisites}
              outcomes={roadmap.outcomes}
              totalPhases={totalPhases}
              onExplorePhases={() => scrollToSection(phasesRef, "phases")}
              onExportPdf={handleExportPdf}
              isSaved={isSaved}
              onToggleSave={() => setIsSaved(!isSaved)}
            />
          </div>

          {/* Section 2: Interactive Timeline */}
          <div ref={timelineRef} className="workspace-section">
            <TimelineNavigator
              phases={roadmap.phases}
              onSelectPhase={scrollToPhaseCard}
            />
          </div>

          {/* Section 3: Phase Cards */}
          <div ref={phasesRef} className="workspace-section">
            <div className="section-title-bar">
              <h2>Phase Cards & Milestones</h2>
              <span className="section-subtitle">
                Expand a phase to view topics, objectives, and key deliverables.
              </span>
            </div>

            <div className="phase-cards-stack">
              {roadmap.phases.map((phase, idx) => (
                <PhaseCard
                  key={idx}
                  phaseIndex={idx}
                  phase={phase}
                  defaultExpanded={idx === 0}
                />
              ))}
            </div>
          </div>

          {/* Section 4: Resource Gallery (Agent Curated Resources) */}
          <div ref={resourcesRef} className="workspace-section">
            <ResourceGallery topic={topic || roadmap.title} references={roadmap.references} />
          </div>

          {/* Section 5: Capstone Project Section */}
          <div ref={capstoneRef} className="workspace-section">
            <CapstoneSection topic={topic || roadmap.title} />
          </div>
        </main>
      </div>

      {/* Floating AI Assistant Drawer */}
      <FloatingAIAssistant
        topic={topic || roadmap.title}
        currentPhaseTitle="Roadmap Overview"
      />

      {/* Backend PDF Export Animated Modal */}
      <PdfExportModal
        isOpen={isExportingPdf}
        currentStepIndex={exportStepIndex}
        isSuccess={exportSuccess}
        error={exportError}
        onRetry={handleExportPdf}
        onClose={() => setIsExportingPdf(false)}
      />
    </div>
  );
}
