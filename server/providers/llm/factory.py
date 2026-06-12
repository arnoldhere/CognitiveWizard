from providers.llm.llm_provider import Provider
from providers.llm.tasks import TaskType
from providers.llm.llm_task_profiles import TASK_PROFILES
from config.settings import settings
from functools import lru_cache


def get_llm_for_task(task: TaskType, provider: str = None):
    """
    Returns a LangChain-compatible LLM configured for the given task.
    Each module calls this — no need of single shared global llm.
    Example Usage:
        llm = get_llm_for_task(TaskType.CHAT)
        llm = get_llm_for_task(TaskType.SUMMARIZE, provider="openai")
    """
    profile = TASK_PROFILES[task.value]
    p = Provider(
        provider=provider or settings.DEF_LLM_PROVIDER,
        model_name=profile["model_override"],
        temperature=profile["temperature"],
        max_new_tokens=profile["max_new_tokens"],
        hf_task=profile.get("hf_task"),
        top_p=profile.get("top_p"),
        top_k=profile.get("top_k"),
    )
    return p.get_llm(use_chat=profile.get("use_chat", True))


# Optional: cached instances per task (avoids re-init overhead)
@lru_cache(maxsize=8)
def get_cached_llm(task_value: str, provider: str):
    return get_llm_for_task(TaskType(task_value), provider)
