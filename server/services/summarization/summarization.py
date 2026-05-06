import logging
from typing import List, Tuple, Optional
from services.summarization.preprocess.chunker import TextChunker
from services.summarization.preprocess.text_cleaner import TextCleaner
from config.hf_inference import HFClientManager

logger = logging.getLogger(__name__)

DEFAULT_MODEL_MODE = "local"


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
    client, prompt: str, model_mode: Optional[str] = None
) -> str:
    model_mode = model_mode or DEFAULT_MODEL_MODE

    try:
        if model_mode == "api":
            response = client.chat_completion(
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1024,
                temperature=0.3,
            )

            return response.choices[0].message.get("content", "").strip()

        elif model_mode == "local":
            response = client(
                prompt,
                max_new_tokens=512,
                temperature=0.3,
                do_sample=False,  # deterministic
            )

            if isinstance(response, list) and response:
                generated = response[0].get("generated_text", "")
                return generated[len(prompt) :].strip()

            return str(response).strip()

        else:
            raise ValueError(f"Unsupported model_mode: {model_mode}")

    except Exception as e:
        logger.error(f"Error generating summary with {model_mode}: {str(e)}")
        raise


def Summarization(
    text: str,
    mode: str = "brief",
    model_mode: str = DEFAULT_MODEL_MODE,
    max_chunks: int = 20,
) -> Tuple[bool, str]:

    try:
        # -------------------------
        # 1. Validate input
        # -------------------------
        is_valid, error_msg = _validate_input(text, mode, model_mode)
        if not is_valid:
            logger.warning(f"Input validation failed: {error_msg}")
            return False, error_msg

        logger.info(
            f"Starting summarization: mode={mode}, model_mode={model_mode}, text_length={len(text)}"
        )

        # -------------------------
        # 2. Load correct client
        # -------------------------
        client = HFClientManager.get_client(mode=model_mode)

        # Safety checks (important)
        if model_mode == "api" and not hasattr(client, "chat_completion"):
            return False, "Invalid API client provided"

        if model_mode == "local" and not callable(client):
            return False, "Invalid local model (must be callable)"

        # -------------------------
        # 3. Clean text
        # -------------------------
        cleaned_text = TextCleaner.clean(text)
        if len(cleaned_text) < 50:
            return False, "Text too short after cleaning"

        # -------------------------
        # 4. Chunk text
        # -------------------------
        chunks = TextChunker.chunk(cleaned_text)

        if not chunks:
            return False, "Chunking failed"

        if len(chunks) > max_chunks:
            logger.warning(f"Too many chunks ({len(chunks)}), limiting to {max_chunks}")
            chunks = chunks[:max_chunks]

        logger.debug(f"{len(chunks)} chunks created")

        # -------------------------
        # 5. Define execution functions
        # -------------------------
        def summarize_chunk(prompt: str) -> str:
            if model_mode == "api":
                response = client.chat_completion(
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=1024,
                    temperature=0.3,
                )
                return response.choices[0].message.get("content", "").strip()

            elif model_mode == "local":
                response = client(
                    prompt,
                    max_new_tokens=512,
                    do_sample=False,  # deterministic output
                    temperature=0.3,
                )

                if isinstance(response, list) and response:
                    generated = response[0].get("generated_text", "")
                    return generated[len(prompt) :].strip()

                return str(response).strip()

        # -------------------------
        # 6. Summarization flow
        # -------------------------
        if len(chunks) == 1:
            prompt = _build_chunk_prompt(chunks[0], mode)
            final_summary = summarize_chunk(prompt)

        else:
            partial_summaries = []

            for i, chunk in enumerate(chunks):
                logger.debug(f"Processing chunk {i+1}/{len(chunks)}")
                prompt = _build_chunk_prompt(chunk, mode)
                summary = summarize_chunk(prompt)
                partial_summaries.append(summary)

            logger.debug("Merging partial summaries")

            final_prompt = _build_final_prompt(partial_summaries, mode)
            final_summary = summarize_chunk(final_prompt)

        logger.info("Summarization completed successfully")
        return True, final_summary

    except Exception as e:
        logger.error(f"Summarization failed: {str(e)}", exc_info=True)
        return False, f"Summarization failed: {str(e)}"
