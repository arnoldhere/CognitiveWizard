# app/agents/roadmap/reference_agent/graph.py
"""
LangGraph assembly for the reference agent.

Keep this graph minimal for now.
Later you can branch by learning style and add image/code/reading nodes.
"""

from __future__ import annotations

from langgraph.graph import StateGraph, START, END
from agents.states.refr_retr_state import AgentState
from agents.services.refr_retr_agent import ReferenceRetriever
from agents.nodes.refr_retr_node import reference_node


def build_reference_graph(service: ReferenceRetriever):
    """
    Build and compile the reference retrieval graph.
    """

    async def node_wrapper(state: AgentState):
        return await reference_node(state, service=service)

    builder = StateGraph(AgentState)
    builder.add_node("reference_search", node_wrapper)
    builder.add_edge(START, "reference_search")
    builder.add_edge("reference_search", END)

    return builder.compile()
