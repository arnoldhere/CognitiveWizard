"""
utils/builders/roadmap_prompt.py
================================
Specialized prompt builders for the Agentic Roadmap Generation pipeline.
"""

from typing import Optional


def build_roadmap_planner_prompt(
    topic: str,
    details: Optional[str] = None,
    skill_level: Optional[str] = None,
    goal: Optional[str] = None,
    learning_style: Optional[str] = None,
    user_role: Optional[str] = "user",
) -> str:
    """
    Build the prompt for the Roadmap Planner Node.
    Produces structured learning milestones, prerequisites, outcomes, and phasewise modules.
    """
    role_str = (user_role or "user").lower().strip()
    role_desc = (
        "This curriculum is authored by a TUTOR / INSTRUCTOR for published student use."
        if role_str == "tutor"
        else "This learning path is designed for a SELF-DIRECTED LEARNER."
    )

    learner_ctx = []
    if skill_level:
        learner_ctx.append(f"- Skill Level: {skill_level}")
    if goal:
        learner_ctx.append(f"- Learning Goal: {goal}")
    if learning_style:
        learner_ctx.append(f"- Preferred Learning Style: {learning_style}")
    if details:
        learner_ctx.append(f"- Specific Requirements: {details}")

    learner_ctx_str = "\n".join(learner_ctx) if learner_ctx else "- Standard learner profile"

    return f"""
You are an expert AI curriculum and roadmap architect.

TASK:
Design a comprehensive, milestone-based learning roadmap for the following subject:

Topic: {topic}
Role: {role_desc}
Learner Context:
{learner_ctx_str}

REQUIREMENTS:
1. Divide the learning path into 4 to 8 clearly named chronological learning phases (e.g., "Phase 1: Foundations", "Phase 2: Core Concepts", "Phase 3: Advanced Topics", "Phase 4: Capstone & Industry Mastery").
2. Start with clear, realistic prerequisites that the learner should know before beginning.
3. Define key learning outcomes: tangible skills and abilities gained by completing the roadmap.
4. Each phase MUST contain 1 to 4 concrete modules with realistic estimated times (e.g., '1 week', '2 weeks').
5. Each module MUST contain specific topics with:
   - name: clear topic title
   - details: concise summary of why it matters and what to learn
   - importance: 'Core', 'High', or 'Recommended'
6. Progression must be strictly pedagogical from beginner fundamentals to advanced mastery.
7. Return ONLY valid JSON matching the schema below. No markdown fences, no explanatory prose.

JSON OUTPUT SCHEMA:
{{
  "title": "{topic} Roadmap",
  "description": "2-3 sentence overview of this learning path",
  "prerequisites": ["Prerequisite 1", "Prerequisite 2"],
  "outcomes": ["Outcome 1", "Outcome 2"],
  "learning_phases": ["Phase 1: Title", "Phase 2: Title"],
  "phasewise_modules": [
    {{
      "phase": "Phase 1: Title",
      "modules": [
        {{
          "title": "Module Title",
          "description": "Module overview",
          "estimated_time": "2 weeks",
          "difficulty": "beginner",
          "topics": [
            {{
              "name": "Topic Name",
              "details": "What to learn and key concepts to master",
              "importance": "Core"
            }}
          ]
        }}
      ]
    }}
  ]
}}
""".strip()
