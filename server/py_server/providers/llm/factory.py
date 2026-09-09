import logging
from functools import lru_cache
from providers.llm.llm_provider import Provider
from providers.llm.tasks import TaskType
from config.settings import settings
from providers.llm.llm_configs import params, TASK_PROFILES

logger = logging.getLogger(__name__)


from providers.llm.provider_errors import AllProvidersFailedError


def get_task_profile(task_name: str):
    """Retrieve profile from local registry instead of HTTP fetch for efficiency."""
    profile = params.get(task_name) or params.get("wizard", {})
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
        provider=provider or settings.DEF_LLM_PROVIDER,
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
    Returns a LangChain-compatible LLM for course generation tasks with automatic
    multi-provider fallback ordering based on settings.LLM_PROVIDER_ORDER.

    If primary provider fails or encounters rate limits (429), execution
    automatically cascades to the next healthy provider in order.

    Raises:
        AllProvidersFailedError: If every configured provider failed to initialize.
    """
    order_str = settings.LLM_PROVIDER_ORDER or settings.DEF_LLM_PROVIDER or "huggingface"
    provider_names = [p.strip().lower() for p in order_str.split(",") if p.strip()]

    if not provider_names:
        provider_names = [settings.DEF_LLM_PROVIDER]

    valid_llms = []
    failures = []

    for provider_name in provider_names:
        try:
            llm = get_llm_for_task(task, provider=provider_name)
            valid_llms.append((provider_name, llm))
        except Exception as exc:
            logger.warning(
                "LLM provider '%s' failed to initialize for task '%s': %s",
                provider_name,
                task.value,
                exc,
            )
            failures.append((provider_name, exc))

    if not valid_llms:
        logger.error(
            "All configured LLM providers failed for course task '%s': %s",
            task.value,
            failures,
        )
        raise AllProvidersFailedError(failures=failures, task=task.value)

    primary_name, primary_llm = valid_llms[0]

    if len(valid_llms) > 1 and hasattr(primary_llm, "with_fallbacks"):
        fallback_llms = [llm for _, llm in valid_llms[1:] if hasattr(llm, "invoke")]
        if fallback_llms:
            logger.info(
                "Configured multi-provider failover for '%s': primary=%s, fallbacks=%s",
                task.value,
                primary_name,
                [name for name, _ in valid_llms[1:]],
            )
            return primary_llm.with_fallbacks(fallback_llms)

    return primary_llm
