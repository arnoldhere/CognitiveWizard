"""
agents/graphs/guide_generation_graph.py
======================================
Agentic Guide Generation LangGraph pipeline.

Pipeline flow:
  planner → research → writer → reviewer → [conditional retry] → validator → quality_gate → END

Stage details:
  1. planner      → Creates module blueprint, tools required, reading time
  2. research     → Gathers official documentation and tutorial citations
  3. writer       → Expands modules with concrete steps, code, tips, and common pitfalls
  4. reviewer     → Evaluates pedagogical clarity and actionability (optional 1x revision)
  5. validator    → Enforces GuideSchema adherence and runs auto-repairs
  6. quality_gate → Final checks, checkpointing, and completion event dispatch
"""

from __future__ import annotations
import logging
from typing import Literal
from langgraph.graph import StateGraph, END

from agents.states.guide_agent_state import GuideAgentState
from agents.nodes.guide.guide_planner_node import guide_planner_node
from agents.nodes.guide.guide_research_node import guide_research_node
from agents.nodes.guide.guide_writer_node import guide_writer_node
from agents.nodes.guide.guide_reviewer_node import guide_reviewer_node
from agents.nodes.guide.guide_validator_node import guide_validator_node
from agents.nodes.guide.guide_quality_gate_node import guide_quality_gate_node

logger = logging.getLogger(__name__)

_MAX_GUIDE_RETRIES = 1


def _should_revise_or_validate(
    state: GuideAgentState,
) -> Literal["writer", "validator"]:
    """Conditional edge after educational review."""
    retry_count = state.get("retry_count", 0)
    review = state.get("review_result", {}) or {}

    if review.get("status") == "needs_revision" and retry_count < _MAX_GUIDE_RETRIES:
        logger.info(
            "[GuideGraph] Review requested revision (retry %d/%d) — routing to writer",
            retry_count,
            _MAX_GUIDE_RETRIES,
        )
        return "writer"

    return "validator"


builder = StateGraph(GuideAgentState)

# Register nodes
builder.add_node("planner", guide_planner_node)
builder.add_node("research", guide_research_node)
builder.add_node("writer", guide_writer_node)
builder.add_node("reviewer", guide_reviewer_node)
builder.add_node("validator", guide_validator_node)
builder.add_node("quality_gate", guide_quality_gate_node)

# Graph edges
builder.set_entry_point("planner")
builder.add_edge("planner", "research")
builder.add_edge("research", "writer")
builder.add_edge("writer", "reviewer")

# Conditional retry loop: reviewer → writer (retry) or → validator (proceed)
builder.add_conditional_edges(
    "reviewer",
    _should_revise_or_validate,
    {
        "writer": "writer",
        "validator": "validator",
    },
)

builder.add_edge("validator", "quality_gate")
builder.add_edge("quality_gate", END)


def get_compiled_guide_graph(checkpointer=None):
    """
    Compile the guide generation graph with an optional checkpointer
    (such as MySQLSaver) for state persistence and resumability.
    """
    graph = builder.compile(checkpointer=checkpointer)
    logger.info("[Graph] Guide generation graph compiled successfully.")
    return graph


compiled_guide_graph = get_compiled_guide_graph(None)
