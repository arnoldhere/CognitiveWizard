import React from "react";

const STYLE_TEMPLATES = {
  "Visual & Project-based": {
    accent: "#06b6d4",
    accentSoft: "rgba(6, 182, 212, 0.12)",
    title: "Visual-first learning",
    description: "This roadmap is tuned for hands-on building, visual thinking, and portfolio-ready outcomes.",
  },
  "Theoretical & Reading": {
    accent: "#8b5cf6",
    accentSoft: "rgba(139, 92, 246, 0.12)",
    title: "Reading-first learning",
    description: "This roadmap emphasizes strong foundations, trusted references, and curated reading paths.",
  },
  "Interactive & Coding": {
    accent: "#10b981",
    accentSoft: "rgba(16, 185, 129, 0.12)",
    title: "Practice-first learning",
    description: "This roadmap mixes guided lessons with coding drills and challenge-based practice.",
  },
};

function normalizeRoadmapData(data, learningStyle) {
  const rawContent = data?.content || data || {};
  const modules = Array.isArray(rawContent.modules) ? rawContent.modules : [];
  const normalizedModules = modules.map((module, index) => ({
    title: module?.title || `Phase ${index + 1}`,
    description: module?.description || module?.details || "A structured learning milestone.",
    estimatedTime: module?.estimated_time || module?.duration || "Flexible",
    difficulty: module?.difficulty || "Intermediate",
    topics: Array.isArray(module?.topics)
      ? module.topics.map((topic) => ({
          name: topic?.name || topic?.title || "Topic",
          details: topic?.details || topic?.content || "Core concept to master.",
          importance: topic?.importance || "Key milestone",
        }))
      : [],
  }));

  const learningGoals = Array.isArray(rawContent.learning_goals) ? rawContent.learning_goals : [];
  const prerequisites = Array.isArray(rawContent.prerequisites) ? rawContent.prerequisites : [];
  const style = learningStyle || rawContent.learning_style || "Visual & Project-based";

  return {
    title: rawContent.title || data?.topic || "Personalized Roadmap",
    description: rawContent.description || "A modern, milestone-based plan designed for focused learning and practical progress.",
    targetAudience: rawContent.target_audience || "Learners",
    learningGoals,
    prerequisites,
    modules: normalizedModules,
    style,
  };
}

function getVisualCards(topic, modules) {
  return [
    {
      title: "Visual reference board",
      text: `Create a visual map of ${topic} concepts and connect each milestone to a concrete deliverable.`,
      image: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=900&q=80",
    },
    {
      title: "Milestone sketch",
      text: `Sketch each phase of the roadmap so the learner can see the path from basics to mastery.`,
      image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80",
    },
    {
      title: "Project storyboard",
      text: `Turn the final phase into a portfolio-worthy capstone linked to the roadmap modules.`,
      image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80",
    },
  ];
}

function getReadingCards(topic, modules) {
  const topicQuery = encodeURIComponent(topic);
  return [
    {
      title: "Foundational reading",
      text: `Start with a trusted overview on ${topic} and build vocabulary before deeper practice.`,
      link: `https://www.google.com/search?q=${topicQuery}+study+guide`,
    },
    {
      title: "Research-backed references",
      text: `Use reputable articles, tutorials, and official docs to reinforce each milestone.`,
      link: `https://scholar.google.com/scholar?q=${topicQuery}`,
    },
    {
      title: "Deep dive resources",
      text: `Pair each phase with curated books, blogs, and documentation tailored to the module.`,
      link: `https://www.google.com/search?q=${topicQuery}+advanced+resources`,
    },
  ];
}

function getCodingCards(topic, modules) {
  return [
    {
      title: "Hands-on coding drill",
      text: `Finish each milestone with a small build task that reinforces the current phase of ${topic}.`,
      link: "https://leetcode.com/",
    },
    {
      title: "Practice platform",
      text: `Use problem sets to turn roadmap theory into repeated execution and confidence.`,
      link: "https://www.hackerrank.com/",
    },
    {
      title: "Portfolio challenge",
      text: `End the roadmap with a capstone project that feels like a real-world engineering task.`,
      link: "https://github.com/explore",
    },
  ];
}

export default function RoadmapDisplay({ data, learningStyle, topic }) {
  const roadmap = normalizeRoadmapData(data, learningStyle);
  const styleMeta = STYLE_TEMPLATES[roadmap.style] || STYLE_TEMPLATES["Visual & Project-based"];

  const styleCards =
    roadmap.style === "Theoretical & Reading"
      ? getReadingCards(topic || roadmap.title, roadmap.modules)
      : roadmap.style === "Interactive & Coding"
      ? getCodingCards(topic || roadmap.title, roadmap.modules)
      : getVisualCards(topic || roadmap.title, roadmap.modules);

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
      <div
        style={{
          borderRadius: 28,
          padding: "28px",
          background: `linear-gradient(135deg, ${styleMeta.accentSoft} 0%, rgba(255,255,255,0.9) 100%)`,
          border: `1px solid ${styleMeta.accentSoft}`,
          boxShadow: "0 18px 45px rgba(15,23,42,0.08)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at top right, ${styleMeta.accentSoft}, transparent 50%)` }} />
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", background: styleMeta.accentSoft, color: styleMeta.accent, padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {styleMeta.title}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", background: "rgba(255,255,255,0.7)", color: "#334155", padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
              {roadmap.targetAudience}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: "2rem", lineHeight: 1.2, color: "#0f172a" }}>{roadmap.title}</h2>
            <p style={{ margin: 0, color: "#475569", fontSize: "1rem", lineHeight: 1.7, maxWidth: 760 }}>{roadmap.description}</p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {roadmap.learningGoals.slice(0, 3).map((goal, index) => (
              <span key={`${goal}-${index}`} style={{ background: "rgba(255,255,255,0.8)", color: "#0f172a", padding: "8px 12px", borderRadius: 999, fontSize: 13, fontWeight: 700, border: "1px solid rgba(15, 23, 42, 0.08)" }}>
                {goal}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <div style={{ borderRadius: 20, padding: 20, background: "rgba(255,255,255,0.9)", border: "1px solid rgba(148, 163, 184, 0.24)" }}>
          <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", marginBottom: 8 }}>Learning goals</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {roadmap.learningGoals.length > 0 ? roadmap.learningGoals.map((goal, idx) => <div key={`${goal}-${idx}`} style={{ color: "#0f172a", fontWeight: 700 }}>{goal}</div>) : <div style={{ color: "#64748b" }}>Goals will appear here once the AI response includes them.</div>}
          </div>
        </div>
        <div style={{ borderRadius: 20, padding: 20, background: "rgba(255,255,255,0.9)", border: "1px solid rgba(148, 163, 184, 0.24)" }}>
          <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", marginBottom: 8 }}>Prerequisites</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {roadmap.prerequisites.length > 0 ? roadmap.prerequisites.map((item, idx) => <div key={`${item}-${idx}`} style={{ color: "#0f172a", fontWeight: 700 }}>{item}</div>) : <div style={{ color: "#64748b" }}>No prerequisites were provided in the draft response.</div>}
          </div>
        </div>
        <div style={{ borderRadius: 20, padding: 20, background: "rgba(255,255,255,0.9)", border: "1px solid rgba(148, 163, 184, 0.24)" }}>
          <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", marginBottom: 8 }}>Style adaptation</div>
          <div style={{ color: "#0f172a", fontWeight: 700, marginBottom: 6 }}>{roadmap.style}</div>
          <div style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>{styleMeta.description}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#0f172a" }}>Learning phases</h3>
          <span style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>{roadmap.modules.length} milestones</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {roadmap.modules.map((module, index) => (
            <div key={`${module.title}-${index}`} style={{ borderRadius: 22, padding: 20, background: "rgba(255,255,255,0.95)", border: "1px solid rgba(148, 163, 184, 0.24)", boxShadow: "0 10px 25px rgba(15, 23, 42, 0.04)" }}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: "50%", background: styleMeta.accentSoft, color: styleMeta.accent, fontWeight: 800 }}>{index + 1}</span>
                  <div>
                    <h4 style={{ margin: 0, color: "#0f172a", fontSize: "1rem" }}>{module.title}</h4>
                    <div style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>{module.estimatedTime} • {module.difficulty}</div>
                  </div>
                </div>
                <div style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>{module.estimatedTime}</div>
              </div>
              <p style={{ margin: "0 0 12px", color: "#475569", lineHeight: 1.7 }}>{module.description}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {module.topics.map((topicItem, topicIndex) => (
                  <div key={`${topicItem.name}-${topicIndex}`} style={{ borderRadius: 16, padding: "12px 14px", background: "rgba(248, 250, 252, 0.9)", border: "1px solid rgba(226, 232, 240, 0.9)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 4 }}>
                      <div style={{ color: "#0f172a", fontWeight: 700 }}>{topicItem.name}</div>
                      <span style={{ color: styleMeta.accent, fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>{topicItem.importance}</span>
                    </div>
                    <div style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>{topicItem.details}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#0f172a" }}>Style-specific support</h3>
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {styleCards.map((card, index) => (
            <div key={`${card.title}-${index}`} style={{ borderRadius: 20, overflow: "hidden", background: "#fff", border: "1px solid rgba(148, 163, 184, 0.24)", boxShadow: "0 10px 25px rgba(15, 23, 42, 0.04)" }}>
              {card.image && (
                <img src={card.image} alt={card.title} style={{ width: "100%", height: 140, objectFit: "cover" }} />
              )}
              <div style={{ padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: styleMeta.accent }} />
                  <div style={{ color: "#0f172a", fontWeight: 800 }}>{card.title}</div>
                </div>
                <div style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6, marginBottom: 10 }}>{card.text}</div>
                {card.link && (
                  <a href={card.link} target="_blank" rel="noreferrer" style={{ color: styleMeta.accent, fontSize: 13, fontWeight: 800, textDecoration: "none" }}>
                    Open resource →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderRadius: 24, padding: 20, background: "linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.95))", color: "#fff" }}>
        <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>Capstone focus</div>
        <div style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 8 }}>Finish the roadmap with a portfolio-ready showcase.</div>
        <div style={{ color: "rgba(255,255,255,0.8)", lineHeight: 1.7 }}>
          The final milestone should help the learner apply what they learned in a real-world artifact, project, or demonstration that can be shared publicly.
        </div>
      </div>
    </div>
  );
}
