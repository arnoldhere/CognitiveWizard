import React, { useState, useRef } from "react";
import RoadmapHeader from "./RoadmapHeader";
import RoadmapHero from "./RoadmapHero";
import TimelineNavigator from "./TimelineNavigator";
import PhaseCard from "./PhaseCard";
import ResourceGallery from "./ResourceGallery";
import FloatingAIAssistant from "./FloatingAIAssistant";
import CapstoneSection from "./CapstoneSection";
import PdfExportModal from "./PdfExportModal";
import { exportWizardPdf } from "../../services/api";
import { LayoutDashboard, Activity, Layers, BookOpen, Rocket } from "lucide-react";
import { motion } from "framer-motion";

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
  
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportStepIndex, setExportStepIndex] = useState(0);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState(null);

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

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard, ref: overviewRef },
    { id: "timeline", label: "Timeline", icon: Activity, ref: timelineRef },
    { id: "phases", label: "Phase Cards", icon: Layers, ref: phasesRef },
    { id: "resources", label: "Resources", icon: BookOpen, ref: resourcesRef },
    { id: "capstone", label: "Capstone", icon: Rocket, ref: capstoneRef },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <RoadmapHeader
        title={roadmap.title}
        onBack={onBack}
        onRegenerate={onRegenerate}
        onExportPdf={handleExportPdf}
        isSaved={isSaved}
        onToggleSave={() => setIsSaved(!isSaved)}
      />

      <div className="max-w-[1600px] mx-auto w-full flex flex-col lg:flex-row items-start relative px-4 md:px-8 pb-32 pt-8 gap-8">
        
        {/* Left Navigation Sidebar */}
        <aside className="hidden lg:block sticky top-[100px] w-[260px] shrink-0 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm z-10">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 px-4">Roadmap Sections</div>
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.ref, item.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all text-sm ${activeNavTab === item.id ? 'bg-primary text-slate-900 shadow-md shadow-primary/20 scale-105' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile Navigation (Horizontal scrollable) */}
        <div className="lg:hidden w-full overflow-x-auto pb-4 sticky top-[72px] z-40 bg-slate-50/90 backdrop-blur-md -mx-4 px-4 flex gap-2 hide-scrollbar">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.ref, item.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-bold transition-all text-sm shrink-0 whitespace-nowrap ${activeNavTab === item.id ? 'bg-primary text-slate-900 shadow-md' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
              </button>
            ))}
        </div>

        {/* Main Content Area */}
        <main className="flex-1 w-full min-w-0">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div ref={overviewRef} className="scroll-mt-[100px]">
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

            <div ref={timelineRef} className="scroll-mt-[100px]">
              <TimelineNavigator
                phases={roadmap.phases}
                onSelectPhase={scrollToPhaseCard}
              />
            </div>

            <div ref={phasesRef} className="scroll-mt-[100px] mb-12">
              <div className="mb-8">
                <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Phase Cards & Milestones</h2>
                <p className="text-slate-500 font-medium text-lg">
                  Expand a phase to view topics, objectives, and key deliverables.
                </p>
              </div>

              <div className="flex flex-col gap-6">
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

            <div ref={resourcesRef} className="scroll-mt-[100px] mb-12">
              <ResourceGallery topic={topic || roadmap.title} references={roadmap.references} />
            </div>

            <div ref={capstoneRef} className="scroll-mt-[100px]">
              <CapstoneSection topic={topic || roadmap.title} />
            </div>
          </motion.div>
        </main>
      </div>

      <FloatingAIAssistant
        topic={topic || roadmap.title}
        roadmapId={data?.id}
        pdfPayload={{
          topic: topic || roadmap.title,
          content_type: "roadmap",
          details: data?.details || "",
          content: data?.content || data || {},
          skill_level: roadmap.difficulty,
          goal: roadmap.goal,
          learning_style: roadmap.learningStyle,
        }}
      />

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
