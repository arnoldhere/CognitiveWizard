from typing import Annotated, TypedDict, Dict, Any, List, Optional


class CourseAgentState(TypedDict):
    # Inputs
    content_id: Optional[int]
    topic: str
    content_type: str
    details: str
    skill_level: str
    goal: str
    learning_style: str
    user_role: str
    feedback: Optional[str]

    # Internal & Outputs
    course_draft: Dict[str, Any]
    warnings: List[str]
