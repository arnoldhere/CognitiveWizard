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
from providers.llm.factory import (
    get_llm_for_course_task,
    get_llm_for_task,
    FallbackRunnable,
)
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
    secondary_client.ainvoke = AsyncMock(
        return_value=AIMessage(content="Fallback provider answer")
    )

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
    client.generate.return_value = LLMResult(
        generations=[[Generation(text="Generated summary text")]]
    )

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


def test_provider_model_resolution_defaults():
    """Verify Provider resolves provider-specific defaults without shadowing."""
    from providers.llm.llm_provider import Provider

    with patch("providers.llm.llm_provider.settings") as mock_settings:
        mock_settings.GROQ_DEF_MODEL = "llama-3.3-70b-versatile"
        mock_settings.HF_DEF_MODEL = "meta-llama/Llama-3.1-8B-Instruct"
        mock_settings.OPENAI_DEF_MODEL = "gpt-4o-mini"
        mock_settings.ANTHROPIC_DEF_MODEL = "claude-3-5-sonnet-20241022"
        mock_settings.DEF_LLM_MODEL = "openai/gpt-oss-120b"
        mock_settings.HF_PROVIDER = "novita"
        mock_settings.HF_API_KEY = "dummy_key"
        mock_settings.HUGGINGFACEHUB_API_TOKEN = "dummy_key"
        mock_settings.GROQ_API_KEY = "dummy_groq_key"
        mock_settings.OPENAI_API_KEY = "dummy_openai_key"
        mock_settings.ANTHROPIC_API_KEY = "dummy_anthropic_key"

        # Groq with no model_name should use GROQ_DEF_MODEL
        p_groq = Provider(provider="groq")
        with patch("langchain_groq.ChatGroq") as mock_chat_groq:
            p_groq.get_llm()
            mock_chat_groq.assert_called_once()
            assert mock_chat_groq.call_args.kwargs["model"] == "llama-3.3-70b-versatile"

        # HF with no model_name should use HF_DEF_MODEL, NOT DEF_LLM_MODEL
        p_hf = Provider(provider="huggingface")
        with patch(
            "providers.llm.llm_provider.HuggingFaceEndpoint"
        ) as mock_endpoint, patch("providers.llm.llm_provider.ChatHuggingFace"):
            p_hf.get_llm()
            mock_endpoint.assert_called_once()
            assert (
                mock_endpoint.call_args.kwargs["repo_id"]
                == "meta-llama/Llama-3.1-8B-Instruct"
            )


def test_provider_model_override_respected():
    """Verify explicit model_name overrides provider defaults."""
    from providers.llm.llm_provider import Provider

    with patch("providers.llm.llm_provider.settings") as mock_settings:
        mock_settings.GROQ_DEF_MODEL = "llama-3.3-70b-versatile"
        mock_settings.HF_DEF_MODEL = "meta-llama/Llama-3.1-8B-Instruct"
        mock_settings.DEF_LLM_MODEL = "openai/gpt-oss-120b"
        mock_settings.GROQ_API_KEY = "dummy_key"
        mock_settings.HF_API_KEY = "dummy_key"
        mock_settings.HUGGINGFACEHUB_API_TOKEN = "dummy_key"

        p_override = Provider(provider="groq", model_name="custom/model-v1")
        with patch("langchain_groq.ChatGroq") as mock_chat_groq:
            p_override.get_llm()
            assert mock_chat_groq.call_args.kwargs["model"] == "custom/model-v1"


def test_get_llm_for_task_multi_provider_chain():
    """Verify get_llm_for_task builds a FallbackRunnable when comma-separated providers are configured."""
    with patch("providers.llm.factory.settings") as mock_settings:
        mock_settings.LLM_PROVIDER_ORDER = "groq,huggingface"
        mock_settings.DEF_LLM_PROVIDER = "groq,huggingface"

        mock_groq = MagicMock()
        mock_hf = MagicMock()

        def mock_create(task_type, profile, name):
            if name == "groq":
                return mock_groq
            return mock_hf

        with patch(
            "providers.llm.factory._create_single_provider_llm", side_effect=mock_create
        ):
            llm = get_llm_for_task(TaskType.SUMMARIZE)
            assert isinstance(llm, FallbackRunnable)
            assert len(llm.fallbacks) == 1
            assert llm.runnable == mock_groq.with_retry.return_value
            assert llm.fallbacks[0] == mock_hf.with_retry.return_value


def test_get_llm_for_task_single_provider():
    """Verify get_llm_for_task returns a single LLM when a single provider is explicitly requested."""
    with patch("providers.llm.factory.settings") as mock_settings:
        mock_settings.DEF_LLM_PROVIDER = "groq,huggingface"

        mock_groq = MagicMock()

        with patch(
            "providers.llm.factory._create_single_provider_llm", return_value=mock_groq
        ) as mock_create:
            llm = get_llm_for_task(TaskType.SUMMARIZE, provider="groq")
            assert llm == mock_groq
            mock_create.assert_called_once()
            assert mock_create.call_args[0][2] == "groq"


def test_fallback_runnable_generate_multi_provider_cascade():
    """Verify FallbackRunnable.generate cascades to fallback when primary throws an error."""
    failing_primary = MagicMock()
    failing_primary.generate.side_effect = Exception("Groq 429 RateLimit")

    working_fallback = MagicMock()
    working_fallback.generate.return_value = LLMResult(
        generations=[[Generation(text="Summary from HF fallback")]]
    )

    fallback_runnable = FallbackRunnable(
        runnable=failing_primary,
        fallbacks=[working_fallback],
        task_name="summarize",
    )

    result = fallback_runnable.generate([["dummy message"]])
    assert len(result.generations) == 1
    assert result.generations[0][0].text == "Summary from HF fallback"
    assert failing_primary.generate.call_count == 1
    assert working_fallback.generate.call_count == 1
