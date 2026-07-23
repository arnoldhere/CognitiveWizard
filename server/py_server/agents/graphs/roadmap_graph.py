from langgraph.graph import StateGraph, START, END
from agents.states.roadmap_state import RoadmapState
from agents.nodes.roadmap_nodes import (
    generate_base_roadmap_node,
    fetch_references_node,
    adjust_roadmap_style_node,
)
from agents.services.refr_retr_agent import ReferenceRetriever

def build_roadmap_graph(service: ReferenceRetriever):
    """Build and compile the complete roadmap generation graph."""
    
    async def fetch_wrapper(state: RoadmapState):
        return await fetch_references_node(state, service=service)

    builder = StateGraph(RoadmapState)
    builder.add_node("generate_base_roadmap", generate_base_roadmap_node)
    builder.add_node("fetch_references", fetch_wrapper)
    builder.add_node("adjust_roadmap_style", adjust_roadmap_style_node)
    
    builder.add_edge(START, "generate_base_roadmap")
    builder.add_edge("generate_base_roadmap", "fetch_references")
    builder.add_edge("fetch_references", "adjust_roadmap_style")
    builder.add_edge("adjust_roadmap_style", END)
    
    return builder.compile()
