"""
Specialized prompt builders for the Agentic Guide Generation pipeline.
"""

from typing import Any, Dict, List, Optional
import json


def build_guide_planner_prompt(
    topic: str,
    details: Optional[str] = None,
    skill_level: Optional[str] = "beginner",
    target_audience: Optional[str] = "General Learners",
    guide_style: Optional[str] = "Step-by-step tutorial",
) -> str:
    """Build the prompt for the Guide Planner Node."""
    details_str = (
        f"- Specific Requirements: {details}"
        if details
        else "- No custom details provided."
    )

    return f"""
You are an expert technical author and instructional designer.

TASK:
Create a comprehensive, production-quality guide outline and blueprint for:
Topic: {topic}
Skill Level: {skill_level}
Target Audience: {target_audience}
Style: {guide_style}
Context:
{details_str}

REQUIREMENTS:
1. Divide the guide into 3 to 6 logical, progressive modules (e.g., Environment Setup, Core Implementation, Advanced Features, Production Best Practices).
2. For each module, list 1 to 3 concrete actionable topics/steps.
3. List essential tools, libraries, or prerequisites in 'tools_required'.
4. Estimate realistic reading/practice time in minutes (15-60 minutes).
5. Output ONLY valid JSON matching the schema below. No markdown fences, no conversational prose.

JSON OUTPUT SCHEMA:
{{
  "title": "{topic}: Complete Step-by-Step Guide",
  "description": "Comprehensive practical tutorial on {topic}",
  "target_audience": "{target_audience}",
  "summary": "Executive summary of the guide and what the reader will build or achieve.",
  "tools_required": ["Tool 1", "Tool 2"],
  "reading_time_minutes": 25,
  "modules": [
    {{
      "title": "Module 1: Title",
      "description": "What this module accomplishes",
      "estimated_time": "15 minutes",
      "topics": [
        {{
          "name": "Topic or Step Name",
          "details": "High-level guidance on what needs to be implemented here",
          "tips": ["Tip 1", "Tip 2"],
          "common_mistakes": ["Pitfall 1", "Pitfall 2"]
        }}
      ]
    }}
  ]
}}
""".strip()


def build_guide_writer_prompt(
    topic: str,
    guide_plan: Dict[str, Any],
    references: Optional[Dict[str, Any]] = None,
    review_feedback: Optional[List[str]] = None,
) -> str:
    """Build the prompt for the Guide Writer Node to generate thorough step-by-step content."""
    plan_json = json.dumps(guide_plan, indent=2)
    ref_summary = ""
    if references:
        ref_items = []
        for cat, items in references.items():
            for it in items[:3]:
                ref_items.append(
                    f"- [{cat}] {it.get('title', '')}: {it.get('description', '')}"
                )
        if ref_items:
            ref_summary = "Authoritative References to Incorporate:\n" + "\n".join(
                ref_items
            )

    feedback_str = ""
    if review_feedback:
        feedback_str = "Reviewer Feedback to Address in this revision:\n" + "\n".join(
            f"- {f}" for f in review_feedback
        )

    return f"""
You are a senior technical writer crafting an exhaustive, crystal-clear step-by-step guide.

Topic: {topic}

Guide Blueprint:
{plan_json}

{ref_summary}

{feedback_str}

TASK:
Write the complete guide content adhering strictly to the provided blueprint.
For EVERY topic within EVERY module:
1. Provide rich, detailed explanations and concrete implementation steps in `details` (minimum 3-4 sentences, including code blocks or commands where applicable).
2. Provide 2-3 high-value practitioner `tips`.
3. Provide 2-3 `common_mistakes` with explicit explanations of how to avoid or fix them.

OUTPUT FORMAT:
Return ONLY valid JSON matching the exact schema of the blueprint. No extra conversational text or markdown code fences outside JSON.
""".strip()


def build_guide_reviewer_prompt(
    topic: str,
    guide_draft: Dict[str, Any],
) -> str:
    """Build the prompt for the Guide Reviewer Node."""
    modules = guide_draft.get("modules", [])
    brief_overview = []
    for m in modules:
        brief_overview.append(f"Module: {m.get('title')}")
        for t in m.get("topics", []):
            brief_overview.append(
                f"  - Step: {t.get('name')} (details len: {len(t.get('details', ''))}, tips: {len(t.get('tips', []))}, mistakes: {len(t.get('common_mistakes', []))})"
            )

    content_summary = "\n".join(brief_overview)

    return f"""
You are a pedagogical reviewer and senior technical editor evaluating a technical guide.

Topic: {topic}

Guide Structure & Content Coverage:
{content_summary}

EVALUATION CRITERIA:
1. Clarity & Actionability: Are the instructions clear, practical, and progressive?
2. Completeness: Does each module have rich details, practical tips, and common mistakes?
3. Pedagogy: Can a learner follow this without encountering confusing gaps?

INSTRUCTIONS:
- If clarity is satisfactory and topics have solid details, mark status as 'passed'.
- If there are critical omissions or shallow explanations, mark status as 'needs_revision' and list actionable suggestions.
- Return ONLY valid JSON matching the schema below.

JSON OUTPUT SCHEMA:
{{
  "status": "passed",
  "clarity_score": 0.92,
  "suggestions": ["Optional suggestion for improvement"],
  "reviewed_modules_count": {len(modules)}
}}
""".strip()
