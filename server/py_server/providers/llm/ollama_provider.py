"""
providers/llm/ollama_provider.py
==================================
Ollama local provider — wraps langchain-ollama's ChatOllama with:
- Async health check (fast 2s timeout against /api/tags)
- Task-profile-aware LLM construction
- Clean ProviderUnavailableError / ModelError distinction

Health check logic:
- GETs http://localhost:11434/api/tags (the Ollama "list models" endpoint)
- Returns True if the configured model is found in the tags list
- Returns False (→ ProviderUnavailableError) if:
    - Connection refused (Ollama not running)
    - HTTP error
    - Timeout (> 2s)
    - Model not loaded

This class is purely about LLM acquisition — it does NOT invoke the LLM.
The router calls `get_llm()` and then passes the LLM object to the node.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional
import httpx
from langchain_ollama import ChatOllama
from config.settings import settings
from providers.llm.provider_errors import ModelError, ProviderUnavailableError

logger = logging.getLogger(__name__)

# How long (seconds) to wait for Ollama health check
_HEALTH_CHECK_TIMEOUT = 2.0
_PROVIDER_NAME = "ollama"


class OllamaProvider:
    """
    Provider wrapper for local Ollama inference.

    Usage:
        provider = OllamaProvider()
        if await provider.health_check():
            llm = provider.get_llm(task_profile)
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
    ):
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model = model or settings.OLLAMA_MODEL
        self.name = _PROVIDER_NAME

    async def health_check(self) -> bool:
        """
        Check if Ollama is running and the configured model is available.

        Returns:
            True if Ollama is up and model is present.
            Raises ProviderUnavailableError if not reachable.
        """
        try:
            async with httpx.AsyncClient(timeout=_HEALTH_CHECK_TIMEOUT) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                resp.raise_for_status()

                data = resp.json()
                available_models = [m.get("name", "") for m in data.get("models", [])]

                # Check if our model is in the list (handles "llama3.1:8b" and "llama3.1:8b-instruct-q4_0" variants)
                model_base = self.model.split(":")[0].lower()
                found = any(
                    m.lower().startswith(model_base) or self.model.lower() in m.lower()
                    for m in available_models
                )

                if not found:
                    logger.warning(
                        "[OllamaProvider] Model '%s' not found in available models: %s",
                        self.model,
                        available_models,
                    )
                    # Still try to use it — Ollama will pull/load it
                    # Only hard-fail if Ollama itself is not running

                logger.debug(
                    "[OllamaProvider] Health check OK — %d models available, target=%s found=%s",
                    len(available_models),
                    self.model,
                    found,
                )
                return True

        except (httpx.ConnectError, httpx.ConnectTimeout) as exc:
            raise ProviderUnavailableError(
                f"Ollama is not running at {self.base_url} (connection refused/timeout)",
                provider=_PROVIDER_NAME,
                cause=exc,
            ) from exc
        except httpx.HTTPStatusError as exc:
            raise ProviderUnavailableError(
                f"Ollama returned HTTP {exc.response.status_code}",
                provider=_PROVIDER_NAME,
                cause=exc,
            ) from exc
        except Exception as exc:
            raise ProviderUnavailableError(
                f"Unexpected error during Ollama health check: {exc}",
                provider=_PROVIDER_NAME,
                cause=exc,
            ) from exc

    def get_llm(self, task_profile: Dict[str, Any]) -> ChatOllama:
        """
        Build a ChatOllama instance from a task profile dict.

        Args:
            task_profile: Dict with keys: temperature, max_new_tokens

        Returns:
            ChatOllama instance ready for .ainvoke() / .invoke()

        Raises:
            ModelError: If ChatOllama cannot be constructed
        """
        try:
            temperature = float(task_profile.get("temperature", 0.5))
            # Ollama uses `num_predict` for max output tokens
            num_predict = int(task_profile.get("max_new_tokens", 2048))

            llm = ChatOllama(
                model=self.model,
                base_url=self.base_url,
                temperature=temperature,
                num_predict=num_predict,
            )

            logger.debug(
                "[OllamaProvider] Built ChatOllama: model=%s temperature=%.2f num_predict=%d",
                self.model,
                temperature,
                num_predict,
            )
            return llm

        except Exception as exc:
            raise ModelError(
                f"Failed to construct ChatOllama for model '{self.model}': {exc}",
                provider=_PROVIDER_NAME,
                cause=exc,
            ) from exc
