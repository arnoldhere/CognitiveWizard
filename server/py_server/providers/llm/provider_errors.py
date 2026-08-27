"""
providers/llm/provider_errors.py
==================================
Exception hierarchy for the LLM provider layer.

Using distinct exception types lets the router and callers distinguish between:
- A provider that is completely unreachable (infrastructure failure)
- A model that is reachable but produced bad results (model failure)
- Every configured provider having failed (total failure → surface to user)

This separation is critical so the pipeline can:
- Silently fall back on ProviderUnavailableError (Primary down → try Fallback)
- Also fall back on ModelError (model timeout / bad JSON)
- Only surface AllProvidersFailedError to the user as a hard failure
"""

from __future__ import annotations
from typing import List, Optional


class LLMProviderError(Exception):
    """Base class for all LLM provider exceptions."""

    def __init__(
        self, message: str, provider: str = "unknown", cause: Optional[Exception] = None
    ):
        super().__init__(message)
        self.provider = provider
        self.cause = cause

    def __str__(self) -> str:
        base = super().__str__()
        if self.cause:
            return f"[{self.provider}] {base} (caused by: {type(self.cause).__name__}: {self.cause})"
        return f"[{self.provider}] {base}"


class ProviderUnavailableError(LLMProviderError):
    """
    Raised when a provider is unreachable at the infrastructure level.

    Examples:
    - Provider server is not running (connection refused)
    - HuggingFace API gateway returns 5xx
    - Network timeout during health check

    The router treats this as: skip this provider, try the next one.
    """

    pass


class ModelError(LLMProviderError):
    """
    Raised when a provider is reachable but the model invocation failed.

    Examples:
    - Model returns empty / malformed response
    - OOM error during inference
    - Request timeout during generation (model too slow)
    - HF API returns 400/422 (bad request to model endpoint)

    The router also treats this as: skip this provider, try the next one.
    Note: Per-lesson soft-failures inside nodes are NOT this exception — those
    use Python's None return pattern to allow partial course completion.
    """

    pass


class AllProvidersFailedError(LLMProviderError):
    """
    Raised when every configured provider has been tried and all failed.

    The router populates `failures` with a list of (provider_name, exception)
    tuples so the caller can log or surface the full chain of failures.

    This is the only error that propagates outside the router — it means
    the pipeline cannot proceed and should surface `status=error` to the user.
    """

    def __init__(
        self,
        failures: List[tuple[str, Exception]],
        task: str = "unknown",
    ):
        self.failures = failures
        self.task = task
        summary = "; ".join(
            f"{name}: {type(exc).__name__}({exc})" for name, exc in failures
        )
        super().__init__(
            f"All LLM providers failed for task '{task}': {summary}",
            provider="all",
            cause=None,
        )
