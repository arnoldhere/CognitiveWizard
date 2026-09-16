"""
agents/states/roadmap_agent_state.py
====================================
Agent state for the Roadmap Generation LangGraph workflow.
"""

from typing import Any, Dict, List, Optional
from typing_extensions import TypedDict


class RoadmapAgentState(TypedDict, total=False):
    # Request metadata
    topic: str
    content_id: Optional[int]
    content_type: str
    skill_level: str
    goal: str
    learning_style: str
    details: str
    user_role: str
    job_id: str
    retry_count: int

    # Stage outputs
    normalized_input: Dict[str, Any]
    roadmap_plan: Dict[str, Any]
    references: Dict[str, Any]
    images: List[str]
    roadmap_draft: Dict[str, Any]

    # Pipeline management
    pipeline_status: str  # queued, planning, researching, composing, validating, completed, error
    warnings: List[str]
    error: Optional[str]
