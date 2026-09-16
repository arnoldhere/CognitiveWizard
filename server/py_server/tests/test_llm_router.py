"""
tests/test_llm_router.py
========================
Tests for optimized LLM Provider routing, fallback chaining, and legacy compatibility.
"""

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from langchain_core.messages import AIMessage
from langchain_core.outputs import LLMResult, Generation

from providers.llm.tasks import TaskType
from providers.llm.factory import get_llm_for_course_task, get_llm_for_task, FallbackRunnable
from providers.llm.provider_errors import (
    RateLimitError,
    AuthenticationError,
    TransientProviderError,
    ModelNotFoundError,
    AllProvidersFailedError,
    normalize_provider_error,
    extract_retry_after,
)


def test_error_normalization():
    """Verify raw exceptions are mapped accurately to typed LLMProviderErrors."""
    exc_429 = Exception("Error 429: TPM Rate limit reached. Please try again in 0.5s")
    norm_429 = normalize_provider_error(exc_429, provider="groq")
    assert isinstance(norm_429, RateLimitError)
    assert norm_429.retry_after == 0.5
    assert norm_429.provider == "groq"

    exc_401 = Exception("401 Unauthorized: Invalid API key provided")
    norm_401 = normalize_provider_error(exc_401, provider="openai")
    assert isinstance(norm_401, AuthenticationError)

    exc_503 = Exception("503 Service Unavailable: Model is currently loading")
    norm_503 = normalize_provider_error(exc_503, provider="huggingface")
    assert isinstance(norm_503, TransientProviderError)

    exc_404 = Exception("404 Model not found: llama-deprecated does not exist")
    norm_404 = normalize_provider_error(exc_404, provider="groq")
    assert isinstance(norm_404, ModelNotFoundError)


def test_extract_retry_after():
    """Verify retry-after extraction from diverse headers and strings."""
    assert extract_retry_after(Exception("Please retry after 2.5 seconds")) == 2.5
    assert extract_retry_after(Exception("try again in 1m 30.0s")) == 90.0

    mock_resp = MagicMock()
    mock_resp.headers = {"Retry-After": "4.0"}
    exc_with_resp = Exception("Too Many Requests")
    exc_with_resp.response = mock_resp
    assert extract_retry_after(exc_with_resp) == 4.0


@pytest.mark.asyncio
async def test_fallback_to_secondary_provider():
    """Verify multi-provider fallback cascades to secondary provider when primary fails."""
    primary_client = MagicMock()
    primary_client.ainvoke = AsyncMock(side_effect=Exception("401 Invalid API key"))

    secondary_client = MagicMock()
    secondary_client.ainvoke = AsyncMock(return_value=AIMessage(content="Fallback provider answer"))

    fallback_runnable = FallbackRunnable(
        runnable=primary_client,
        fallbacks=[secondary_client],
        task_name="test_task",
    )

    res = await fallback_runnable.ainvoke("Test prompt")
    assert res.content == "Fallback provider answer"
    assert primary_client.ainvoke.call_count == 1
    assert secondary_client.ainvoke.call_count == 1


@pytest.mark.asyncio
async def test_all_providers_failed_raises():
    """Verify FallbackRunnable raises AllProvidersFailedError when all providers fail."""
    failing_primary = MagicMock()
    failing_primary.ainvoke = AsyncMock(side_effect=Exception("Primary 500 Error"))

    failing_secondary = MagicMock()
    failing_secondary.ainvoke = AsyncMock(side_effect=Exception("Secondary 503 Error"))

    fallback_runnable = FallbackRunnable(
        runnable=failing_primary,
        fallbacks=[failing_secondary],
        task_name="quiz_task",
    )

    with pytest.raises(AllProvidersFailedError) as exc_info:
        await fallback_runnable.ainvoke("Test prompt")
    assert "quiz_task" in str(exc_info.value)


def test_fallback_runnable_generate_compatibility():
    """Verify FallbackRunnable .generate() method handles legacy chat/completion format."""
    client = MagicMock()
    client.generate.return_value = LLMResult(generations=[[Generation(text="Generated summary text")]])

    fallback_runnable = FallbackRunnable(
        runnable=client,
        fallbacks=[],
        task_name="summarize",
    )
    res = fallback_runnable.generate([["dummy message"]])
    assert len(res.generations) == 1
    assert res.generations[0][0].text == "Generated summary text"


@pytest.mark.asyncio
async def test_get_llm_for_course_task_multi_provider_chain():
    """Verify get_llm_for_course_task initializes configured providers in LLM_PROVIDER_ORDER."""
    with patch("providers.llm.factory.settings") as mock_settings:
        mock_settings.LLM_PROVIDER_ORDER = "groq,openai"
        mock_settings.DEF_LLM_PROVIDER = "groq"

        mock_groq = MagicMock()
        mock_openai = MagicMock()

        def mock_get_llm(task, provider=None):
            if provider == "groq":
                return mock_groq
            return mock_openai

        with patch("providers.llm.factory.get_llm_for_task", side_effect=mock_get_llm):
            llm = await get_llm_for_course_task(TaskType.COURSE_ARCHITECT)
            assert isinstance(llm, FallbackRunnable)
            assert len(llm.fallbacks) == 1
