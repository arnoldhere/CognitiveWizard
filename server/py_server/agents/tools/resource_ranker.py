# app/agents/roadmap/reference_agent/utils/ranking.py
"""
Ranking logic for learning resources.

Combine provider score, domain trust, and query relevance.
"""

from __future__ import annotations
from dataclasses import dataclass
from agents.tools.resource_filter import domain_preference_score


def compute_resource_score(raw: dict, topic: str) -> float:
    """
    Compute a normalized ranking score in [0, 1].

    Factors:
    - provider score
    - keyword relevance
    - trusted domain boost
    """
    base = float(raw.get("score") or 0.0)
    title = (raw.get("title") or "").lower()
    content = (raw.get("content") or "").lower()
    url = raw.get("url") or ""

    topic_l = topic.lower()
    keyword_hits = 0

    if topic_l in title:
        keyword_hits += 2
    if topic_l in content:
        keyword_hits += 1

    keyword_bonus = min(keyword_hits * 0.08, 0.24)
    trust_bonus = domain_preference_score(url)

    score = min(max(base + keyword_bonus + trust_bonus, 0.0), 1.0)
    return round(score, 4)
