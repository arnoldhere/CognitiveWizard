from typing import TypedDict, NotRequired, Dict, Any

class RoadmapState(TypedDict, total=False):
    """Shared state for the complete roadmap generation workflow."""
    topic: str
    content_type: str
    details: NotRequired[str]
    skill_level: NotRequired[str]
    goal: NotRequired[str]
    learning_style: NotRequired[str]
    
    # Generated intermediate and final results
    base_roadmap: NotRequired[Dict[str, Any]]
    reference_result: NotRequired[Dict[str, Any]]
    adjusted_roadmap: NotRequired[Dict[str, Any]]
    
    # Errors/warnings
    warnings: NotRequired[list[str]]
