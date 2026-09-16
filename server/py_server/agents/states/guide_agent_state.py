"""
agents/states/guide_agent_state.py
==================================
Agent state for the Guide Generation LangGraph workflow.
"""

from typing import Any, Dict, List, Optional
from typing_extensions import TypedDict


class GuideAgentState(TypedDict, total=False):
    # Request metadata
    topic: str
    content_id: Optional[int]
    content_type: str
    skill_level: str
    details: str
    target_audience: str
    guide_style: str
    job_id: str
    retry_count: int

    # Stage outputs
    guide_plan: Dict[str, Any]
    references: Dict[str, Any]
    guide_draft: Dict[str, Any]
    review_result: Dict[str, Any]

    # Pipeline management
    pipeline_status: str  # queued, planning, researching, writing, reviewing, validating, completed, error
    warnings: List[str]
    error: Optional[str]
