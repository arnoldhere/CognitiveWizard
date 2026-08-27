import time
import requests
import logging
from functools import lru_cache
from providers.llm.llm_provider import Provider
from providers.llm.tasks import TaskType
from config.settings import settings
from providers.llm.llm_task_profiles import TASK_PROFILES

logger = logging.getLogger(__name__)


def get_task_profile(task_name: str):
    """Retrieve profile from local registry instead of HTTP fetch for efficiency."""
    profile = TASK_PROFILES.get(task_name) or TASK_PROFILES.get("wizard", {})
    return {
        "temperature": profile.get("temperature", 0.5),
        "max_new_tokens": profile.get("max_new_tokens", 512),
        "top_p": profile.get("top_p"),
        "top_k": profile.get("top_k"),
        "model_override": profile.get("model_override"),
        "use_chat": profile.get("use_chat", True),
    }


def get_llm_for_task(task: TaskType, provider: str = None):
    """
    Returns a LangChain-compatible LLM configured for the given task.
    Used by: chat, rag, summarize, quiz, wizard (non-course features).
    Uses DEF_LLM_PROVIDER if no provider is explicitly passed.
    """
    profile = get_task_profile(task.value)
    hf_task = "conversational" if task.value == "quiz" else None

    p = Provider(
        provider=settings.DEF_LLM_PROVIDER,
        model_name=profile["model_override"],
        temperature=profile["temperature"],
        max_new_tokens=profile["max_new_tokens"],
        hf_task=hf_task,
        top_p=profile.get("top_p"),
        top_k=profile.get("top_k"),
    )
    return p.get_llm(use_chat=profile.get("use_chat", True))


@lru_cache(maxsize=8)
def get_cached_llm(task_value: str, provider: str = None):
    return get_llm_for_task(TaskType(task_value), provider)


async def get_llm_for_course_task(task: TaskType):
    """
    Returns a LangChain-compatible LLM for course generation tasks.

    Args:
        task: One of COURSE_ARCHITECT, COURSE_LESSON, COURSE_REVIEWER, COURSE_QUALITY

    Returns:
        A LangChain-compatible LLM object (remote ChatModel)
    """
    return get_llm_for_task(task)
