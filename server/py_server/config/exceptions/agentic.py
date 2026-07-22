"""
Custom exceptions for agentic ai systems.

Keep exceptions specific so the API layer can return clear,
actionable messages and traceback becomes easier to debug.
"""


class ReferenceAgentError(Exception):
    """Base exception for reference agent failures."""


class SearchProviderError(ReferenceAgentError):
    """Raised when a search provider call fails."""


class SearchTimeoutError(SearchProviderError):
    """Raised when a provider request times out."""


class SearchValidationError(ReferenceAgentError):
    """Raised when input query/state is invalid."""


class ResourceRankingError(ReferenceAgentError):
    """Raised when resource scoring or ranking fails."""


class ResourceFilteringError(ReferenceAgentError):
    """Raised when resource filtering fails."""


class SearchReferenceNodeError(ReferenceAgentError):
    """Raised when node fails to fetch references"""
