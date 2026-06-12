import logging
from typing import List, Tuple, Optional
from config.settings import settings
from langchain_core.messages import HumanMessage, SystemMessage
from providers.llm.factory import get_llm_for_task
from providers.llm.tasks import TaskType
from services.summarization.preprocess.chunker import TextChunker
from services.summarization.preprocess.text_cleaner import TextCleaner

logger = logging.getLogger(__name__)

DEFAULT_MODEL_MODE = "api"
VALID_MODES = ["concise", "brief", "summary", "detailed"]
VALID_MODEL_MODES = ["api"]


# =========================================================
# PROMPT BUILDERS
# =========================================================
def _build_chunk_prompt(text: str, mode: str) -> str:
    """
    Build prompt for individual chunk summarization.
    """

    mode_instructions = {
        "concise": (
            "Provide an ultra-brief summary (2-3 sentences) "
            "capturing only the essential core concepts."
        ),
        "brief": (
            "Provide a concise summary capturing the main points "
            "and key information in 1-2 paragraphs."
        ),
        "summary": (
            "Provide a balanced summary covering the main topics "
            "and important details in 2-3 paragraphs."
        ),
        "detailed": (
            "Provide a comprehensive summary with key details, "
            "examples, and necessary context while maintaining "
            "clarity and coherence."
        ),
    }

    instruction = mode_instructions.get(mode, mode_instructions["brief"])

    return f"""
You are an advanced AI summarization engine.

Task:
{instruction}

Content:
{text}

Summary:
""".strip()


def _build_final_prompt(partial_summaries: List[str], mode: str) -> str:
    """
    Build prompt for final summary synthesis.
    """

    combined_text = "\n\n".join(
        f"Summary {i + 1}: {summary}" for i, summary in enumerate(partial_summaries)
    )

    mode_instructions = {
        "concise": (
            "Create an ultra-brief final summary containing only "
            "the most essential information."
        ),
        "brief": (
            "Create a concise final summary integrating the key "
            "points from all partial summaries."
        ),
        "summary": (
            "Create a balanced final summary integrating important "
            "topics and details from all partial summaries."
        ),
        "detailed": (
            "Create a comprehensive final summary synthesizing all "
            "important information, context, and examples."
        ),
    }

    instruction = mode_instructions.get(mode, mode_instructions["brief"])

    return f"""
{instruction}

Partial Summaries:
{combined_text}

Final Summary:
""".strip()


# =========================================================
# VALIDATION
# =========================================================
def _validate_input(
    text: str,
    mode: str,
    model_mode: str = DEFAULT_MODEL_MODE,
) -> Tuple[bool, str]:
    """
    Validate user input.
    """

    if not text or not text.strip():
        return False, "Input text cannot be empty"

    stripped = text.strip()

    if len(stripped) < 50:
        return (
            False,
            "Input text is too short for meaningful summarization "
            "(minimum 50 characters)",
        )

    if len(stripped) > 500000:
        return (
            False,
            "Input text exceeds maximum allowed size " "(500,000 characters)",
        )

    if mode not in VALID_MODES:
        return (
            False,
            f"Invalid mode '{mode}'. " f"Valid modes: {', '.join(VALID_MODES)}",
        )

    if model_mode not in VALID_MODEL_MODES:
        return (
            False,
            f"Invalid model mode '{model_mode}'. "
            f"Valid modes: {', '.join(VALID_MODEL_MODES)}",
        )

    return True, ""


# =========================================================
# GENERATION ENGINE
# =========================================================
def _generate_summary_with_client(
    client,
    prompt: str,
    model_mode: Optional[str] = None,
) -> str:
    """
    Generate summary using the HuggingFace LangChain endpoint.
    """

    model_mode = model_mode or DEFAULT_MODEL_MODE

    try:
        if model_mode != "api":
            raise ValueError(f"Unsupported model mode: {model_mode}")
        # below generation format is specific suitable for .chat_completions endpoints
        response = client.generate(
            [
                [
                    SystemMessage(
                        content="You are an advanced AI summarization engine."
                    ),
                    HumanMessage(content=prompt),
                ]
            ]
        )

        if not response or not getattr(response, "generations", None):
            raise ValueError("Empty response from HuggingFace LangChain client")

        content = response.generations[0][0].text.strip()

        if not content:
            raise ValueError("Empty summary generated")

        return content

    except Exception as e:
        logger.error(
            f"Error during summary generation " f"(mode={model_mode}): {str(e)}",
            exc_info=True,
        )
        raise


# =========================================================
# MAIN SUMMARIZATION FUNCTION
# =========================================================
def Summarization(
    text: str,
    mode: str = "brief",
    model_mode: str = DEFAULT_MODEL_MODE,
    max_chunks: int = 15,
) -> Tuple[bool, str]:

    try:

        # =====================================================
        # 1. VALIDATE INPUT
        # =====================================================
        is_valid, error_msg = _validate_input(
            text,
            mode,
            model_mode,
        )

        if not is_valid:
            logger.warning(f"Validation failed: {error_msg}")
            return False, error_msg

        logger.info(
            f"Starting summarization | "
            f"mode={mode} | "
            f"model_mode={model_mode} | "
            f"text_length={len(text)}"
        )

        # =====================================================
        # 2. LOAD MODEL CLIENT
        # =====================================================
        # Use factory pattern for task-specific LLM configuration
        # Factory will use optimal temperature (0.3) and max_tokens (1024) for summarization
        client = get_llm_for_task(
            TaskType.SUMMARIZE,
            provider="huggingface",
        )

        if client is None:
            return False, "Failed to initialize model client"

        # =====================================================
        # 3. CLEAN TEXT
        # =====================================================
        cleaned_text = TextCleaner.clean(text)

        if not cleaned_text or len(cleaned_text) < 50:
            return (False, "Text too short after preprocessing")

        # =====================================================
        # 4. CHUNK TEXT
        # =====================================================
        chunks = TextChunker.chunk(cleaned_text)

        if not chunks:
            return False, "Chunk generation failed"

        if len(chunks) > max_chunks:

            logger.warning(
                f"Chunk limit exceeded "
                f"({len(chunks)} chunks). "
                f"Limiting to {max_chunks}."
            )

            chunks = chunks[:max_chunks]

        logger.info(f"Generated {len(chunks)} chunks")

        # =====================================================
        # 5. SINGLE CHUNK FLOW
        # =====================================================
        if len(chunks) == 1:

            prompt = _build_chunk_prompt(
                chunks[0],
                mode,
            )

            final_summary = _generate_summary_with_client(
                client=client,
                prompt=prompt,
                model_mode=model_mode,
            )

        # =====================================================
        # 6. MULTI-CHUNK FLOW
        # =====================================================
        else:

            partial_summaries = []

            for index, chunk in enumerate(chunks):

                logger.info(f"Processing chunk " f"{index + 1}/{len(chunks)}")

                prompt = _build_chunk_prompt(
                    chunk,
                    mode,
                )

                summary = _generate_summary_with_client(
                    client=client,
                    prompt=prompt,
                    model_mode=model_mode,
                )

                partial_summaries.append(summary)

            logger.info("Combining partial summaries")

            final_prompt = _build_final_prompt(
                partial_summaries,
                mode,
            )

            final_summary = _generate_summary_with_client(
                client=client,
                prompt=final_prompt,
                model_mode=model_mode,
            )

        # =====================================================
        # 7. FINAL VALIDATION
        # =====================================================
        if not final_summary or not final_summary.strip():
            return False, "Generated empty final summary"

        logger.info("Summarization completed successfully")

        return True, final_summary.strip()

    except Exception as e:

        logger.error(
            f"Summarization failed: {str(e)}",
            exc_info=True,
        )

        return (False, f"Summarization failed: {str(e)}")
