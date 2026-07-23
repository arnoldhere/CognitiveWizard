"""Main service orchestration layer for the reference agent."""

from __future__ import annotations

import logging
from typing import Optional

from config.exceptions.agentic import *
from agents.providers.base_search import BaseSearchProvider
from agents.providers.tavily_search import TavilySearchProvider
from agents.tools.resource_filter import is_allowed_resource
from agents.tools.resource_ranker import compute_resource_score
from agents.tools.search_query_builder import build_reference_queries
from config.agent_settings import settings as AgenticSettings
from schemas.agentic.reference_agent import (
    ReferenceQueryInput,
    ReferenceSearchResult,
    ResourceItem,
)

logger = logging.getLogger(__name__)


class ReferenceRetriever:
    """Service orchestrator for retrieving learning references."""

    def __init__(self, provider: BaseSearchProvider) -> None:
        # Search provider is injected to keep service provider-agnostic.
        self.provider = provider

    async def fetch_references(
        self, payload: ReferenceQueryInput
    ) -> ReferenceSearchResult:
        """
        Orchestrates complete reference retrieval workflow:

        Phase 1 : Validate request
        Phase 2 : Generate search queries
        Phase 3 : Fetch search results
        Phase 4 : Filter unsupported resources
        Phase 5 : Rank, classify and normalize resources
        Phase 6 : Return structured response
        """

        # ------------------------------------------------------------------
        # Validate incoming request
        if not payload.topic.strip():
            raise SearchValidationError("Topic cannot be empty.")

        # ------------------------------------------------------------------
        # Build optimized search queries from user input
        queries = build_reference_queries(
            topic=payload.topic,
            skill_level=payload.skill_level,
            goal=payload.goal,
        )

        logger.info(
            "Reference search started topic=%s learning_style=%s queries=%d",
            payload.topic,
            payload.learning_style,
            len(queries),
        )

        collected: list[dict] = []
        warnings: list[str] = []

        # ------------------------------------------------------------------
        # Execute searches using configured provider
        # Aggregate all raw search results while collecting failures
        for query in queries:
            try:
                results = await self.provider.search(
                    query,
                    max_results=payload.max_results_per_category,
                )
                collected.extend(results)

                logger.info(
                    "Search completed query=%s results=%d",
                    query,
                    len(results),
                )

            except Exception as exc:
                logger.exception("Search failed query=%s", query)
                warnings.append(f"Search failed for query '{query}': {exc}")

        # ------------------------------------------------------------------
        # Remove unsupported or unsafe resources
        # Keep only URLs allowed by filtering policy
        try:
            filtered = [
                item
                for item in collected
                if item.get("url") and is_allowed_resource(item["url"])
            ]

        except Exception as exc:
            logger.exception(
                "Filtering failed for topic=%s",
                payload.topic,
            )

            raise ResourceFilteringError(
                f"Resource filtering failed for topic '{payload.topic}'"
            ) from exc

        # ------------------------------------------------------------------
        # Phase 5 :
        #   • Remove duplicate URLs
        #   • Compute relevance score
        #   • Infer category/content type
        #   • Normalize into ResourceItem schema
        #   • Sort by relevance
        try:
            resource_items: list[ResourceItem] = []
            seen_urls: set[str] = set()

            for raw in filtered:

                # Skip duplicate resources
                url = str(raw["url"]).strip()
                if url in seen_urls:
                    continue
                seen_urls.add(url)

                # Compute semantic relevance
                score = compute_resource_score(
                    raw,
                    payload.topic,
                )

                # Infer category from URL/source
                category, content_type = self._classify_resource(
                    url,
                    raw.get("source", ""),
                )

                # Normalize into API response model
                resource_items.append(
                    ResourceItem(
                        title=(raw.get("title") or "Untitled resource").strip(),
                        url=url,
                        description=(raw.get("content") or None),
                        source=(raw.get("source") or "web").strip(),
                        category=category,
                        content_type=content_type,
                        relevance_score=score,
                    )
                )

            # Highest relevance first
            resource_items.sort(
                key=lambda x: x.relevance_score,
                reverse=True,
            )

        except Exception as exc:
            logger.exception(
                "Ranking/normalization failed for topic=%s",
                payload.topic,
            )

            raise ResourceRankingError(
                f"Failed to rank resources for topic '{payload.topic}'"
            ) from exc

        logger.info(
            "Reference search finished topic=%s resources=%d",
            payload.topic,
            len(resource_items),
        )

        # ------------------------------------------------------------------
        # Build final response object
        return ReferenceSearchResult(
            topic=payload.topic,
            learning_style=payload.learning_style,
            resources=resource_items,
            warnings=warnings,
        )

    def _classify_resource(self, url: str, source: str) -> tuple[str, str]:
        """
        Infer resource category and content type using URL/source.
        Used during normalization before API response.
        """

        lowered = f"{url} {source}".lower()

        if "youtube.com" in lowered or "youtu.be" in lowered:
            return "youtube", "video"

        if "arxiv.org" in lowered or "ieeexplore" in lowered or "springer" in lowered:
            return "research_paper", "article"

        if "docs." in lowered or "documentation" in lowered:
            return "official_docs", "docs"

        if "course" in lowered or "coursera" in lowered or "udemy" in lowered:
            return "course", "course"

        return "article", "article"


# Initialize the reference retriever as a singleton for use in the node layer
reference_retriever = ReferenceRetriever(TavilySearchProvider(api_key=AgenticSettings.TAVILY_API_KEY))
