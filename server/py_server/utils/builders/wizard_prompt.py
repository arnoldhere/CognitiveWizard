"""
utils/builders/wizard_prompt.py
=================================
Prompt builders for the Wizard course generation pipeline.

Contains:
  build_wizard_prompt()             — existing builder for Roadmap/Guide/Schedule (unchanged)
  build_learning_architect_prompt() — NEW: blueprint-only structural prompt
  build_lesson_content_prompt()     — NEW: full lesson content generation prompt
  build_pedagogical_review_prompt() — NEW: reviewer checklist prompt (used internally)

Design notes:
 - Roadmap/Guide/Schedule prompts are preserved exactly to avoid breaking existing flows
 - New prompts are strict about JSON output — no markdown, no extra text
 - Evidence/resources from Research Agent are injected into lesson prompts
   to ground content in real references (evidence-grounded generation)
"""

from typing import Optional, List, Dict, Any
from utils.builders.System_Prompt import sys_prompt


# ═══════════════════════════════════════════════════════════════════════════════
# EXISTING BUILDER — preserved unchanged for Roadmap/Guide/Schedule
# ═══════════════════════════════════════════════════════════════════════════════

def build_wizard_prompt(
    topic: str,
    content_type: str,
    details: str | None = None,
    target_audience: str = "General Learners",
    skill_level: str | None = None,
    goal: str | None = None,
    learning_style: str | None = None,
    user_role: str | None = "user",
) -> str:
    """
    Builds the complete prompt for the Study-Learning AI Assistant.
    Used for Roadmap / Guide / Schedule content types.

    Args:
        topic: The subject matter to generate content for.
        content_type: One of roadmap / guide / schedule.
        details: Optional free-form extra instructions from the user.
        target_audience: Intended learner group (default: General Learners).
        skill_level: Beginner / intermediate / advanced.
        goal: The user's stated learning goal.
        learning_style: visual / theoretical / interactive.
        user_role: user / tutor / admin.
    """

    content_type = content_type.lower().strip()
    role_str = (user_role or "user").lower().strip()

    prompt = f"""
      {sys_prompt()}

      ========================================================
      TASK
      ========================================================

      Generate a **{content_type}**.

      Topic:
      {topic}

      """

    # Role-specific framing
    if role_str == "tutor":
        prompt += """
      USER ROLE: TUTOR / INSTRUCTOR (Authoring & Publishing Mode)
      The requester is an educator, faculty member, or professional tutor creating curriculum materials for published student use.
      - Structure the content with rigorous pedagogical depth, teaching objectives, module breakdown, student activity suggestions, and evaluation criteria.
      - Ensure the output can be published directly as an authoritative guide/course/roadmap for learners.
      """
    else:
        prompt += """
      USER ROLE: LEARNER / STUDENT (Self-Study Mode)
      The requester is a student or self-directed learner.
      - Structure the content for intuitive personal study, self-paced progress, actionable milestones, and clear practical application.
      """

    # Inject optional learner context
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


# ═══════════════════════════════════════════════════════════════════════════════
# NEW: LEARNING ARCHITECT PROMPT — structure only, no lesson prose
# ═══════════════════════════════════════════════════════════════════════════════

def build_learning_architect_prompt(
    topic: str,
    content_type: str,
    details: Optional[str] = None,
    skill_level: Optional[str] = None,
    goal: Optional[str] = None,
    learning_style: Optional[str] = None,
    user_role: Optional[str] = "user",
    feedback: Optional[str] = None,
    existing_blueprint: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Build the Learning Architect prompt.

    Produces STRUCTURE ONLY — phase titles, module titles, lesson titles,
    learning objectives, and time estimates. NO lesson prose.

    If feedback + existing_blueprint are provided: modify the blueprint
    based on tutor/learner feedback.
    """
    import json as _json

    role_str = (user_role or "user").lower().strip()
    role_desc = (
        "This is authored by a TUTOR/INSTRUCTOR for published student use."
        if role_str == "tutor"
        else "This is for a SELF-DIRECTED LEARNER."
    )

    learner_ctx = []
    if skill_level:
        learner_ctx.append(f"- Skill Level: {skill_level}")
    if goal:
        learner_ctx.append(f"- Learning Goal: {goal}")
    if learning_style:
        learner_ctx.append(f"- Learning Style: {learning_style}")
    if details:
        learner_ctx.append(f"- Additional Requirements: {details}")

    learner_ctx_str = "\n".join(learner_ctx) if learner_ctx else "- No additional context"

    # Feedback-aware modification mode
    if feedback and existing_blueprint:
        return f"""
You are an expert curriculum architect modifying an existing course blueprint.

Original Blueprint:
{_json.dumps(existing_blueprint, indent=2)}

Tutor/Learner Feedback:
{feedback}

Topic: {topic}
{role_desc}
Learner Context:
{learner_ctx_str}

TASK: Regenerate the ENTIRE course blueprint incorporating the feedback above.
Keep what works, fix what the feedback addresses.

IMPORTANT RULES:
- Generate STRUCTURE ONLY: phases, modules, lesson titles, objectives, time estimates.
- Do NOT write any lesson content, explanations, or prose.
- Each lesson should have 2-4 specific, measurable learning objectives.
- Lesson titles should be concrete and descriptive (e.g. "Variables and Data Types in Python").
- Group logically related lessons into modules (2-6 lessons per module).
- Group logically related modules into phases (2-4 modules per phase).
- Total phases: 2-6 depending on course breadth.

JSON OUTPUT SCHEMA:
{_BLUEPRINT_JSON_SCHEMA}

Return ONLY the JSON. No markdown, no explanation, no extra text.
"""

    return f"""
You are an expert curriculum architect.

TASK: Design a comprehensive course blueprint for the following topic.

Topic: {topic}
Content Type: {content_type}
{role_desc}

Learner Context:
{learner_ctx_str}

IMPORTANT RULES — READ CAREFULLY:
- Generate STRUCTURE ONLY: phases, modules, lesson titles, objectives, time estimates.
- Do NOT write any lesson content, explanations, analogies, code, or exercises.
  (Lesson content will be generated separately by a dedicated content writer.)
- Lesson titles must be concrete and specific (e.g. "Supervised vs Unsupervised Learning")
  NOT generic (e.g. "Introduction", "Overview").
- Each lesson must have 2-4 measurable learning objectives starting with action verbs
  (e.g. "Define...", "Implement...", "Compare...", "Analyze...").
- Difficulty progression: early phases = beginner, later phases = intermediate/advanced.
- Group lessons into modules (2-6 lessons per module, related by theme).
- Group modules into phases (2-4 modules per phase, related by learning stage).
- Total course: 2-6 phases covering the full topic comprehensively.
- Do not repeat the same concept in multiple lessons.

JSON OUTPUT SCHEMA:
{_BLUEPRINT_JSON_SCHEMA}

Return ONLY the JSON. No markdown, no explanation, no extra text.
"""


# ═══════════════════════════════════════════════════════════════════════════════
# NEW: LESSON CONTENT PROMPT — generates full deep lesson
# ═══════════════════════════════════════════════════════════════════════════════

def build_lesson_content_prompt(
    lesson_title: str,
    learning_objectives: List[str],
    module_title: str,
    module_description: str,
    difficulty: str,
    skill_level: str,
    goal: str,
    learning_style: str,
    evidence: List[Dict[str, Any]],
    reviewer_suggestions: Optional[List[str]] = None,
) -> str:
    """
    Build the Lesson Content Generator prompt.

    Takes the lesson blueprint + research evidence and generates a full lesson
    with multiple typed content sections and exercises.

    Evidence is presented as available references — the LLM is instructed to
    ground its explanations in them where relevant.
    """
    import json as _json

    objectives_str = "\n".join(f"  - {obj}" for obj in learning_objectives) or "  - Understand this lesson's core concepts"

    # Format evidence compactly to avoid huge prompts
    evidence_str = ""
    if evidence:
        evidence_items = []
        for i, res in enumerate(evidence[:5], 1):
            evidence_items.append(
                f"  [{i}] {res.get('title', 'Resource')} ({res.get('resource_type', 'article')}) — {res.get('url', '')}"
            )
        evidence_str = "Available References (cite these in your examples where relevant):\n" + "\n".join(evidence_items)
    else:
        evidence_str = "No external references available — use general knowledge."

    # Retry suggestions from reviewer
    suggestions_str = ""
    if reviewer_suggestions:
        suggestions_str = (
            "\n⚠️ IMPROVEMENT REQUIREMENTS (from pedagogical reviewer — MUST address these):\n"
            + "\n".join(f"  - {s}" for s in reviewer_suggestions)
        )

    # Adapt style instruction based on learning_style
    style_note = ""
    if learning_style and "visual" in learning_style.lower():
        style_note = "Include visual_description sections explaining what diagrams or charts would look like."
    elif learning_style and ("coding" in learning_style.lower() or "interactive" in learning_style.lower()):
        style_note = "Emphasize code sections and include at least 2 coding exercises with starter code."
    elif learning_style and "theoretical" in learning_style.lower():
        style_note = "Emphasize explanations and analogies. Include at least one research-backed claim."

    return f"""
You are an expert educational content writer for {skill_level}-level learners.

LESSON TO WRITE:
  Title: {lesson_title}
  Part of Module: {module_title}
  Module Context: {module_description}
  Difficulty: {difficulty}
  Learner Goal: {goal or "Gain knowledge in this subject"}

LEARNING OBJECTIVES (the lesson MUST cover all of these):
{objectives_str}

{evidence_str}

{suggestions_str}

CONTENT REQUIREMENTS:
1. Write a concise overview (2-4 sentences) summarizing what this lesson covers.
2. Write an 'explanation' section: clear, thorough explanation of the core concept.
   Minimum 150 words. No jargon without definition.
3. Write at least 1 'example' section: concrete worked example (with context/story).
4. Write at least 1 'analogy' section: real-world analogy that a {skill_level} learner would relate to.
5. Write at least 1 'code' section (if relevant): working, correct code snippet with a brief explanation.
   Set the language field appropriately (python/javascript/sql/bash etc).
6. Write 1 'common_mistakes' section: 2-3 common errors or misconceptions + how to avoid them.
7. Write 1 'summary' section: 3-5 bullet points recapping key ideas.
8. Write 1-2 exercises:
   - At least 1 coding exercise with starter_code, difficulty, and solution_hint.
   - Optional: 1 reflection exercise if appropriate.
{style_note}

SECTION ORDER (follow this sequence):
  explanation → analogy → example → code → common_mistakes → summary

STRICT RULES:
- Output ONLY valid JSON matching the schema below.
- No markdown code fences. No extra text. No comments.
- All section body fields must be non-empty strings.
- Code sections must have the 'language' field set.
- exercises[].starter_code should be filled for coding exercises (not null).
- Do not include resources[] — they are injected separately.

JSON OUTPUT SCHEMA:
{_LESSON_JSON_SCHEMA}

Return ONLY the JSON.
"""


# ═══════════════════════════════════════════════════════════════════════════════
# Existing content type helpers (unchanged — used by build_wizard_prompt)
# ═══════════════════════════════════════════════════════════════════════════════

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


# ═══════════════════════════════════════════════════════════════════════════════
# JSON Schema constants for new prompts
# ═══════════════════════════════════════════════════════════════════════════════

_BLUEPRINT_JSON_SCHEMA = """
{
  "title": "Course Title",
  "description": "2-3 sentence course description",
  "target_audience": "Who this course is for",
  "course_outcomes": ["What learner will be able to do after completing the course", "..."],
  "prerequisites": ["Prior knowledge required", "..."],
  "phases": [
    {
      "title": "Phase 1: Foundations",
      "description": "What this phase covers and why",
      "estimated_duration": "2 weeks",
      "modules": [
        {
          "title": "Module Title",
          "description": "What this module covers",
          "difficulty": "beginner",
          "estimated_time": "3 hours",
          "learning_objectives": ["Module-level objective 1", "..."],
          "key_takeaways": ["Key skill 1", "..."],
          "lessons": [
            {
              "title": "Specific Lesson Title",
              "learning_objectives": [
                "Define X and explain its significance",
                "Implement Y using Z",
                "Compare A vs B"
              ],
              "estimated_time": "20 minutes"
            }
          ]
        }
      ]
    }
  ]
}
"""

_LESSON_JSON_SCHEMA = """
{
  "title": "Lesson Title",
  "overview": "2-4 sentence lesson summary shown before opening the lesson",
  "estimated_time": "20 minutes",
  "sections": [
    {
      "section_type": "explanation",
      "title": "Optional sub-heading",
      "body": "Full detailed prose content — minimum 150 words for explanation",
      "language": null,
      "sequence": 1
    },
    {
      "section_type": "analogy",
      "title": "Real-world analogy",
      "body": "Analogy content",
      "language": null,
      "sequence": 2
    },
    {
      "section_type": "example",
      "title": "Worked Example",
      "body": "Detailed worked example with context",
      "language": null,
      "sequence": 3
    },
    {
      "section_type": "code",
      "title": "Code Example",
      "body": "# Full working code snippet\\ndef example():\\n    pass",
      "language": "python",
      "sequence": 4
    },
    {
      "section_type": "common_mistakes",
      "title": "Common Mistakes to Avoid",
      "body": "List of pitfalls and how to avoid them",
      "language": null,
      "sequence": 5
    },
    {
      "section_type": "summary",
      "title": "Key Takeaways",
      "body": "Bullet-point recap of the lesson",
      "language": null,
      "sequence": 6
    }
  ],
  "exercises": [
    {
      "title": "Exercise title",
      "description": "Full problem statement",
      "exercise_type": "coding",
      "difficulty": "medium",
      "starter_code": "# Write your solution here\\ndef solution():\\n    pass",
      "language": "python",
      "solution_hint": "Think about using a loop...",
      "expected_output": "Expected output or model answer",
      "sequence": 1
    }
  ]
}
"""
