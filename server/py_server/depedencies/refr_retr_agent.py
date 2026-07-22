"""
Dependency helpers.

This keeps provider creation out of business logic.
"""

from __future__ import annotations
import os
from agents.providers.tavily_search import TavilySearchProvider
from agents.services.refr_retr_agent import ReferenceRetriever
from config.agent_settings import settings


def build_reference_service() -> ReferenceRetriever:
    """Factory for reference service."""
    api_key = settings.TAVILY_API_KEY
    if not api_key:
        raise RuntimeError("TAVILY_API_KEY is not configured.")

    provider = TavilySearchProvider(api_key=api_key)
    return ReferenceRetriever(provider=provider)
