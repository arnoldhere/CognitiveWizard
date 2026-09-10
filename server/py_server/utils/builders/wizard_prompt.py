"""
utils/builders/wizard_prompt.py
=================================
Prompt builders for the Wizard course generation pipeline.

Contains:
  build_wizard_prompt()             — existing builder for Roadmap/Guide (unchanged)
  build_learning_architect_prompt() — NEW: blueprint-only structural prompt
  build_lesson_content_prompt()     — NEW: full lesson content generation prompt
  build_pedagogical_review_prompt() — NEW: reviewer checklist prompt (used internally)

Design notes:
 - Roadmap/Guide prompts are preserved exactly to avoid breaking existing flows
 - New prompts are strict about JSON output — no markdown, no extra text
 - Evidence/resources from Research Agent are injected into lesson prompts
   to ground content in real references (evidence-grounded generation)
"""

from typing import Optional, List, Dict, Any
from utils.builders.System_Prompt import sys_prompt

# ═══════════════════════════════════════════════════════════════════════════════
# EXISTING BUILDER — preserved unchanged for Roadmap/Guide
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
    Used for Roadmap / Guide content types.

    Args:
        topic: The subject matter to generate content for.
        content_type: One of roadmap / guide.
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
        prompt += (
            "\n    Learner Context:\n    " + "\n    ".join(learner_ctx_parts) + "\n"
        )

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

    Produces STRUCTURE ONLY — chapter titles, module titles, lesson titles,
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

    learner_ctx_str = (
        "\n".join(learner_ctx) if learner_ctx else "- No additional context"
    )

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
- Generate STRUCTURE ONLY: chapters, modules, lesson titles, objectives, time estimates.
- Do NOT write any lesson content, explanations, or prose.
- Identify the appropriate subject domain (e.g., natural_sciences, computer_science, engineering, business_finance, humanities, medicine).
- Set exercise_paradigm appropriately: "coding" (for IT/software), "analysis" (for natural sciences/geology), "calculation" (for engineering/physics), "case_study" (for business/medicine), "reflection" (for humanities).
- Each lesson should have 2-4 specific, measurable learning objectives.
- Lesson titles should be concrete and descriptive.
- Group logically related lessons into modules (2-5 lessons per module).
- Group logically related modules into chapters (2-4 modules per chapter).
- Total chapters: 2-5 depending on course breadth.
- CRITICAL ROOT JSON FORMAT: The output MUST be a single JSON object starting with "{" and ending with "}". NEVER wrap the entire response in a JSON array [ ... ].

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
- Generate STRUCTURE ONLY: chapters, modules, lesson titles, objectives, time estimates.
- Do NOT write any lesson content, explanations, analogies, code, or exercises.
  (Lesson content will be generated separately by a dedicated content writer.)
- DOMAIN & EXERCISE PARADIGM CLASSIFICATION:
  Identify the academic/professional domain of this topic:
  * "natural_sciences" (Geology, Earth Sciences, Biology, Chemistry, Astronomy) → exercise_paradigm: "analysis"
  * "computer_science" (Programming, Software Engineering, AI, Databases) → exercise_paradigm: "coding"
  * "engineering" (Mechanical, Civil, Electrical Engineering, Physics) → exercise_paradigm: "calculation"
  * "business_finance" (Management, Marketing, Finance, Accounting) → exercise_paradigm: "case_study"
  * "humanities" (History, Philosophy, Literature, Law) → exercise_paradigm: "reflection"
  * "medicine" (Healthcare, Clinical Anatomy, Nursing) → exercise_paradigm: "case_study"
  * "general" (Other topics) → exercise_paradigm: "reflection"
  Set "domain", "domain_label" (e.g., "Geology & Earth Sciences"), and "exercise_paradigm" in the JSON output.
- Lesson titles must be concrete and specific (e.g. "Sedimentary Facies and Stratigraphy" or "Supervised vs Unsupervised Learning")
  NOT generic (e.g. "Introduction", "Overview").
- Each lesson must have 2-4 measurable learning objectives starting with action verbs
  (e.g. "Identify...", "Calculate...", "Analyze...", "Evaluate...").
- Difficulty progression: early chapters = beginner, later chapters = intermediate/advanced.
- Group lessons into modules (2-5 lessons per module, related by theme).
- Group modules into chapters (2-4 modules per chapter, related by learning stage).
- Total course: 2-5 chapters covering the full topic comprehensively.
- Do not repeat the same concept in multiple lessons.
- CRITICAL ROOT JSON FORMAT: The output MUST be a single JSON object starting with "{" and ending with "}". NEVER wrap the entire response in a JSON array [ ... ].

JSON OUTPUT SCHEMA:
{_BLUEPRINT_JSON_SCHEMA}

Return ONLY the JSON. No markdown, no explanation, no extra text.
"""


# ═══════════════════════════════════════════════════════════════════════════════
# NEW: LESSON CONTENT PROMPT — generates full deep lesson
# ═══════════════════════════════════════════════════════════════════════════════


def is_theoretical_lesson(lesson_title: str, learning_objectives: Optional[List[str]] = None) -> bool:
    """
    Detect whether a lesson is primarily theoretical, historical, conceptual, or ethical,
    where hands-on code and coding exercises are unnecessary and should be omitted/replaced
    with conceptual Q&A or reflection.
    """
    title_lower = (lesson_title or "").lower().strip()

    # Explicit coding overrides — if title specifically asks to code/implement/program
    code_overrides = [
        "implement", "coding", "code", "programming", "building a", "build a",
        "script", "syntax", "function", "library", "numpy", "pandas", "pytorch",
        "tensorflow", "scikit", "sql query", "api development", "debugging",
        "hands-on", "lab:", "practical lab"
    ]
    if any(k in title_lower for k in code_overrides):
        return False

    theory_indicators = [
        "history", "evolution", "origin", "timeline", "milestone",
        "ethics", "ethical", "bias", "fairness", "privacy", "governance", "societal",
        "what is", "overview", "introduction to", "intro to", "concepts of", "principles of",
        "philosophy", "philosophical", "foundations of", "theory", "theoretical",
        "taxonomy", "lifecycle", "biological vs", "human vs", "comparison of",
        "comparing", "difference between", "pros and cons", "advantages and disadvantages",
        "limitations of", "future of", "trends in", "challenges in", "applications of",
        "understanding the concept", "types of"
    ]
    if any(k in title_lower for k in theory_indicators):
        return True

    if learning_objectives:
        combined_obj = " ".join(learning_objectives).lower()
        if any(k in combined_obj for k in ["history", "evolution", "ethical", "societal impact", "philosophical"]):
            return True

    return False


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
    domain: Optional[str] = "general",
    domain_label: Optional[str] = "General",
    exercise_paradigm: Optional[str] = "mixed",
) -> str:
    """
    Build the prompt for the Lesson Generator Node.
    Produces a complete, richly detailed lesson with multiple typed content sections
    and domain-adaptive exercises.

    Tailors exercise types (coding, calculation, case_study, analysis, reflection)
    and section composition to the lesson's nature (theoretical vs practical).
    """
    import json as _json

    objectives_str = "\n".join(
        f"- {obj}" for obj in (learning_objectives or ["Understand core concepts"])
    )

    evidence_str = ""
    if evidence:
        evidence_str = (
            "CURATED RESEARCH RESOURCES (incorporate facts/perspectives from these):\n"
            + "\n".join(
                f"- {item.get('title', 'Resource')}: {item.get('url', '')} — {item.get('description', '')}"
                for item in evidence
            )
        )

    suggestions_str = ""
    if reviewer_suggestions:
        suggestions_str = (
            "\n⚠️ IMPROVEMENT REQUIREMENTS (from pedagogical reviewer — MUST address these):\n"
            + "\n".join(f"  - {s}" for s in reviewer_suggestions)
        )

    # Domain & lesson-nature specific exercise guidelines
    domain_lower = (domain or "general").lower().strip()
    paradigm_lower = (exercise_paradigm or "mixed").lower().strip()
    is_theory = is_theoretical_lesson(lesson_title, learning_objectives)

    if is_theory:
        exercise_instructions = """8. Write 1-2 Conceptual Q&A / Reflection exercises (DO NOT write coding exercises):
   - exercise_type MUST be "reflection" or "analysis" (set starter_code: null and language: null).
   - In 'title': A clear descriptive exercise title (e.g. "Concept Check: Key Milestones in ML").
   - In 'description': Pose a thought-provoking conceptual question, historical analysis prompt, or scenario for the learner to answer.
   - In 'solution_hint': Provide key concepts, context, or perspectives to consider.
   - In 'expected_output': Provide a detailed, well-structured model answer / explanation."""
        code_section_rule = "DO NOT write a 'code' section. This is a theoretical/conceptual lesson (e.g. history, foundations, ethics, overview) — omit code entirely and focus on rich explanation, analogy, and real-world example sections."
    elif paradigm_lower == "coding" or domain_lower in ("computer_science", "software_engineering", "data_ai"):
        exercise_instructions = """8. Write 1-2 practical exercises:
   - If this lesson is hands-on/implementation: Write 1-2 coding exercises (exercise_type: "coding") with appropriate language (e.g. "python", "javascript", "sql"), starter_code boilerplate for the CodeSandbox editor, difficulty, solution_hint, and expected_output.
   - If this specific lesson is conceptual or theoretical: Write 1-2 conceptual Q&A / reflection exercises (exercise_type: "reflection" or "analysis") with starter_code: null and language: null, providing a clear question/scenario and comprehensive model answer."""
        code_section_rule = "Write 1 'code' section ONLY if writing or running code is directly relevant to this specific lesson; for conceptual or overview topics, omit the 'code' section."
    elif paradigm_lower == "calculation" or domain_lower in ("engineering", "applied_sciences_engineering", "physics"):
        exercise_instructions = """8. Write 1-2 quantitative / problem-solving calculation exercises:
   - exercise_type MUST be "calculation".
   - Provide a detailed problem statement with numerical parameters, formulas, or design specs.
   - Do NOT write code/starter_code (set starter_code: null, language: null).
   - Include solution_hint (key formulas/steps) and expected_output (step-by-step calculation results)."""
        code_section_rule = "Write a 'code' section ONLY if computing is directly relevant to this specific lesson; otherwise omit."
    elif paradigm_lower == "analysis" or domain_lower in ("natural_sciences", "geology", "biology", "chemistry"):
        exercise_instructions = """8. Write 1-2 scientific analysis or field scenario exercises:
   - exercise_type MUST be "analysis".
   - Provide a real-world scenario (e.g. sample identification, rock stratigraphy, fault line interpretation, environmental data drill).
   - Do NOT write Python code (set starter_code: null, language: null).
   - Include solution_hint (observational cues) and expected_output (scientific deduction/model answer)."""
        code_section_rule = "Omit 'code' section unless scientific computing/data analysis was explicitly requested."
    elif paradigm_lower == "case_study" or domain_lower in ("business_finance", "humanities", "social_sciences", "medicine", "health_medicine"):
        exercise_instructions = """8. Write 1-2 case study dilemma or strategic decision exercises:
   - exercise_type MUST be "case_study" or "reflection".
   - Present a realistic professional or clinical scenario with competing factors and strategic decisions.
   - Do NOT write Python code (set starter_code: null, language: null).
   - Include solution_hint (key trade-offs to weigh) and expected_output (comprehensive evaluation/recommendation)."""
        code_section_rule = "Omit 'code' section unless computing was explicitly requested."
    else:
        exercise_instructions = """8. Write 1-2 practice exercises:
   - exercise_type can be "reflection", "analysis", "calculation", or "case_study".
   - Include detailed scenario description, solution_hint, and expected_output."""
        code_section_rule = "Write a 'code' section only if programming is relevant to the topic."

    # Adapt style instruction based on learning_style
    style_note = ""
    if learning_style and "visual" in learning_style.lower():
        style_note = "Include visual_description sections explaining what diagrams or charts would look like."
    elif learning_style and (
        "coding" in learning_style.lower() or "interactive" in learning_style.lower()
    ):
        style_note = "Emphasize interactive practical application in exercises."
    elif learning_style and "theoretical" in learning_style.lower():
        style_note = "Emphasize explanations and analogies. Include at least one research-backed claim."

    section_order_str = (
        "explanation → analogy → example → common_mistakes → summary"
        if is_theory
        else "explanation → analogy → example → (code if relevant) → common_mistakes → summary"
    )

    return f"""
You are an expert educational content writer in {domain_label} ({domain}) for {skill_level}-level learners.

LESSON TO WRITE:
  Title: {lesson_title}
  Part of Module: {module_title}
  Module Context: {module_description}
  Domain: {domain_label}
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
5. {code_section_rule}
6. Write 1 'common_mistakes' section: 2-3 common errors or misconceptions + how to avoid them.
7. Write 1 'summary' section: 3-5 bullet points recapping key ideas.
{exercise_instructions}
{style_note}

LESSON NATURE & EXERCISE ADAPTATION:
- For theoretical, conceptual, historical, or ethical lessons (like history of ML, ethics, or overview concepts):
  * Skip code sections completely. Do NOT invent unnecessary code snippets.
  * Do NOT create coding exercises. Provide simple, thought-provoking conceptual Q&A / reflection exercises with starter_code: null.
- For practical or hands-on implementation lessons (like building models, coding algorithms, using APIs):
  * Provide working code and hands-on coding exercises.

SECTION ORDER (follow this sequence):
  {section_order_str}

STRICT RULES:
- Output ONLY valid JSON matching the schema below.
- No markdown code fences. No extra text. No comments.
- All section body fields must be non-empty strings.
- Only populate exercises[].starter_code and language if exercise_type is "coding".
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
  "domain": "natural_sciences | computer_science | engineering | business_finance | humanities | medicine | general",
  "domain_label": "e.g. 'Geology & Earth Sciences' or 'Software Development'",
  "exercise_paradigm": "analysis | coding | calculation | case_study | reflection",
  "course_outcomes": ["What learner will be able to do after completing the course", "..."],
  "prerequisites": ["Prior knowledge required", "..."],
  "chapters": [
    {
      "title": "Chapter 1: Foundations",
      "description": "What this chapter covers and why",
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
                "Analyze Y in context of Z",
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
      "title": "Worked Example / Practical Case",
      "body": "Detailed worked example or case with context",
      "language": null,
      "sequence": 3
    },
    {
      "section_type": "code",
      "title": "Code / Method Example (if relevant, otherwise omit this section)",
      "body": "# Working snippet\\ndef example():\\n    pass",
      "language": "python",
      "sequence": 4
    },
    {
      "section_type": "common_mistakes",
      "title": "Common Misconceptions to Avoid",
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
      "description": "Full problem statement / scenario / calculation task / case study",
      "exercise_type": "coding | calculation | case_study | analysis | reflection",
      "difficulty": "medium",
      "starter_code": null,
      "language": null,
      "solution_hint": "Guiding hint to unblock learner",
      "expected_output": "Expected output, calculation result, or model answer conclusion",
      "sequence": 1
    }
  ]
}
"""
