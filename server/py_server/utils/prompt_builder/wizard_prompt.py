from utils.prompt_builder.System_Prompt import sys_prompt


def build_wizard_prompt(
    topic: str,
    content_type: str,
    details: str | None = None,
    target_audience: str = "General Learners",
) -> str:
    """
    Builds the complete prompt for the Study-Learning AI Assistant.
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

      Target Audience:
      {target_audience}
      """

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
    ✓ Output is valid JSON.
    ✓ No Markdown is used.
    ✓ No explanations are included.
    ✓ No comments are included.
    ✓ Every required field exists.
    ✓ No additional fields are added.
    ✓ Module order is logical.
    ✓ Learning progresses from beginner to advanced.
    ✓ No duplicated topics exist.
    ✓ Estimated durations are realistic.
    ✓ Descriptions are meaningful.
    ✓ The JSON can be parsed directly.

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
          - 4-10 learning phases
          - Progress from fundamentals to mastery
          - Explain WHY every phase matters
          - Include practical skills
          - End with projects and next learning steps
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
  "description": "",
  "target_audience": "",
  "learning_goals": [],
  "prerequisites": [],
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
