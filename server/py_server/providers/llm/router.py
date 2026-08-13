"""
providers/llm/router.py
========================
LLMRouter — central, provider-agnostic LLM selection with health-check-based fallback.

Architecture:
    LLMRouter
    ├── OllamaProvider   (local, preferred for course generation)
    └── HuggingFaceProvider  (remote, fallback)
    [Future: OpenAIProvider, AnthropicProvider]

Fallback loop:
    For each provider in COURSE_PROVIDER_ORDER (env var):
        1. Run health check (with 30s cache to avoid per-request checks)
        2. If healthy → build LLM → return it
        3. If ProviderUnavailableError → log warning → try next
        4. If ModelError → log warning → try next
    If all fail → raise AllProvidersFailedError

Key design rules:
    - ONLY course generation uses this router (non-course: chat, quiz, rag etc. unchanged)
    - Nodes get an LLM object; they do NOT know which provider produced it
    - Health check results are cached for HEALTH_CACHE_TTL seconds
    - Thread-safe: cache uses asyncio.Lock
    - Singleton `llm_router` exported at module level

Adding a new provider (e.g. OpenAI):
    1. Add "openai" to COURSE_PROVIDER_ORDER env var
    2. Add an elif in _build_provider_llm()
    That's it. No node changes needed.
"""

from __future__ import annotations
import asyncio
import logging
import time
from typing import Any, Dict, List, Optional, Tuple
from config.settings import settings
from providers.llm.provider_errors import (
    AllProvidersFailedError,
    ModelError,
    ProviderUnavailableError,
)
from providers.llm.tasks import TaskType

logger = logging.getLogger(__name__)

# Health check result TTL (seconds) — avoid re-checking every invocation
HEALTH_CACHE_TTL: float = 30.0


# ──────────────────────────────────────────────────────────────────────────────
# Task profile lookup
def _get_task_profile(task: TaskType) -> Dict[str, Any]:
    """
    Resolve a task profile from the task profiles registry.
    Falls back to the 'wizard' profile for unknown tasks.
    """
    from providers.llm.llm_task_profiles import TASK_PROFILES

    profile = TASK_PROFILES.get(task.value) or TASK_PROFILES.get("wizard", {})
    return dict(profile)


# ──────────────────────────────────────────────────────────────────────────────
# Provider LLM builders
async def _health_check_ollama(base_url: str, model: str) -> bool:
    """
    Perform async health check for Ollama.
    Raises ProviderUnavailableError if not reachable.
    """
    from providers.llm.ollama_provider import OllamaProvider

    provider = OllamaProvider(base_url=base_url, model=model)
    return await provider.health_check()


def _build_ollama_llm(task_profile: Dict[str, Any]) -> Any:
    """Build and return a ChatOllama LLM."""
    from providers.llm.ollama_provider import OllamaProvider

    provider = OllamaProvider()
    return provider.get_llm(task_profile)


def _build_huggingface_llm(task_profile: Dict[str, Any]) -> Any:
    """Build and return a ChatHuggingFace LLM using the existing Provider class."""
    from providers.llm.llm_provider import Provider
    from providers.llm.provider_errors import ProviderUnavailableError, ModelError

    model_override = task_profile.get("model_override")
    hf_task = task_profile.get("hf_task")

    try:
        p = Provider(
            provider="huggingface",
            model_name=model_override,
            temperature=task_profile.get("temperature", 0.5),
            max_new_tokens=task_profile.get("max_new_tokens", 2048),
            hf_task=hf_task,
            top_p=task_profile.get("top_p"),
            top_k=task_profile.get("top_k"),
        )
        return p.get_llm(use_chat=task_profile.get("use_chat", True))
    except Exception as exc:
        # Distinguish: if token is missing → treat as unavailable
        err_str = str(exc).lower()
        if any(
            kw in err_str for kw in ("token", "api key", "unauthorized", "401", "403")
        ):
            raise ProviderUnavailableError(
                f"HuggingFace auth failed: {exc}",
                provider="huggingface",
                cause=exc,
            ) from exc
        raise ModelError(
            f"HuggingFace LLM construction failed: {exc}",
            provider="huggingface",
            cause=exc,
        ) from exc


# ──────────────────────────────────────────────────────────────────────────────
# LLMRouter
# ──────────────────────────────────────────────────────────────────────────────
class LLMRouter:
    """
    Central LLM router for course generation tasks.

    Priority order is driven by `COURSE_PROVIDER_ORDER` setting:
        "ollama,huggingface"  (default: try local first, cloud fallback)

    Adding future providers:
        - Set COURSE_PROVIDER_ORDER="ollama,openai,huggingface"
        - Add an elif branch in `_try_provider()`
    """

    def __init__(self):
        self._lock = asyncio.Lock()
        # _health_cache[provider_name] = (timestamp, is_healthy)
        self._health_cache: Dict[str, Tuple[float, bool]] = {}
        self._provider_order: List[str] = self._parse_provider_order()

        logger.info(
            "[LLMRouter] Initialized with provider order: %s",
            " → ".join(self._provider_order),
        )

    def _parse_provider_order(self) -> List[str]:
        """Parse COURSE_PROVIDER_ORDER env var into a clean list."""
        raw = getattr(settings, "COURSE_PROVIDER_ORDER", "ollama,huggingface")
        return [p.strip().lower() for p in raw.split(",") if p.strip()]

    async def _is_healthy(self, provider_name: str) -> bool:
        """
        Check provider health, using cached result if within TTL.

        Returns True/False. Raises ProviderUnavailableError on hard failure.
        """
        async with self._lock:
            now = time.monotonic()
            cached = self._health_cache.get(provider_name)
            if cached:
                ts, healthy = cached
                if now - ts < HEALTH_CACHE_TTL:
                    logger.debug(
                        "[LLMRouter] Health cache HIT for '%s': healthy=%s (age=%.1fs)",
                        provider_name,
                        healthy,
                        now - ts,
                    )
                    if not healthy:
                        raise ProviderUnavailableError(
                            f"Provider '{provider_name}' was recently unhealthy (cached)",
                            provider=provider_name,
                        )
                    return True

        # Cache miss / stale — perform live check
        if provider_name == "ollama":
            if not getattr(settings, "OLLAMA_ENABLED", True):
                logger.info("[LLMRouter] Ollama is disabled via OLLAMA_ENABLED=false")
                async with self._lock:
                    self._health_cache["ollama"] = (time.monotonic(), False)
                raise ProviderUnavailableError(
                    "Ollama is disabled via OLLAMA_ENABLED setting",
                    provider="ollama",
                )
            await _health_check_ollama(settings.OLLAMA_BASE_URL, settings.OLLAMA_MODEL)
            async with self._lock:
                self._health_cache["ollama"] = (time.monotonic(), True)
            return True

        elif provider_name == "huggingface":
            # HF health check: just verify the API key is set
            hf_token = getattr(settings, "HF_API_KEY", "") or getattr(
                settings, "HUGGINGFACEHUB_API_TOKEN", ""
            )
            if not hf_token:
                async with self._lock:
                    self._health_cache["huggingface"] = (time.monotonic(), False)
                raise ProviderUnavailableError(
                    "HuggingFace API token not configured (HF_API_KEY is empty)",
                    provider="huggingface",
                )
            async with self._lock:
                self._health_cache["huggingface"] = (time.monotonic(), True)
            return True

        else:
            # Unknown provider — treat as unavailable
            raise ProviderUnavailableError(
                f"Unknown provider '{provider_name}' in COURSE_PROVIDER_ORDER",
                provider=provider_name,
            )

    def _invalidate_cache(self, provider_name: str) -> None:
        """Invalidate health cache for a provider (e.g. after a model error)."""
        self._health_cache.pop(provider_name, None)

    async def _try_provider(
        self, provider_name: str, task_profile: Dict[str, Any], task: TaskType
    ):
        """
        Try a single provider: health check → build LLM → return it.
        Raises ProviderUnavailableError or ModelError on failure.
        """
        # Step 1: health check
        await self._is_healthy(provider_name)

        # Step 2: build LLM
        logger.info("[LLMRouter] Provider: %s | task: %s", provider_name, task.value)
        if provider_name == "ollama":
            return _build_ollama_llm(task_profile)
        elif provider_name == "huggingface":
            return _build_huggingface_llm(task_profile)
        else:
            raise ProviderUnavailableError(
                f"No builder for provider '{provider_name}'",
                provider=provider_name,
            )

    async def select(self, task: TaskType):
        """
        Select the best available LLM for the given task type.

        Iterates through providers in COURSE_PROVIDER_ORDER order.
        Returns the first healthy provider's LLM object.

        Args:
            task: TaskType enum value (e.g. TaskType.COURSE_LESSON)

        Returns:
            A LangChain-compatible LLM object (ChatOllama or ChatHuggingFace)

        Raises:
            AllProvidersFailedError: if every provider failed
        """
        task_profile = _get_task_profile(task)
        failures: List[Tuple[str, Exception]] = []

        for provider_name in self._provider_order:
            try:
                llm = await self._try_provider(provider_name, task_profile, task)
                logger.info(
                    "[LLMRouter] ✓ Selected provider '%s' for task '%s'",
                    provider_name,
                    task.value,
                )
                return llm

            except ProviderUnavailableError as exc:
                logger.warning(
                    "[LLMRouter] Provider '%s' unavailable — %s. Trying next...",
                    provider_name,
                    exc,
                )
                failures.append((provider_name, exc))
                self._invalidate_cache(provider_name)

            except ModelError as exc:
                logger.warning(
                    "[LLMRouter] Provider '%s' model error — %s. Trying next...",
                    provider_name,
                    exc,
                )
                failures.append((provider_name, exc))
                self._invalidate_cache(provider_name)

            except Exception as exc:
                logger.error(
                    "[LLMRouter] Unexpected error from provider '%s': %s",
                    provider_name,
                    exc,
                )
                failures.append((provider_name, exc))

        # All providers exhausted
        logger.error(
            "[LLMRouter] ✗ All providers failed for task '%s': %s",
            task.value,
            "; ".join(f"{n}: {type(e).__name__}" for n, e in failures),
        )
        raise AllProvidersFailedError(failures=failures, task=task.value)

    async def health_check_all(self) -> Dict[str, bool]:
        """
        Pre-warm health checks for all configured providers.
        Returns a dict of {provider_name: is_healthy}.
        Useful for startup diagnostics or /health endpoint.
        """
        results = {}
        for provider_name in self._provider_order:
            try:
                healthy = await self._is_healthy(provider_name)
                results[provider_name] = healthy
                logger.info("[LLMRouter] Health check %s: OK", provider_name)
            except ProviderUnavailableError as exc:
                results[provider_name] = False
                logger.warning(
                    "[LLMRouter] Health check %s: FAIL — %s", provider_name, exc
                )
        return results


# ── Module-level singleton ────────────────────────────────────────────────────
# All course generation nodes import this single instance.
# It maintains the health cache across the lifetime of the process.
llm_router = LLMRouter()
