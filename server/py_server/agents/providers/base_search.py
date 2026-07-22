"""
Search provider interface.
This lets you swap Tavily, Serper, Google CSE, or any future provider
without changing graph logic.
"""

from __future__ import annotations
from abc import ABC, abstractmethod


class BaseSearchProvider(ABC):
    """Abstract web search provider."""

    @abstractmethod
    async def search(self, query: str, *, max_results: int = 5) -> list[dict]:
        """
        Search web and return normalized raw results.

        Expected raw dict shape:
        {
            "title": str,
            "url": str,
            "content": str | None,
            "score": float | None,
            "source": str | None
        }
        """
        raise NotImplementedError
