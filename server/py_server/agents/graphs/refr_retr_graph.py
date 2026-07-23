# app/agents/roadmap/reference_agent/graph.py
"""
LangGraph assembly for the reference retriever agent.

Architecture (reusable design):
- `build_reference_graph(service)` — factory that accepts any BaseSearchProvider-backed
  ReferenceRetriever, returns a compiled graph.  Use this if you need a custom provider
  instance (e.g. in tests or a different API module).

- `compiled_reference_graph` — ready-to-use singleton wired to the default Tavily provider.
  Import this directly from any API module that needs reference enrichment.

Future extension points (add nodes before END):
  - style_adapter_node  → adjust content for visual / interactive / theoretical style
  - image_search_node   → fetch images via Tavily for visual+project learning
  - coding_problems_node → suggest LeetCode / HackerRank links for interactive style
"""

from __future__ import annotations

from langgraph.graph import StateGraph, START, END
from agents.states.refr_retr_state import AgentState
from agents.services.refr_retr_agent import ReferenceRetriever, reference_retriever
from agents.nodes.refr_retr_node import reference_node


def build_reference_graph(service: ReferenceRetriever):
    """
    Build and compile the reference retrieval LangGraph.

    Args:
        service: A ReferenceRetriever instance (injected for testability / provider flexibility).
    Returns:
        A compiled LangGraph ready to be invoked via `await graph.ainvoke(state)`.
    """

    async def node_wrapper(state: AgentState):
        return await reference_node(state, service=service)

    builder = StateGraph(AgentState)
    builder.add_node("reference_search", node_wrapper)
    builder.add_edge(START, "reference_search")
    builder.add_edge("reference_search", END)

    return builder.compile()


# ---------------------------------------------------------------------------
# Default compiled singleton — import this anywhere you need reference search.
# Example:
#   from agents.graphs.refr_retr_graph import compiled_reference_graph
#   final_state = await compiled_reference_graph.ainvoke(state)
# ---------------------------------------------------------------------------
compiled_reference_graph = build_reference_graph(reference_retriever)
