"""
agents/graphs/course_generation_graph.py
==========================================
Advanced Course Generation LangGraph pipeline.

Pipeline flow:
  architect → research → lesson_generator → reviewer → [retry loop] → quality_gate → END

Retry loop:
  If reviewer finds failed lessons AND retry_count < 2:
    reviewer → lesson_generator (re-generates only failed lessons)
  Otherwise:
    reviewer → quality_gate

Each node is isolated — a node failure produces warnings but does NOT crash the graph.
The pipeline always reaches quality_gate and sends a webhook (even on partial failure).

Node responsibilities:
  architect_node     → CourseBlueprintSchema (structure only, no prose)
  research_node      → lesson_evidence dict (per-lesson resource packages)
  lesson_gen_node    → generated_lessons list (full CourseLessonSchema per lesson)
  reviewer_node      → reviewer_results + retry signal
  quality_gate_node  → CoursePackageSchema + DB webhook
"""

import logging
from typing import Literal

from langgraph.graph import StateGraph, END

from agents.states.course_agent_state import CourseAgentState
from agents.nodes.learning_architect_node import learning_architect_node
from agents.nodes.research_agent_node import research_agent_node
from agents.nodes.lesson_generator_node import lesson_generator_node
from agents.nodes.pedagogical_reviewer_node import pedagogical_reviewer_node
from agents.nodes.quality_gate_node import quality_gate_node

logger = logging.getLogger(__name__)

_MAX_RETRY_COUNT = 2


def _should_retry_or_gate(state: CourseAgentState) -> Literal["lesson_generator", "quality_gate"]:
    """
    Conditional edge after pedagogical reviewer.

    Sends to lesson_generator if:
      - Any lessons failed the review AND
      - retry_count < _MAX_RETRY_COUNT

    Otherwise proceeds to quality_gate.
    """
    retry_count = state.get("retry_count", 0)
    reviewer_results = state.get("reviewer_results", {}) or {}

    # Check if any lesson failed review
    has_failures = any(
        not review.get("passed", True)
        for review in reviewer_results.values()
    )

    if has_failures and retry_count < _MAX_RETRY_COUNT:
        logger.info(
            "[Graph] Reviewer found failures — routing to lesson_generator (retry %d/%d)",
            retry_count, _MAX_RETRY_COUNT
        )
        return "lesson_generator"

    logger.info("[Graph] Reviewer passed — routing to quality_gate")
    return "quality_gate"


# ── Build the StateGraph ──────────────────────────────────────────────────────
builder = StateGraph(CourseAgentState)

# Register nodes
builder.add_node("architect", learning_architect_node)
builder.add_node("research", research_agent_node)
builder.add_node("lesson_generator", lesson_generator_node)
builder.add_node("reviewer", pedagogical_reviewer_node)
builder.add_node("quality_gate", quality_gate_node)

# Linear pipeline edges
builder.set_entry_point("architect")
builder.add_edge("architect", "research")
builder.add_edge("research", "lesson_generator")
builder.add_edge("lesson_generator", "reviewer")

# Conditional retry loop: reviewer → lesson_generator (retry) or → quality_gate (done)
builder.add_conditional_edges(
    "reviewer",
    _should_retry_or_gate,
    {
        "lesson_generator": "lesson_generator",
        "quality_gate": "quality_gate",
    }
)

builder.add_edge("quality_gate", END)

def get_compiled_course_graph(checkpointer=None):
    """
    Returns the compiled course generation graph, optionally with a checkpointer
    (e.g., AsyncRedisSaver) for durable state persistence across runs.
    """
    graph = builder.compile(checkpointer=checkpointer)
    logger.info("[Graph] Advanced course generation graph compiled successfully.")
    return graph

# For backward compatibility (if any other part uses it synchronously)
compiled_course_graph = get_compiled_course_graph(None)

