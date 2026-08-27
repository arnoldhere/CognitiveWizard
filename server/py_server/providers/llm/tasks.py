from enum import Enum


class TaskType(str, Enum):
    CHAT = "chat"            # chatbot → ConversationChain
    SUMMARIZE = "summarize"  # summarization → load_summarize_chain
    QUIZ = "quiz"            # quiz gen → structured JSON output
    SENTIMENT = "sentiment"  # classification
    RAG = "rag"              # retrieval-augmented generation → RetrievalQA
    WIZARD = "wizard"        # generating structured plan, roadmap, syllabus

    # ── Course generation pipeline tasks ─────────────
    # These use the provider-agnostic get_llm_for_course_task
    # and have their own task profiles tuned for deep content generation.
    COURSE_ARCHITECT = "course_architect"  # Blueprint-only structural pass
    COURSE_LESSON    = "course_lesson"     # Full lesson content generation
    COURSE_REVIEWER  = "course_reviewer"   # Pedagogical QA review
    COURSE_QUALITY   = "course_quality"    # Final validation & assembly
