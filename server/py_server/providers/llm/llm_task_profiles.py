from config.settings import settings

# Per-task model/param overrides — tune as needed
TASK_PROFILES = {
    "chat": {
        "temperature": 0.5,
        "max_new_tokens": 512,
        "top_p": None,
        "top_k": None,
        "model_override": None,  # use provider default
        "use_chat": True,
    },
    "summarize": {
        "temperature": 0.3,  # more deterministic
        "max_new_tokens": 1024,
        "top_p": None,
        "top_k": None,
        "model_override": None,
        "use_chat": True,
    },
    "quiz": {
        "temperature": 0.8,
        "top_p": 0.9,
        "top_k": 50,
        "max_new_tokens": 2500,  # quiz JSON is long
        "model_override": settings.QUIZ_GENERATOR_MODEL,
        "use_chat": True,
        "hf_task": "conversational",
    },
    "rag": {
        "top_p": None,
        "top_k": None,
        "temperature": 0.3,  # factual, grounded
        "max_new_tokens": 768,
        "model_override": None,
        "use_chat": True,
    },
    "wizard": {
        "temperature": 0.6,
        "top_p": 0.9,
        "top_k": 50,
        "max_new_tokens": 3000,
        "model_override": None,
        "use_chat": True,
    },

    # ── Course generation pipeline task profiles ───────────────────────────
    # These are used exclusively via get_llm_for_course_task.
    # Tuned for deep content generation; larger max_new_tokens than wizard.

    "course_architect": {
        # Blueprint-only pass: needs structure, moderate creativity
        "temperature": 0.4,
        "max_new_tokens": 4096,
        "top_p": 0.9,
        "top_k": 40,
        "model_override": None,
        "use_chat": True,
    },
    "course_lesson": {
        # Full lesson generation: explanations, code, exercises — needs more tokens
        "temperature": 0.6,
        "max_new_tokens": 6144,
        "top_p": 0.9,
        "top_k": 50,
        "model_override": None,
        "use_chat": True,
    },
    "course_reviewer": {
        # Pedagogical QA: deterministic grader, short output (PASS/FAIL JSON)
        "temperature": 0.2,
        "max_new_tokens": 2048,
        "top_p": None,
        "top_k": None,
        "model_override": None,
        "use_chat": True,
    },
    "course_quality": {
        # Final quality gate: tight, factual validation
        "temperature": 0.1,
        "max_new_tokens": 1024,
        "top_p": None,
        "top_k": None,
        "model_override": None,
        "use_chat": True,
    },
}

