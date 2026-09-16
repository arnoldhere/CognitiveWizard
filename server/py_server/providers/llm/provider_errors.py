"""
providers/llm/provider_errors.py
==================================
Normalized exception hierarchy for the LLM routing and execution layer.

Design principles:
- Every provider error is mapped to a typed, semantic exception.
- RateLimitError preserves retry-after information so the router can sleep/retry before fallback.
- Transient errors (5xx, timeouts) allow bounded retries.
- Terminal errors (AuthenticationError, InvalidRequestError) fail fast without wasteful retries.
- OutputValidationError and ContentQualityError distinguish model parsing/quality failures from infra issues.
- Never swallow provider exceptions as (False, {}); preserve error types so callers can act correctly.
"""

from __future__ import annotations
import re
from typing import List, Optional, Any


class LLMProviderError(Exception):
    """Base class for all LLM provider exceptions."""

    def __init__(
        self,
        message: str,
        provider: str = "unknown",
        cause: Optional[Exception] = None,
        raw_response: Optional[Any] = None,
    ):
        super().__init__(message)
        self.provider = provider
        self.cause = cause
        self.raw_response = raw_response

    def __str__(self) -> str:
        base = super().__str__()
        if self.cause:
            return f"[{self.provider}] {base} (caused by: {type(self.cause).__name__}: {self.cause})"
        return f"[{self.provider}] {base}"


class RateLimitError(LLMProviderError):
    """
    Raised when a provider responds with HTTP 429 (Too Many Requests) or quota exhaustion.
    Carries retry_after seconds (if extracted from headers or error message).
    """

    def __init__(
        self,
        message: str,
        provider: str = "unknown",
        cause: Optional[Exception] = None,
        retry_after: Optional[float] = None,
        reset_time: Optional[float] = None,
    ):
        super().__init__(message, provider=provider, cause=cause)
        self.retry_after = retry_after
        self.reset_time = reset_time


class TransientProviderError(LLMProviderError):
    """
    Raised on transient network glitches, timeouts, or server-side 5xx errors (500, 502, 503, 504).
    Safe to retry with exponential backoff.
    """
    pass


class ProviderUnavailableError(LLMProviderError):
    """
    Raised when a provider is unreachable at the infrastructure level
    (e.g., DNS resolution failure, connection refused, circuit open).
    """
    pass


class AuthenticationError(LLMProviderError):
    """
    Raised on HTTP 401/403: Invalid API key, expired credentials, or missing permission.
    Non-retryable on the same provider.
    """
    pass


class InvalidRequestError(LLMProviderError):
    """
    Raised on HTTP 400/422: Context length exceeded, unsupported parameter, or bad prompt.
    Non-retryable on the same provider without input modification.
    """
    pass


class ModelNotFoundError(LLMProviderError):
    """
    Raised when the requested model identifier does not exist or has been decommissioned (HTTP 404).
    """
    pass


class OutputValidationError(LLMProviderError):
    """
    Raised when the model responds, but the output fails JSON extraction or Pydantic validation.
    """
    pass


class ContentQualityError(LLMProviderError):
    """
    Raised when generated content fails pedagogical review or quality gate validation.
    """
    pass


class ModelError(LLMProviderError):
    """
    Legacy backwards-compatible alias for general model-level failures.
    """
    pass


class AllProvidersFailedError(LLMProviderError):
    """
    Raised when every configured provider has been tried and all failed.
    Contains the full chain of failures for detailed logging and diagnostics.
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


def extract_retry_after(exc: Exception) -> Optional[float]:
    """
    Attempt to extract retry-after duration (in seconds) from response headers
    or text messages across various providers (Groq, OpenAI, Anthropic, HuggingFace).
    """
    # 1. Inspect response headers if available on the exception
    response = getattr(exc, "response", None)
    if response is not None:
        headers = getattr(response, "headers", {}) or {}
        # Standard HTTP Retry-After
        retry_after = headers.get("retry-after") or headers.get("Retry-After")
        if retry_after:
            try:
                return float(retry_after)
            except (ValueError, TypeError):
                pass

        # OpenAI / Groq custom reset headers
        reset_requests = headers.get("x-ratelimit-reset-requests") or headers.get("x-ratelimit-reset-tokens")
        if reset_requests:
            # Often formatted as "6m0s" or "2s" or a timestamp
            match = re.search(r"(\d+(?:\.\d+)?)\s*s", str(reset_requests))
            if match:
                return float(match.group(1))

    # 2. Inspect error message string
    msg = str(exc)
    # Regex for "Please try again in X.XXs" or "retry after X seconds"
    m = re.search(r"(?:try again in|retry after|wait)\s*([0-9]+(?:\.[0-9]+)?)\s*(?:s|seconds)", msg, re.IGNORECASE)
    if m:
        try:
            return float(m.group(1))
        except (ValueError, TypeError):
            pass

    # Regex for "try again in Xm Ys"
    m_min = re.search(r"in\s*(\d+)m\s*(\d+(?:\.\d+)?)s", msg, re.IGNORECASE)
    if m_min:
        try:
            return float(m_min.group(1)) * 60.0 + float(m_min.group(2))
        except (ValueError, TypeError):
            pass

    return None


def normalize_provider_error(exc: Exception, provider: str = "unknown") -> LLMProviderError:
    """
    Map raw SDK or HTTP exceptions from any LLM provider into normalized LLMProviderError.
    """
    if isinstance(exc, LLMProviderError):
        return exc

    msg = str(exc).lower()
    exc_type = type(exc).__name__.lower()
    status_code = getattr(exc, "status_code", None) or getattr(getattr(exc, "response", None), "status_code", None)

    # 1. Rate Limits (429)
    if status_code == 429 or "rate limit" in msg or "429" in msg or "tpm" in msg or "rpm" in msg or "quota" in msg:
        retry_sec = extract_retry_after(exc)
        return RateLimitError(
            message=str(exc),
            provider=provider,
            cause=exc,
            retry_after=retry_sec,
        )

    # 2. Authentication (401, 403)
    if status_code in (401, 403) or "unauthorized" in msg or "invalid api key" in msg or "forbidden" in msg or "authentication" in msg:
        return AuthenticationError(message=str(exc), provider=provider, cause=exc)

    # 3. Model Not Found (404)
    if status_code == 404 or "model not found" in msg or "does not exist" in msg:
        return ModelNotFoundError(message=str(exc), provider=provider, cause=exc)

    # 4. Invalid Request / Bad Request (400, 422)
    if status_code in (400, 422) or "context length" in msg or "maximum context" in msg or "invalid_request" in msg:
        return InvalidRequestError(message=str(exc), provider=provider, cause=exc)

    # 5. Infrastructure Unreachable
    if "connection refused" in msg or "connecterror" in exc_type or "failed to establish a new connection" in msg:
        return ProviderUnavailableError(message=str(exc), provider=provider, cause=exc)

    # 6. Transient network / 5xx
    if status_code in (500, 502, 503, 504) or "timeout" in msg or "timeouterror" in exc_type or "readtimeout" in exc_type or "service unavailable" in msg or "gateway" in msg:
        return TransientProviderError(message=str(exc), provider=provider, cause=exc)

    # Fallback to general LLMProviderError
    return LLMProviderError(message=str(exc), provider=provider, cause=exc)
