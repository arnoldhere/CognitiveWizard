from typing import TypedDict, NotRequired


class AgentState(TypedDict, total=False):
    """
    Generic shared graph state for agentic workflows.

    Designed to be reusable across multiple features (wizard roadmap,
    future course builder, summarization, etc.).  Only `topic` is
    mandatory; all other fields are optional so callers set only what
    they need.
    """

    # ---------- core input fields ----------
    topic: str               # Main subject / query for the agent
    content_type: str        # e.g. 'roadmap', 'course', 'syllabus' — used for routing
    details: NotRequired[str]        # Free-form extra context from the caller
    skill_level: NotRequired[str]    # beginner / intermediate / advanced
    goal: NotRequired[str]           # User's stated learning goal
    learning_style: NotRequired[str] # visual / theoretical / interactive

    # ---------- agent internal / output fields ----------
    modules: NotRequired[list[str]]      # Roadmap phase/module titles for targeted search
    reference_result: NotRequired[dict]  # Structured output from reference_node
    message: NotRequired[str]            # Status message set by the last node executed
    warnings: NotRequired[list[str]]     # Non-fatal issues accumulated during the run
