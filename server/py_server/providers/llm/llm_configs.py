"""
providers/llm/llm_configs.py
==============================
Platform-wide Task Profiles and LLM Configurations.

Each profile tunes the LLM inference behavior, token limits, rate-limit retry policies,
and provider fallback ordering specifically for the requirements of that task.

Configuration parameters explained:
- temperature: 0.0 (fully deterministic) to 1.0 (creative). Low for review/gate, higher for brainstorming.
- max_new_tokens: Maximum completion length in tokens allocated for the model response.
- preferred_providers: Ordered list of providers to attempt first.
- fallback_providers: Ordered list of providers to fall back to if preferred providers are exhausted.
- max_attempts: Maximum retry attempts on a SINGLE provider (e.g., waiting out 429 rate limits or transient errors).
- timeout: Request timeout in seconds before triggering a transient retry or fallback.
- retry_backoff: Defines initial wait and maximum backoff ceiling when encountering rate limits or 5xx errors.
- structured_output_schema: Name of the expected JSON/Pydantic validation schema.
- quality_threshold: Minimum pass ratio or acceptance score (0.0 to 1.0) required by validation nodes.
"""

from typing import Dict, Any, List
from config.settings import settings

# Parse global provider preference order as baseline
_GLOBAL_ORDER = [
    p.strip().lower()
    for p in (settings.LLM_PROVIDER_ORDER or settings.DEF_LLM_PROVIDER or "huggingface").split(",")
    if p.strip()
]
if not _GLOBAL_ORDER:
    _GLOBAL_ORDER = ["huggingface"]

_PRIMARY_PROVIDER = _GLOBAL_ORDER[0]
_FALLBACK_PROVIDERS = _GLOBAL_ORDER[1:] if len(_GLOBAL_ORDER) > 1 else []

TASK_PROFILES: Dict[str, Dict[str, Any]] = {
    # ── Conversational Chat ───────────────────────────────────────────────────
    # Balanced temperature for natural responses; rapid timeout to keep chat snappy.
    "chat": {
        "temperature": 0.5,
        "max_new_tokens": 1024,
        "top_p": 0.9,
        "top_k": None,
        "preferred_providers": _GLOBAL_ORDER[:2] or [_PRIMARY_PROVIDER],
        "fallback_providers": _GLOBAL_ORDER[2:] or _FALLBACK_PROVIDERS,
        "max_attempts": 2,
        "timeout": 30.0,
        "retry_backoff": {"base_seconds": 1.0, "max_seconds": 10.0},
        "structured_output_schema": None,
        "quality_threshold": None,
        "model_override": None,
        "use_chat": True,
    },

    # ── Summarization ─────────────────────────────────────────────────────────
    # Deterministic temperature (0.3) for factual, hallucination-free summaries.
    "summarize": {
        "temperature": 0.3,
        "max_new_tokens": 1024,
        "top_p": None,
        "top_k": None,
        "preferred_providers": _GLOBAL_ORDER[:2] or [_PRIMARY_PROVIDER],
        "fallback_providers": _GLOBAL_ORDER[2:] or _FALLBACK_PROVIDERS,
        "max_attempts": 3,
        "timeout": 45.0,
        "retry_backoff": {"base_seconds": 1.5, "max_seconds": 15.0},
        "structured_output_schema": None,
        "quality_threshold": None,
        "model_override": None,
        "use_chat": True,
    },

    # ── Quiz Generation ───────────────────────────────────────────────────────
    # Slightly higher temperature (0.7) for diverse, engaging questions; larger token budget.
    "quiz": {
        "temperature": 0.7,
        "top_p": 0.9,
        "top_k": 50,
        "max_new_tokens": 2500,
        "preferred_providers": _GLOBAL_ORDER[:2] or [_PRIMARY_PROVIDER],
        "fallback_providers": _GLOBAL_ORDER[2:] or _FALLBACK_PROVIDERS,
        "max_attempts": 3,
        "timeout": 60.0,
        "retry_backoff": {"base_seconds": 2.0, "max_seconds": 20.0},
        "structured_output_schema": "QuizListSchema",
        "quality_threshold": 0.8,
        "model_override": settings.QUIZ_GENERATOR_MODEL,
        "use_chat": True,
        "hf_task": "conversational",
    },

    # ── Retrieval-Augmented Generation (RAG) ──────────────────────────────────
    # Low temperature (0.2) to ensure grounded answers strictly adhering to context docs.
    "rag": {
        "temperature": 0.2,
        "top_p": None,
        "top_k": None,
        "max_new_tokens": 1024,
        "preferred_providers": _GLOBAL_ORDER[:2] or [_PRIMARY_PROVIDER],
        "fallback_providers": _GLOBAL_ORDER[2:] or _FALLBACK_PROVIDERS,
        "max_attempts": 2,
        "timeout": 30.0,
        "retry_backoff": {"base_seconds": 1.0, "max_seconds": 12.0},
        "structured_output_schema": None,
        "quality_threshold": None,
        "model_override": None,
        "use_chat": True,
    },

    # ── Legacy Wizard Call (Backward-compatible fallback) ─────────────────────
    "wizard": {
        "temperature": 0.5,
        "top_p": 0.9,
        "top_k": 50,
        "max_new_tokens": 3500,
        "preferred_providers": _GLOBAL_ORDER,
        "fallback_providers": _FALLBACK_PROVIDERS,
        "max_attempts": 3,
        "timeout": 90.0,
        "retry_backoff": {"base_seconds": 2.0, "max_seconds": 30.0},
        "structured_output_schema": "WizardRawSchema",
        "quality_threshold": 0.75,
        "model_override": None,
        "use_chat": True,
    },

    # ── Roadmap Pipeline Profiles ─────────────────────────────────────────────
    # Stage 1: Milestone Planning — structured, creative phase breakdown.
    "roadmap_planner": {
        "temperature": 0.4,
        "max_new_tokens": 3000,
        "top_p": 0.9,
        "top_k": 40,
        "preferred_providers": _GLOBAL_ORDER,
        "fallback_providers": _FALLBACK_PROVIDERS,
        "max_attempts": 3,
        "timeout": 60.0,
        "retry_backoff": {"base_seconds": 2.0, "max_seconds": 25.0},
        "structured_output_schema": "RoadmapPlanSchema",
        "quality_threshold": 0.8,
        "model_override": None,
        "use_chat": True,
    },
    # Stage 2: Composition — merges phases with curated search references.
    "roadmap_composer": {
        "temperature": 0.3,
        "max_new_tokens": 4000,
        "top_p": 0.9,
        "top_k": 40,
        "preferred_providers": _GLOBAL_ORDER,
        "fallback_providers": _FALLBACK_PROVIDERS,
        "max_attempts": 3,
        "timeout": 75.0,
        "retry_backoff": {"base_seconds": 2.0, "max_seconds": 30.0},
        "structured_output_schema": "RoadmapSchema",
        "quality_threshold": 0.85,
        "model_override": None,
        "use_chat": True,
    },

    # ── Guide Pipeline Profiles ───────────────────────────────────────────────
    # Stage 1: Practical Outline & Tools Specification
    "guide_planner": {
        "temperature": 0.4,
        "max_new_tokens": 3000,
        "top_p": 0.9,
        "top_k": 40,
        "preferred_providers": _GLOBAL_ORDER,
        "fallback_providers": _FALLBACK_PROVIDERS,
        "max_attempts": 3,
        "timeout": 60.0,
        "retry_backoff": {"base_seconds": 2.0, "max_seconds": 25.0},
        "structured_output_schema": "GuidePlanSchema",
        "quality_threshold": 0.8,
        "model_override": None,
        "use_chat": True,
    },
    # Stage 2: In-Depth Guide Writing (prose, examples, pitfalls)
    "guide_writer": {
        "temperature": 0.5,
        "max_new_tokens": 5000,
        "top_p": 0.9,
        "top_k": 50,
        "preferred_providers": _GLOBAL_ORDER,
        "fallback_providers": _FALLBACK_PROVIDERS,
        "max_attempts": 3,
        "timeout": 90.0,
        "retry_backoff": {"base_seconds": 2.5, "max_seconds": 35.0},
        "structured_output_schema": "GuideSchema",
        "quality_threshold": 0.85,
        "model_override": None,
        "use_chat": True,
    },
    # Stage 3: Educational Reviewer (pedagogical clarity & validation)
    "guide_reviewer": {
        "temperature": 0.2,
        "max_new_tokens": 2048,
        "top_p": None,
        "top_k": None,
        "preferred_providers": _GLOBAL_ORDER,
        "fallback_providers": _FALLBACK_PROVIDERS,
        "max_attempts": 3,
        "timeout": 45.0,
        "retry_backoff": {"base_seconds": 1.5, "max_seconds": 20.0},
        "structured_output_schema": "ReviewerSchema",
        "quality_threshold": 0.9,
        "model_override": None,
        "use_chat": True,
    },

    # ── Course Pipeline Profiles ──────────────────────────────────────────────
    # Stage 1: Blueprint Architect — high structural rigor, moderate creativity.
    "course_architect": {
        "temperature": 0.4,
        "max_new_tokens": 6144,
        "top_p": 0.9,
        "top_k": 40,
        "preferred_providers": _GLOBAL_ORDER,
        "fallback_providers": _FALLBACK_PROVIDERS,
        "max_attempts": 3,
        "timeout": 90.0,
        "retry_backoff": {"base_seconds": 2.0, "max_seconds": 30.0},
        "structured_output_schema": "CourseBlueprintSchema",
        "quality_threshold": 0.8,
        "model_override": None,
        "use_chat": True,
    },
    # Stage 3: Lesson Generator — deep lesson prose, worked examples, code & exercises.
    "course_lesson": {
        "temperature": 0.6,
        "max_new_tokens": 6144,
        "top_p": 0.9,
        "top_k": 50,
        "preferred_providers": _GLOBAL_ORDER,
        "fallback_providers": _FALLBACK_PROVIDERS,
        "max_attempts": 3,
        "timeout": 120.0,
        "retry_backoff": {"base_seconds": 3.0, "max_seconds": 45.0},
        "structured_output_schema": "CourseLessonSchema",
        "quality_threshold": 0.8,
        "model_override": None,
        "use_chat": True,
    },
    # Stage 4: Pedagogical Reviewer — strict, objective grading against Bloom's taxonomy.
    "course_reviewer": {
        "temperature": 0.2,
        "max_new_tokens": 2048,
        "top_p": None,
        "top_k": None,
        "preferred_providers": _GLOBAL_ORDER,
        "fallback_providers": _FALLBACK_PROVIDERS,
        "max_attempts": 3,
        "timeout": 45.0,
        "retry_backoff": {"base_seconds": 1.5, "max_seconds": 20.0},
        "structured_output_schema": "LessonReviewSchema",
        "quality_threshold": 0.9,
        "model_override": None,
        "use_chat": True,
    },
    # Stage 5: Quality Gate — deterministic schema validation and final assembly.
    "course_quality": {
        "temperature": 0.1,
        "max_new_tokens": 1024,
        "top_p": None,
        "top_k": None,
        "preferred_providers": _GLOBAL_ORDER,
        "fallback_providers": _FALLBACK_PROVIDERS,
        "max_attempts": 3,
        "timeout": 30.0,
        "retry_backoff": {"base_seconds": 1.0, "max_seconds": 15.0},
        "structured_output_schema": "CoursePackageSchema",
        "quality_threshold": 0.8,
        "model_override": None,
        "use_chat": True,
    },
}

# Alias for backward compatibility
params = TASK_PROFILES
