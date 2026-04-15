import logging
import re
from difflib import SequenceMatcher

logger = logging.getLogger(__name__)


def validate(data, auto_fix: bool = True):
    """
    Validate and optionally fix quiz data format.

    Args:
        data: Raw quiz data from LLM
        auto_fix: Whether to automatically fix common issues

    Returns:
        tuple: (is_valid, fixed_data or original_data)
    """

    logger.debug(f"Validating data type: {type(data)}")

    #  Basic checks
    if not isinstance(data, list):
        logger.error(f"Data is not a list, got {type(data)}")
        return False, data

    if len(data) == 0:
        logger.error("Quiz data list is empty")
        return False, data

    fixed_data = []
    issues = []

    for q_idx, q in enumerate(data):
        try:
            #  Ensure dict
            if not isinstance(q, dict):
                issues.append(f"Question {q_idx}: Not a dictionary")
                continue

            # Required fields
            required_fields = ["question", "options", "answer"]
            missing = [f for f in required_fields if f not in q]
            if missing:
                issues.append(f"Question {q_idx}: Missing fields {missing}")
                continue

            question_text = str(q.get("question", "")).strip()
            options = q.get("options", [])
            answer = q.get("answer")

            if not question_text:
                issues.append(f"Question {q_idx}: Empty question text")
                continue

            # ---------------------------
            #  Normalize OPTIONS
            # ---------------------------
            if not isinstance(options, list):
                if auto_fix:
                    options = [str(options)]
                else:
                    issues.append(f"Question {q_idx}: Options must be list")
                    continue

            cleaned_options = []

            for opt in options:
                if isinstance(opt, dict):
                    opt_str = list(opt.values())[0]

                elif isinstance(opt, str):
                    opt_str = opt.strip()
                    # remove A., B), etc.
                    opt_str = re.sub(r"^[A-Da-d][\.\)]\s*", "", opt_str)

                else:
                    opt_str = str(opt).strip()

                opt_str = opt_str.replace("\\", "").strip()

                if opt_str:
                    cleaned_options.append(opt_str)

            # Ensure exactly 4 options
            if len(cleaned_options) < 4:
                if auto_fix and len(cleaned_options) >= 2:
                    while len(cleaned_options) < 4:
                        cleaned_options.append(f"Option {len(cleaned_options) + 1}")
                else:
                    issues.append(
                        f"Question {q_idx}: Need 4 options, got {len(cleaned_options)}"
                    )
                    continue

            elif len(cleaned_options) > 4:
                cleaned_options = cleaned_options[:4]

            # ---------------------------
            #  Normalize ANSWER
            # ---------------------------
            answer_str = str(answer).strip() if answer is not None else ""

            # Case: "A", "B", etc.
            if len(answer_str) == 1 and answer_str.upper() in ["A", "B", "C", "D"]:
                opt_idx = ord(answer_str.upper()) - ord("A")
                if opt_idx < len(cleaned_options):
                    answer_str = cleaned_options[opt_idx]

            # Clean quotes + escapes
            answer_str = re.sub(r'^["\']|["\']$', "", answer_str)
            answer_str = answer_str.replace("\\", "").strip()

            # Fallback if empty
            if not answer_str:
                if auto_fix:
                    logger.warning(
                        f"Question {q_idx}: Empty answer → defaulting to first option"
                    )
                    answer_str = cleaned_options[0]
                else:
                    issues.append(f"Question {q_idx}: Empty answer")
                    continue

            # ---------------------------
            #  Validate ANSWER in OPTIONS
            # ---------------------------
            answer_norm = answer_str.lower()
            options_norm = [opt.lower() for opt in cleaned_options]

            if answer_norm not in options_norm:
                if auto_fix:
                    best_match = None
                    best_ratio = 0

                    for opt in cleaned_options:
                        ratio = SequenceMatcher(None, answer_norm, opt.lower()).ratio()

                        if ratio > best_ratio:
                            best_ratio = ratio
                            best_match = opt

                    if best_match and best_ratio > 0.5:
                        logger.info(
                            f"Q{q_idx}: Auto-fixed answer '{answer_str}' → '{best_match}'"
                        )
                        answer_str = best_match
                    else:
                        logger.warning(f"Q{q_idx}: No match → using first option")
                        answer_str = cleaned_options[0]
                else:
                    issues.append(f"Question {q_idx}: Answer not in options")
                    continue

            # ---------------------------
            #  Final object
            # ---------------------------
            fixed_question = {
                "question": question_text,
                "options": cleaned_options,
                "answer": answer_str,
            }

            fixed_data.append(fixed_question)

        except Exception as e:
            logger.error(f"Error processing question {q_idx}: {str(e)}")
            issues.append(f"Question {q_idx}: {str(e)}")
            continue

    # ---------------------------
    #  Final validation
    # ---------------------------
    if len(fixed_data) == 0:
        logger.error(f"No valid questions found. Issues: {issues}")
        return False, fixed_data

    if issues:
        logger.warning(f"Validation completed with {len(issues)} issues")

    logger.info(f"Validation successful: {len(fixed_data)} valid questions")

    return True, fixed_data
