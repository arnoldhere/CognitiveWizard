"""
Tavily search provider.

Tavily is used here because it is search-native for AI apps and returns
reranked snippets that are useful for agent workflows.
"""

from __future__ import annotations
import logging
from typing import Any
import httpx
from agents.providers.base_search import BaseSearchProvider
from config.agent_settings import settings as AgenticSettings
from config.exceptions.agentic import *

logger = logging.getLogger(__name__)


class TavilySearchProvider(BaseSearchProvider):
    """Async Tavily search API wrapper"""

    def __init__(
        self,
        api_key: str,
        *,
        base_url: str = "https://api.tavily.com/search",
        timeout: float = AgenticSettings.SEARCH_TIMEOUT,
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url
        self.timeout = timeout

    async def search(self, query: str, *, max_results=5) -> list[dict[str, Any]]:

        if not query.strip():
            raise SearchProviderError("Empty search query is not accepted...")

        # prepare the request payload and headers
        payload = {
            "query": query,
            "max_results": max_results,
            "include_answer": False,
            "include_raw_content": False,
            "include_images": False,
        }
        header = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(self.base_url, json=payload, headers=header)
                res.raise_for_status()
                data = res.json()
        except httpx.ReadTimeout as e:
            logger.exception("Tavily search request timed out.\n", e)
            raise SearchTimeoutError("Tavily search request timed out.") from e
        except httpx.HTTPStatusError as exc:
            logger.exception(
                "Tavily search failed with status=%s query=%s",
                exc.response.status_code if exc.response else "unknown",
                query,
            )
            raise SearchProviderError(
                f"Tavily search failed for query '{query}' with status "
                f"{exc.response.status_code if exc.response else 'unknown'}"
            ) from exc
        except httpx.RequestError as exc:
            logger.exception("Tavily network error for query=%s", query)
            raise SearchProviderError(
                f"Tavily request failed for query: {query}"
            ) from exc
        except Exception as exc:
            logger.exception("Unexpected Tavily error for query=%s", query)
            raise SearchProviderError(
                f"Unexpected Tavily error for query: {query}"
            ) from exc

        # extract the fetched results from the response
        raw_res = data.get("results", [])
        normalized: list[dict[str, Any]] = []

        for i in raw_res:
            normalized.append(
                {
                    "title": i.get("title", "").strip(),
                    "url": i.get("url", "").strip(),
                    "content": (
                        i.get("content", "").strip() if i.get("content") else None
                    ),
                    "score": float(i.get("score", 0.0) or 0.0),
                    "source": i.get("source", "tavily"),
                }
            )
        return normalized
