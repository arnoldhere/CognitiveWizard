"""
providers/llm/__init__.py
===========================
Public API for the LLM provider layer.

For course generation: use get_llm_for_course_task() + LLMRouter.
For other tasks (chat, rag, quiz, etc.): use get_llm_for_task() / get_cached_llm().
"""

# Provider-agnostic router (course generation)
from .router import llm_router

# Error types — import these when catching provider failures
from .provider_errors import (
    LLMProviderError,
    ProviderUnavailableError,
    ModelError,
    AllProvidersFailedError,
)

# Task registry
from .tasks import TaskType

__all__ = [
    "llm_router",
    "LLMProviderError",
    "ProviderUnavailableError",
    "ModelError",
    "AllProvidersFailedError",
    "TaskType",
]
