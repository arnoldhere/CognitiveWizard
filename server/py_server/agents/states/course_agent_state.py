"""
agents/states/course_agent_state.py
====================================
LangGraph state schema for the advanced course generation pipeline.

State flows through these nodes in order:
  1. learning_architect_node  → populates `course_blueprint`
  2. research_agent_node      → populates `lesson_evidence`
  3. lesson_generator_node    → populates `generated_lessons`
  4. pedagogical_reviewer_node → validates lessons, may trigger retry
  5. quality_gate_node        → produces `quality_gate_result`, assembles `course_draft`

Each node returns only the fields it updates — LangGraph merges them.
"""

from typing import Annotated, TypedDict, Dict, Any, List, Optional


class CourseAgentState(TypedDict):
    # ── Inputs (set once at graph entry) ─────────────────────────────────────
    content_id: Optional[int]      # WizardContent.id — used for webhook callbacks
    topic: str
    content_type: str
    details: str
    skill_level: str
    goal: str
    learning_style: str
    user_role: str
    feedback: Optional[str]        # Tutor feedback for regeneration flows

    # ── Stage 1: Learning Architect output ────────────────────────────────────
    # Course blueprint — structure-only (phases/modules/lesson titles + objectives).
    # No lesson prose here. Fast + cheap first pass.
    course_blueprint: Optional[Dict[str, Any]]

    # ── Stage 2: Research Agent output ───────────────────────────────────────
    # Evidence package keyed by lesson title.
    # Example: {"What is AI?": [ResourceItem, ...], ...}
    lesson_evidence: Optional[Dict[str, List[Dict[str, Any]]]]

    # ── Stage 3: Lesson Generator output ─────────────────────────────────────
    # List of fully generated lesson dicts (CourseLessonSchema serialized).
    # Keyed internally by lesson title for the reviewer to reference.
    generated_lessons: Optional[List[Dict[str, Any]]]

    # ── Stage 4: Pedagogical Reviewer output ─────────────────────────────────
    # Dict mapping lesson_title → LessonReviewSchema result.
    reviewer_results: Optional[Dict[str, Dict[str, Any]]]

    # Retry counter for lesson regeneration loops (max 2 retries per lesson).
    retry_count: int

    # ── Stage 5: Quality Gate output + final assembly ─────────────────────────
    quality_gate_result: Optional[Dict[str, Any]]

    # Final serialized CoursePackageSchema — sent to JS server via webhook.
    course_draft: Dict[str, Any]

    # ── Cross-cutting ─────────────────────────────────────────────────────────
    # Accumulated non-fatal warnings from all nodes.
    warnings: List[str]

    # Current pipeline status label (sent via status webhook for real-time UX).
    # Values: generating_blueprint | generating_evidence | generating_lessons |
    #         reviewing_content | quality_check | complete | error
    pipeline_status: str
