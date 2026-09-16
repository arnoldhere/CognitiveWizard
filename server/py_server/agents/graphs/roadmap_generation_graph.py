"""
agents/graphs/roadmap_generation_graph.py
=========================================
Agentic Roadmap Generation LangGraph pipeline.

Pipeline flow:
  input_normalizer → planner → research → composer → validator → quality_gate → END

Stage details:
  1. input_normalizer  → Validates and canonicalizes learner level, goals, style
  2. planner           → Calls get_llm_for_course_task for structured milestones & phases
  3. research          → Curates categorized references & multimedia via ReferenceResearchService
  4. composer          → Merges plan with references into RoadmapSchema structure (0 extra tokens)
  5. validator         → Schema verification and graceful auto-repair
  6. quality_gate      → Final readiness check, checkpointing, and completion event
"""

from __future__ import annotations
import logging
from langgraph.graph import StateGraph, END

from agents.states.roadmap_agent_state import RoadmapAgentState
from agents.nodes.roadmap.input_normalizer_node import input_normalizer_node
from agents.nodes.roadmap.roadmap_planner_node import roadmap_planner_node
from agents.nodes.roadmap.roadmap_research_node import roadmap_research_node
from agents.nodes.roadmap.roadmap_composer_node import roadmap_composer_node
from agents.nodes.roadmap.roadmap_validator_node import roadmap_validator_node
from agents.nodes.roadmap.roadmap_quality_gate_node import roadmap_quality_gate_node

logger = logging.getLogger(__name__)

builder = StateGraph(RoadmapAgentState)

# Register nodes
builder.add_node("input_normalizer", input_normalizer_node)
builder.add_node("planner", roadmap_planner_node)
builder.add_node("research", roadmap_research_node)
builder.add_node("composer", roadmap_composer_node)
builder.add_node("validator", roadmap_validator_node)
builder.add_node("quality_gate", roadmap_quality_gate_node)

# Linear pipeline edges
builder.set_entry_point("input_normalizer")
builder.add_edge("input_normalizer", "planner")
builder.add_edge("planner", "research")
builder.add_edge("research", "composer")
builder.add_edge("composer", "validator")
builder.add_edge("validator", "quality_gate")
builder.add_edge("quality_gate", END)


def get_compiled_roadmap_graph(checkpointer=None):
    """
    Compile the roadmap generation graph with an optional checkpointer
    (such as MySQLSaver) for state persistence and resumability.
    """
    graph = builder.compile(checkpointer=checkpointer)
    logger.info("[Graph] Roadmap generation graph compiled successfully.")
    return graph


compiled_roadmap_graph = get_compiled_roadmap_graph(None)
