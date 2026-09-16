"""
providers/llm/factory.py
========================
Factory for LangChain-compatible LLM instances.
Uses pre-built LangChain constructs (Runnable.with_retry, RunnableWithFallbacks)
and native provider SDK retries for robust multi-provider routing and failover.
"""

from __future__ import annotations
from functools import lru_cache
import logging
from typing import Any, List, Optional, Union

from langchain_core.outputs import Generation, LLMResult
from langchain_core.runnables import Runnable

from config.settings import settings
from providers.llm.llm_configs import TASK_PROFILES
from providers.llm.llm_provider import Provider
from providers.llm.provider_errors import AllProvidersFailedError
from providers.llm.tasks import TaskType

logger = logging.getLogger(__name__)


def get_task_profile(task_name: str) -> dict:
    """Retrieve profile from local registry for efficiency."""
    profile = TASK_PROFILES.get(task_name) or TASK_PROFILES.get("wizard", {})
    return {
        "temperature": profile.get("temperature", 0.5),
        "max_new_tokens": profile.get("max_new_tokens", 1024),
        "top_p": profile.get("top_p"),
        "top_k": profile.get("top_k"),
        "model_override": profile.get("model_override"),
        "use_chat": profile.get("use_chat", True),
    }


def get_llm_for_task(task: Union[TaskType, str], provider: Optional[str] = None):
    """
    Returns a LangChain-compatible LLM configured for the given task.
    Uses DEF_LLM_PROVIDER if no provider is explicitly specified.
    """
    task_type = TaskType(task) if isinstance(task, str) else task
    profile = get_task_profile(task_type.value)
    hf_task = "conversational" if task_type == TaskType.QUIZ else None

    p = Provider(
        provider=provider or settings.DEF_LLM_PROVIDER,
        model_name=profile.get("model_override"),
        temperature=profile.get("temperature", 0.5),
        max_new_tokens=profile.get("max_new_tokens", 1024),
        hf_task=hf_task,
        top_p=profile.get("top_p"),
        top_k=profile.get("top_k"),
    )
    return p.get_llm(use_chat=profile.get("use_chat", True))


@lru_cache(maxsize=16)
def get_cached_llm(task_value: str, provider: Optional[str] = None):
    """Cached getter for standalone single-provider task clients."""
    return get_llm_for_task(TaskType(task_value), provider)


class FallbackRunnable(Runnable):
    """
    LangChain-compatible Runnable that provides multi-provider fallback and
    backward-compatible .generate() invocation with minimal overhead.
    """

    def __init__(
        self,
        runnable: Any,
        fallbacks: Optional[List[Any]] = None,
        task_name: str = "unknown",
    ):
        self.runnable = runnable
        self.fallbacks = list(fallbacks or [])
        self.task_name = task_name

    def invoke(self, input: Any, config: Optional[Any] = None, **kwargs: Any) -> Any:
        candidates = [self.runnable] + self.fallbacks
        failures = []
        for cand in candidates:
            try:
                if hasattr(cand, "invoke"):
                    return cand.invoke(input, config=config, **kwargs)
                return cand(input)
            except Exception as exc:
                failures.append((getattr(cand, "name", str(cand)), exc))
                continue
        raise AllProvidersFailedError(failures=failures, task=self.task_name)

    async def ainvoke(self, input: Any, config: Optional[Any] = None, **kwargs: Any) -> Any:
        candidates = [self.runnable] + self.fallbacks
        failures = []
        for cand in candidates:
            try:
                if hasattr(cand, "ainvoke"):
                    return await cand.ainvoke(input, config=config, **kwargs)
                elif hasattr(cand, "invoke"):
                    import asyncio
                    return await asyncio.get_event_loop().run_in_executor(
                        None, lambda c=cand: c.invoke(input, config=config, **kwargs)
                    )
                return cand(input)
            except Exception as exc:
                failures.append((getattr(cand, "name", str(cand)), exc))
                continue
        raise AllProvidersFailedError(failures=failures, task=self.task_name)

    def generate(self, messages: List[Any], **kwargs: Any) -> LLMResult:
        """
        Backward-compatible .generate() method for Summarization, Quiz, and RAG services.
        Cascades through primary and fallback runnables until one succeeds.
        """
        candidates = [self.runnable] + self.fallbacks
        failures = []
        for cand in candidates:
            try:
                if hasattr(cand, "generate"):
                    return cand.generate(messages, **kwargs)
                unwrapped = getattr(cand, "bound", cand)
                if hasattr(unwrapped, "generate"):
                    return unwrapped.generate(messages, **kwargs)

                inp = messages[0] if messages and isinstance(messages, list) else messages
                res = cand.invoke(inp)
                text = res.content if hasattr(res, "content") else str(res)
                return LLMResult(generations=[[Generation(text=text)]])
            except Exception as exc:
                failures.append((getattr(cand, "name", str(cand)), exc))
                continue

        raise AllProvidersFailedError(failures=failures, task=self.task_name)


async def get_llm_for_course_task(task: TaskType) -> FallbackRunnable:
    """
    Returns a LangChain-compatible LLM for generation tasks with automatic
    multi-provider fallback ordering based on settings.LLM_PROVIDER_ORDER and
    pre-built SDK/LangChain retry backoff.
    """
    order_str = settings.LLM_PROVIDER_ORDER or settings.DEF_LLM_PROVIDER or "huggingface"
    provider_names = [p.strip().lower() for p in order_str.split(",") if p.strip()]
    if not provider_names:
        provider_names = [settings.DEF_LLM_PROVIDER]

    valid_llms = []
    failures = []

    for name in provider_names:
        try:
            llm = get_llm_for_task(task, provider=name)
            if hasattr(llm, "with_retry"):
                llm = llm.with_retry(stop_after_attempt=2, wait_exponential_jitter=True)
            valid_llms.append((name, llm))
        except Exception as exc:
            logger.warning(
                "LLM provider '%s' failed to initialize for task '%s': %s",
                name,
                task.value,
                exc,
            )
            failures.append((name, exc))

    if not valid_llms:
        logger.error(
            "All configured LLM providers failed for task '%s': %s",
            task.value,
            failures,
        )
        raise AllProvidersFailedError(failures=failures, task=task.value)

    primary_name, primary_llm = valid_llms[0]
    fallback_llms = [llm for _, llm in valid_llms[1:]]

    if fallback_llms:
        logger.info(
            "Configured multi-provider failover for '%s': primary=%s, fallbacks=%s",
            task.value,
            primary_name,
            [name for name, _ in valid_llms[1:]],
        )

    return FallbackRunnable(
        runnable=primary_llm,
        fallbacks=fallback_llms,
        task_name=task.value,
    )
