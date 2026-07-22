from typing import TypedDict, NotRequired


class AgentState(TypedDict, total=False):
    """Shared graph state for roadmap generation."""

    topic: str
    skill_level: NotRequired[str]
    goal: NotRequired[str]
    learning_style: NotRequired[str]
    modules: NotRequired[list[str]]
    reference_result: NotRequired[dict]
