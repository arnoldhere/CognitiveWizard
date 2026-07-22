"""
Resource filtering helpers.
Used to remove low-quality or irrelevant sources before ranking.
"""

from __future__ import annotations
from urllib.parse import urlparse

BLOCKLIST_DOMAINS = {
    "pinterest.com",
    "quora.com",
    "reddit.com",
    "facebook.com",
    "instagram.com",
    "tiktok.com",
}

PREFERRED_DOMAINS = {
    "docs.python.org",
    "developer.mozilla.org",
    "wikipedia.org",
    "arxiv.org",
    "coursera.org",
    "youtube.com",
    "github.com",
    "researchgate.net",
    "medium.com",
    "stackoverflow.com",
}


def is_allowed_resource(url: str) -> bool:
    """Return False for blocked domains."""
    try:
        domain = urlparse(url).netloc.lower()
        domain = domain.replace("www.", "")
    except Exception:
        return False

    return domain not in BLOCKLIST_DOMAINS


def domain_preference_score(url: str) -> float:
    """Return a small boost for trusted domains."""
    try:
        domain = urlparse(url).netloc.lower().replace("www.", "")
    except Exception:
        return 0.0

    if domain in PREFERRED_DOMAINS:
        return 0.15

    if any(domain.endswith(f".{d}") for d in PREFERRED_DOMAINS):
        return 0.10

    return 0.0
