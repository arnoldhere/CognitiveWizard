import logging
from typing import List, Tuple, Optional
from services.summarization.preprocess.chunker import TextChunker
from services.summarization.preprocess.text_cleaner import TextCleaner
from config.hf_inference import HFClientManager

logger = logging.getLogger(__name__)

DEFAULT_MODEL_MODE = "api"


def _build_chunk_prompt(text: str, mode: str) -> str:
    """Build prompt for individual chunk summarization with mode-specific instructions."""
    mode_instructions = {
        "concise": "Provide an ultra-brief summary (2-3 sentences) capturing only the essential core concepts.",
        "brief": "Provide a concise summary capturing the main points and key information in 1-2 paragraphs.",
        "summary": "Provide a balanced summary covering the main topics and important details in 2-3 paragraphs.",
        "detailed": "Provide a comprehensive summary with key details, examples, and necessary context, maintaining the richness of the original content and give a clear understanding of the chunk in 3-4 paragraphs.",
    }
    instruction = mode_instructions.get(mode, mode_instructions["brief"])
    return f"""You are a helpfull Summarization engine. {instruction}

Content to summarize:
{text}

Summary:"""


def _build_final_prompt(partial_summaries: List[str], mode: str) -> str:
    """Build prompt for final summary consolidation with mode-specific instructions."""
    combined_text = "\n\n".join(
        f"Summary {i+1}: {summary}" for i, summary in enumerate(partial_summaries)
    )
    mode_instructions = {
        "concise": "Create an ultra-brief overall summary (2-3 sentences) distilling only the absolutely essential information from all partial summaries.",
        "brief": "Create a concise overall summary capturing the most important information from all the partial summaries in 1-2 paragraphs.",
        "summary": "Create a balanced final summary integrating the key topics and important details from all partial summaries in 2-3 paragraphs.",
        "detailed": "Create a comprehensive final summary that integrates and synthesizes information from all partial summaries, maintaining important details and context, you may provide graphical representations(from the source) if needed",
    }
    instruction = mode_instructions.get(mode, mode_instructions["brief"])
    return f"""{instruction}

Partial Summaries:
{combined_text}

Final Summary:"""


def _validate_input(
    text: str, mode: str, model_mode: str = DEFAULT_MODEL_MODE
) -> Tuple[bool, str]:
    # """Validate input parameters."""
    if not text or not text.strip():
        return False, "Input text cannot be empty"

    if len(text.strip()) < 50:
        return (
            False,
            "Input text is too short for meaningful summarization (minimum 50 characters)",
        )

    if len(text.strip()) > 500000:  # ~100k words limit
        return False, "Input text is too long (maximum 500,000 characters)"

    if mode not in ["concise", "brief", "summary", "detailed"]:
        return (
            False,
            f"Invalid mode '{mode}'. Must be one of: concise, brief, summary, detailed",
        )

    if model_mode not in ["api", "local"]:
        return False, f"Invalid model mode '{model_mode}'. Must be 'api' or 'local'"

    return True, ""


# ==============
# summarization engine using Hugging face platform
# ==============
def _generate_summary_with_client(
    client, prompt: str, model_mode: str = DEFAULT_MODEL_MODE
) -> str:
    """Generate summary using the appropriate client method."""
    try:
        if model_mode == "api":
            response = client.chat_completion(
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1024,  # Reduced for efficiency
                temperature=0.3,  # Lower temperature for more consistent summaries
            )
            return response.choices[0].message["content"].strip()

        elif model_mode == "local":
            # For local models, we need to handle the response format properly
            response = client(
                prompt, max_new_tokens=512, temperature=0.3, do_sample=True
            )
            if isinstance(response, list) and response:
                return response[0]["generated_text"].strip()
            else:
                return str(response).strip()

    except Exception as e:
        logger.error(f"Error generating summary with {model_mode} client: {str(e)}")
        raise


def Summarization(
    text: str,
    mode: str = "brief",
    model_mode: str = DEFAULT_MODEL_MODE,
    max_chunks: int = 20,
) -> Tuple[bool, str]:
    """
    Enhanced summarization logic with hierarchical processing and robust error handling.
    Flow: Validate -> Clean -> Chunk -> Summarize Chunks -> Consolidate -> Final Summary
    Args:
        text: Input text to summarize
        mode: "brief" or "detailed"
        model_mode: "api" or "local"
        max_chunks: Maximum number of chunks to process (to prevent excessive API calls)
    """
    try:
        # Input validation
        is_valid, error_msg = _validate_input(text, mode, model_mode)
        if not is_valid:
            logger.warning(f"Input validation failed: {error_msg}")
            return False, error_msg
        logger.info(
            f"Starting summarization: mode={mode}, model_mode={model_mode}, text_length={len(text)}"
        )

        # Initialize the inference client
        client = HFClientManager.get_client(mode=model_mode)
        # Clean text
        cleaned_text = TextCleaner.clean(text)
        if len(cleaned_text) < 50:
            return (
                False,
                "Text became too short after cleaning. Please provide more content.",
            )

        logger.debug(f"Text cleaned, length: {len(cleaned_text)}")

        # Chunk text with intelligent splitting
        chunks = TextChunker.chunk(cleaned_text)

        # Limit chunks to prevent excessive processing
        if len(chunks) > max_chunks:
            logger.warning(f"Too many chunks ({len(chunks)}), limiting to {max_chunks}")
            chunks = chunks[:max_chunks]
        if not chunks:
            return False, "Failed to chunk the input text"
        logger.debug(f"Created {len(chunks)} chunks for processing")

        # Process chunks if more than one, otherwise process as single chunk
        if len(chunks) == 1:
            # Single chunk - direct summarization
            prompt = _build_chunk_prompt(chunks[0], mode)
            final_summary = _generate_summary_with_client(client, prompt, model_mode)
        else:
            # Multiple chunks - hierarchical summarization
            partial_summaries = []

            # Summarize each chunk
            for i, chunk in enumerate(chunks):
                logger.debug(f"Processing chunk {i+1}/{len(chunks)}")
                prompt = _build_chunk_prompt(chunk, mode)
                summary = _generate_summary_with_client(client, prompt, model_mode)
                partial_summaries.append(summary)

            # Consolidate partial summaries
            logger.debug("Consolidating partial summaries")
            final_prompt = _build_final_prompt(partial_summaries, mode)
            final_summary = _generate_summary_with_client(
                client, final_prompt, model_mode
            )

        logger.info("Summarization completed successfully")
        return True, final_summary

    except Exception as e:
        error_msg = f"Summarization failed: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return False, error_msg
