import re
from typing import List


class TextChunker:
    """
    Intelligently splits text into overlapping chunks while preserving sentence boundaries.
    """

    @staticmethod
    def chunk(
        text: str,
        max_chunk_size: int = 1000,  # characters, not words
        overlap: int = 200,
        min_chunk_size: int = 100,
    ) -> List[str]:
        """
        Split text into chunks with intelligent boundary detection.

        Args:
            text: Input text to chunk
            max_chunk_size: Maximum characters per chunk
            overlap: Characters to overlap between chunks
            min_chunk_size: Minimum characters per chunk

        Returns:
            List of text chunks
        """
        if not text or len(text) <= max_chunk_size:
            return [text] if text else []

        chunks = []
        start = 0

        while start < len(text):
            # Calculate end position for this chunk
            end = start + max_chunk_size

            if end >= len(text):
                # Last chunk
                chunk = text[start:].strip()
                if len(chunk) >= min_chunk_size:
                    chunks.append(chunk)
                break

            # Try to find a good breaking point near the end
            chunk = text[start:end]

            # Look for sentence endings within the last 20% of the chunk
            search_start = max(start, end - int(max_chunk_size * 0.2))
            sentence_end = TextChunker._find_sentence_boundary(text, search_start, end)

            if sentence_end > start + min_chunk_size:
                # Found a good sentence boundary
                chunk = text[start:sentence_end].strip()
                chunks.append(chunk)
                start = sentence_end - overlap  # Include overlap
            else:
                # No good boundary found, break at word boundary
                word_boundary = TextChunker._find_word_boundary(text, end)
                chunk = text[start:word_boundary].strip()
                if len(chunk) >= min_chunk_size:
                    chunks.append(chunk)
                start = word_boundary - overlap

            # Ensure we don't get stuck
            if start >= end:
                start = end

        return chunks

    @staticmethod
    def _find_sentence_boundary(text: str, start: int, end: int) -> int:
        """Find the best sentence boundary within the given range."""
        # Sentence ending patterns (in order of preference)
        patterns = [
            r'\.["\']?\s+[A-Z]',  # Period followed by capital letter
            r'[.!?]["\']?\s*$',  # Sentence end at end of text
            r'[.!?]["\']?\s+',  # General sentence endings
        ]

        for pattern in patterns:
            matches = list(re.finditer(pattern, text[start:end]))
            if matches:
                # Return the end position of the last match
                match = matches[-1]
                return start + match.end()

        return end  # No boundary found

    @staticmethod
    def _find_word_boundary(text: str, pos: int) -> int:
        """Find the nearest word boundary before the given position."""
        # Look backwards for whitespace
        for i in range(pos, max(0, pos - 50), -1):
            if text[i].isspace():
                return i + 1  # Include the space in the chunk

        return pos  # No boundary found
