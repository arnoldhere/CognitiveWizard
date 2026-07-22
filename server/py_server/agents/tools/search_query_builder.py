# app/agents/roadmap/reference_agent/utils/query_builder.py
"""
Deterministic query builder.

Important:
- keep query generation predictable
- avoid letting LLM invent search terms too early
- easier to test and debug
"""

from __future__ import annotations


def build_reference_queries(
    topic: str, skill_level: str | None = None, goal: str | None = None
) -> list[str]:
    """
    Build a small set of high-signal search queries.

    Returns a mix of:
    - official docs
    - tutorials
    - roadmap/resources
    - YouTube playlists
    """
    topic = topic.strip()

    queries = [
        f"{topic} official documentation",
        f"{topic} tutorial",
        f"{topic} roadmap",
        f"{topic} best resources",
        f"{topic} YouTube playlist",
    ]

    if skill_level:
        queries.append(f"{skill_level} {topic} learning path")

    if goal:
        queries.append(f"{topic} {goal} resources")

    # Deduplicate while preserving order
    seen: set[str] = set()
    unique_queries: list[str] = []
    for q in queries:
        normalized = q.strip().lower()
        if normalized not in seen:
            seen.add(normalized)
            unique_queries.append(q)

    return unique_queries
