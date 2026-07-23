from utils.builders.System_Prompt import sys_prompt


def build_wizard_prompt(
    topic: str,
    content_type: str,
    details: str | None = None,
    target_audience: str = "General Learners",
    skill_level: str | None = None,
    goal: str | None = None,
    learning_style: str | None = None,
) -> str:
    """
    Builds the complete prompt for the Study-Learning AI Assistant.

    Args:
        topic: The subject matter to generate content for.
        content_type: One of roadmap / course / syllabus / guide / schedule.
        details: Optional free-form extra instructions from the user.
        target_audience: Intended learner group (default: General Learners).
        skill_level: Beginner / intermediate / advanced — narrows the content depth.
        goal: The user's stated learning goal (e.g. 'get a job as ML engineer').
        learning_style: visual / theoretical / interactive — shapes content emphasis.
    """

    content_type = content_type.lower().strip()

    prompt = f"""
      {sys_prompt()}

      ========================================================
      TASK
      ========================================================

      Generate a **{content_type}**.

      Topic:
      {topic}

      """

    # Inject optional learner context to sharpen LLM output
    learner_ctx_parts = []
    if skill_level:
        learner_ctx_parts.append(f"Skill Level: {skill_level}")
    if goal:
        learner_ctx_parts.append(f"Learning Goal: {goal}")
    if learning_style:
        learner_ctx_parts.append(f"Preferred Learning Style: {learning_style}")

    if learner_ctx_parts:
        prompt += "\n    Learner Context:\n    " + "\n    ".join(learner_ctx_parts) + "\n"

    if details:
        prompt += f"""

    Additional User Requirements:
    {details}
    """

    prompt += f"""

    ========================================================
    CONTENT TYPE INSTRUCTIONS
    ========================================================
    {_get_content_type_instruction(content_type)}
    ========================================================
    JSON OUTPUT SCHEMA
    ========================================================
    {_get_json_schema(content_type)}
    ========================================================
    VALIDATION RULES
    ========================================================
    Before returning your response verify that:
    - Output is valid JSON.
    - No Markdown is used.
    - No explanations are included.
    - No comments are included.
    - Every required field exists.
    - No additional fields are added.
    - Module order is logical.
    - Learning progresses from beginner to advanced.
    - No duplicated topics exist.
    - Estimated durations are realistic.
    - Descriptions are meaningful.
    - The JSON can be parsed directly.

    Return ONLY the JSON.
    """

    return prompt


# -------------------------------------------------------------------------
# Content Type Instructions
# -------------------------------------------------------------------------


def _get_content_type_instruction(content_type: str) -> str:

    instructions = {
        "roadmap": """
          Create a milestone-based learning roadmap.
          Requirements:
          - 4-10 clearly named learning phases (e.g. "Phase 1: Foundations")
          - Progress from fundamentals to mastery
          - Explain WHY every phase matters
          - Include practical skills per phase
          - Start with prerequisites the learner should already know
          - List the key outcomes/skills the learner will gain by completing the roadmap
          - End the final phase with projects and next learning steps
        """,
        "course": """
          Design a complete professional course.

          Each module should contain:

          - learning objectives
          - detailed explanations
          - practical activities
          - assignments
          - exercises
          - key takeaways
        Organize like a university course.
        """,
        "syllabus": """
          Create a semester-style syllabus.

          Include:

          - weekly progression
          - learning outcomes
          - assessments
          - assignments
          - revision
          - capstone project
        """,
        "guide": """
          Create a practical step-by-step guide.
          Each step should:

          - explain the concept
          - provide actionable instructions
          - include best practices
          - mention common mistakes
        """,
        "schedule": """
          Create a realistic study schedule.
          Balance:
          - theory
          - practice
          - revision
          - projects
          - assessment
          Avoid learner overload.
          """,
    }

    return instructions.get(
        content_type,
        """Generate structured educational content following best educational practices.""",
    )


# -------------------------------------------------------------------------
# JSON Schemas
# -------------------------------------------------------------------------


def _get_json_schema(content_type: str) -> str:

    schemas = {
        "roadmap": """
{
  "title": "",
  "prerequisites": [],
  "outcomes": [],
  "learning_phases": [],
  "phasewise_modules": [
    {
      "phase": "",
      "modules": [
        {
          "title": "",
          "description": "",
          "estimated_time": "",
          "difficulty": "",
          "topics": [
            {
              "name": "",
              "details": "",
              "importance": ""
            }
          ]
        }
      ]
    }
  ]
}
""",
        "course": """
{
  "title": "",
  "description": "",
  "target_audience": "",
  "course_outcomes": [],
  "prerequisites": [],
  "modules": [
    {
      "title": "",
      "description": "",
      "estimated_time": "",
      "difficulty": "",
      "learning_objectives": [],
      "key_takeaways": [],
      "topics": [
        {
          "name": "",
          "content": "",
          "practical_task": "",
          "resources": []
        }
      ]
    }
  ]
}
""",
        "syllabus": """
{
  "title": "",
  "description": "",
  "target_audience": "",
  "course_outcomes": [],
  "prerequisites": [],
  "modules": [
    {
      "title": "",
      "week": "",
      "description": "",
      "topics": [],
      "assignment": "",
      "assessment": ""
    }
  ]
}
""",
        "guide": """
{
  "title": "",
  "description": "",
  "target_audience": "",
  "modules": [
    {
      "title": "",
      "description": "",
      "estimated_time": "",
      "topics": [
        {
          "name": "",
          "details": "",
          "tips": [],
          "common_mistakes": []
        }
      ]
    }
  ]
}
""",
        "schedule": """
{
  "title": "",
  "description": "",
  "target_audience": "",
  "study_duration": "",
  "daily_commitment": "",
  "modules": [
    {
      "title": "",
      "description": "",
      "estimated_time": "",
      "topics": [
        {
          "name": "",
          "details": ""
        }
      ]
    }
  ]
}
""",
    }

    return schemas.get(
        content_type,
        """
{
  "title": "",
  "description": "",
  "target_audience": "",
  "modules": [
    {
      "title": "",
      "description": "",
      "estimated_time": "",
      "topics": [
        {
          "name": "",
          "details": ""
        }
      ]
    }
  ]
}
""",
    )
