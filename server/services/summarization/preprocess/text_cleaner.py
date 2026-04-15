import re
from typing import Tuple
from typing import Optional


class TextCleaner:
    """
    Cleans and normalizes raw text while preserving important content.
    """

    @staticmethod
    def clean(text: str) -> str:
        """
        Clean text while preserving essential punctuation and structure.
        """
        if not text:
            return ""

        # Normalize whitespace (convert multiple spaces/tabs/newlines to single space)
        text = re.sub(r"\s+", " ", text)

        # Remove excessive whitespace around punctuation
        text = re.sub(r"\s*([.!?])\s*", r"\1 ", text)

        # Fix spacing around commas
        text = re.sub(r"\s*,\s*", ", ", text)

        # Remove control characters but keep newlines and tabs
        text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)

        # Remove zero-width characters and other invisible unicode
        text = re.sub(r"[\u200b-\u200f\u2028-\u202f\ufeff]", "", text)

        return text.strip()

    @staticmethod
    def validate_content(text: str) -> Tuple[bool, str]:
        """
        Validate if the extracted content is meaningful for summarization.
        """
        if not text or not text.strip():
            return False, "No content extracted"

        cleaned = TextCleaner.clean(text)
        word_count = len(cleaned.split())

        if word_count < 10:
            return False, f"Content too short ({word_count} words, minimum 10)"

        if word_count > 10000:  # ~50k characters
            return False, f"Content too long ({word_count} words, maximum 10,000)"

        # Check if content has meaningful text (not just symbols/numbers)
        alpha_ratio = sum(c.isalpha() for c in cleaned) / len(cleaned) if cleaned else 0
        if alpha_ratio < 0.3:
            return False, "Content appears to be mostly non-textual"

        return True, f"Valid content ({word_count} words)"
