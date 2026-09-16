from enum import Enum


class TaskType(str, Enum):
    CHAT = "chat"            # chatbot → ConversationChain
    SUMMARIZE = "summarize"  # summarization → load_summarize_chain
    QUIZ = "quiz"            # quiz gen → structured JSON output
    SENTIMENT = "sentiment"  # classification
    RAG = "rag"              # retrieval-augmented generation → RetrievalQA
    WIZARD = "wizard"        # legacy single-call wizard generation

    # ── Roadmap generation pipeline tasks ─────────────
    ROADMAP_PLANNER  = "roadmap_planner"   # Structural milestones & phases
    ROADMAP_COMPOSER = "roadmap_composer"  # Assembling phases with curated references

    # ── Guide generation pipeline tasks ───────────────
    GUIDE_PLANNER  = "guide_planner"   # Practical outline & tool mapping
    GUIDE_WRITER   = "guide_writer"    # Deep steps, worked examples, common mistakes
    GUIDE_REVIEWER = "guide_reviewer"  # Educational clarity & validation

    # ── Course generation pipeline tasks ─────────────
    COURSE_ARCHITECT = "course_architect"  # Blueprint-only structural pass
    COURSE_LESSON    = "course_lesson"     # Full lesson content generation
    COURSE_REVIEWER  = "course_reviewer"   # Pedagogical QA review
    COURSE_QUALITY   = "course_quality"    # Final validation & assembly
