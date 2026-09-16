"""
tests/test_generation_platform.py
==================================
Comprehensive automated test suite for the AI Wizard Generation Platform:
- Roadmap Agentic Graph pipeline
- Guide Agentic Graph pipeline (including educational reviewer loop)
- Celery task routing and queue isolation
- CheckpointManager and EventPublisher
- Schema backward compatibility
"""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from agents.graphs.roadmap_generation_graph import get_compiled_roadmap_graph
from agents.graphs.guide_generation_graph import get_compiled_guide_graph
from agents.states.roadmap_agent_state import RoadmapAgentState
from agents.states.guide_agent_state import GuideAgentState
from schemas.roadmap_schema import RoadmapSchema
from schemas.guide_schema import GuideSchema
from core.celery_app import celery_app
from services.generation.checkpoint_manager import CheckpointManager
from services.generation.event_publisher import EventPublisher, ROADMAP_MESSAGES, GUIDE_MESSAGES, COURSE_MESSAGES


# ─────────────────────────────────────────────────────────────────────────────
# 1. Celery Queues and Task Routing
# ─────────────────────────────────────────────────────────────────────────────

def test_celery_task_queues_and_routing():
    """Verify that all 5 dedicated queues and task routing rules are properly configured."""
    routes = celery_app.conf.task_routes
    assert routes is not None

    expected_routes = {
        "tasks.wizard_tasks.generate_course_task": "wizard_course",
        "tasks.wizard_tasks.run_agentic_workflow_task": "wizard_course",
        "tasks.wizard_tasks.generate_roadmap_task": "wizard_roadmap",
        "tasks.wizard_tasks.generate_guide_task": "wizard_guide",
        "tasks.wizard_tasks.retry_job_task": "wizard_retry",
        "tasks.wizard_tasks.recover_jobs_task": "wizard_recovery",
    }

    for task_name, expected_queue in expected_routes.items():
        assert task_name in routes, f"Missing route for {task_name}"
        assert routes[task_name]["queue"] == expected_queue, (
            f"Expected {task_name} to route to {expected_queue}, got {routes[task_name]['queue']}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# 2. CheckpointManager & EventPublisher
# ─────────────────────────────────────────────────────────────────────────────

def test_checkpoint_manager_idempotency_and_thread_id():
    """Verify thread ID formatting and stage idempotency tracking."""
    cm = CheckpointManager(js_server_url="http://mock-js:5000")

    thread_id = cm.build_thread_id(content_id=42, content_type="Roadmap", timestamp=1700000000)
    assert thread_id == "job_42_roadmap_1700000000"

    assert not cm.is_stage_idempotent("job_123", "planner", 0)
    cm.mark_stage_completed("job_123", "planner", 0)
    assert cm.is_stage_idempotent("job_123", "planner", 0)
    assert not cm.is_stage_idempotent("job_123", "planner", 1)


def test_event_publisher_message_registries():
    """Verify user-friendly status messages and progress percentages for all content types."""
    ep = EventPublisher()

    # Roadmap
    msg, pct = ep.get_message_and_progress("roadmap", "roadmap_planner")
    assert pct == 35
    assert "milestones" in msg.lower()

    # Guide
    msg, pct = ep.get_message_and_progress("guide", "guide_writer")
    assert pct == 70
    assert "step-by-step" in msg.lower()

    # Course
    msg, pct = ep.get_message_and_progress("course", "reviewer")
    assert pct == 85
    assert "pedagogical" in msg.lower()


# ─────────────────────────────────────────────────────────────────────────────
# 3. Roadmap Agentic Graph Execution
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_roadmap_agentic_graph_execution():
    """
    Test the full Roadmap Agentic Graph execution end-to-end:
    input_normalizer → planner → research → composer → validator → quality_gate
    """
    mock_plan_payload = {
        "title": "Full-Stack TypeScript Roadmap",
        "description": "Comprehensive learning path for TypeScript mastery",
        "prerequisites": ["Basic JavaScript", "HTML & CSS"],
        "outcomes": ["Build typed backend APIs", "Architect scalable frontend apps"],
        "learning_phases": ["Phase 1: Fundamentals", "Phase 2: Advanced Types"],
        "phasewise_modules": [
            {
                "phase": "Phase 1: Fundamentals",
                "modules": [
                    {
                        "title": "TypeScript Basics",
                        "description": "Types, interfaces, and compiler settings",
                        "estimated_time": "1 week",
                        "difficulty": "beginner",
                        "topics": [
                            {
                                "name": "Primitive and Literal Types",
                                "details": "Understanding strict null checks, union types, and type aliases",
                                "importance": "Core",
                            }
                        ],
                    }
                ],
            },
            {
                "phase": "Phase 2: Advanced Types",
                "modules": [
                    {
                        "title": "Generics & Conditional Types",
                        "description": "Complex generic types and template literals",
                        "estimated_time": "2 weeks",
                        "difficulty": "advanced",
                        "topics": [
                            {
                                "name": "Infer keyword & Mapped Types",
                                "details": "Deep dive into type transformations",
                                "importance": "High",
                            }
                        ],
                    }
                ],
            },
        ],
    }

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(
        return_value=MagicMock(content=json.dumps(mock_plan_payload))
    )

    with patch(
        "agents.nodes.roadmap.roadmap_planner_node.get_llm_for_course_task",
        new=AsyncMock(return_value=mock_llm),
    ), patch(
        "services.generation.research_service.reference_research_service.research_for_roadmap",
        new=AsyncMock(
            return_value={
                "references": {
                    "official_docs": [
                        {
                            "title": "TypeScript Official Handbook",
                            "url": "https://www.typescriptlang.org/docs/",
                            "description": "The authoritative guide to TypeScript",
                        }
                    ]
                },
                "images": [],
                "warnings": [],
            }
        ),
    ), patch(
        "services.generation.event_publisher.event_publisher.publish_event",
        new=AsyncMock(),
    ), patch(
        "services.generation.checkpoint_manager.checkpoint_manager.persist_stage_checkpoint",
        new=AsyncMock(),
    ):

        graph = get_compiled_roadmap_graph(None)
        initial_state = RoadmapAgentState(
            topic="Full-Stack TypeScript",
            skill_level="intermediate",
            goal="Master type system",
            learning_style="mixed",
            job_id="test_roadmap_001",
            content_id=101,
        )

        final_state = await graph.ainvoke(initial_state)

        assert final_state["pipeline_status"] == "completed"
        draft = final_state["roadmap_draft"]
        assert draft is not None
        assert draft["title"] == "Full-Stack TypeScript Roadmap"
        assert len(draft["phasewise_modules"]) == 2
        assert "official_docs" in draft["references"]
        assert draft["references"]["official_docs"][0]["title"] == "TypeScript Official Handbook"

        # Verify adherence to RoadmapSchema
        validated = RoadmapSchema.model_validate(draft)
        assert validated.content_type == "roadmap"
        assert len(validated.outcomes) == 2


# ─────────────────────────────────────────────────────────────────────────────
# 4. Guide Agentic Graph Execution & Reviewer Loop
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_guide_agentic_graph_execution():
    """
    Test the Guide Agentic Graph execution end-to-end:
    planner → research → writer → reviewer → validator → quality_gate
    """
    mock_plan = {
        "title": "Building REST APIs with FastAPI",
        "description": "Step-by-step practical guide to high-performance Python APIs",
        "target_audience": "Backend Developers",
        "summary": "Build, test, and containerize a production-ready FastAPI application",
        "tools_required": ["Python 3.11", "Uvicorn", "Pydantic"],
        "reading_time_minutes": 30,
        "modules": [
            {
                "title": "Module 1: Setup and Router Architecture",
                "description": "Initialize virtual environment and structure routers",
                "estimated_time": "15 minutes",
                "topics": [
                    {
                        "name": "Dependency Injection with Depends",
                        "details": "High-level guidance on wiring reusable dependencies",
                        "tips": ["Use yield dependencies for db connections"],
                        "common_mistakes": ["Creating new connection per query"],
                    }
                ],
            }
        ],
    }

    mock_written_guide = dict(mock_plan)
    mock_written_guide["modules"][0]["topics"][0]["details"] = (
        "FastAPI provides a powerful dependency injection system using Depends(). "
        "Define generator functions with yield to automatically manage cleanup of resources like database sessions. "
        "This prevents connection leaks and guarantees clean transaction scopes across requests."
    )

    mock_review_passed = {
        "status": "passed",
        "clarity_score": 0.95,
        "suggestions": [],
        "reviewed_modules_count": 1,
    }

    mock_planner_llm = MagicMock()
    mock_planner_llm.ainvoke = AsyncMock(return_value=MagicMock(content=json.dumps(mock_plan)))

    mock_writer_llm = MagicMock()
    mock_writer_llm.ainvoke = AsyncMock(return_value=MagicMock(content=json.dumps(mock_written_guide)))

    mock_reviewer_llm = MagicMock()
    mock_reviewer_llm.ainvoke = AsyncMock(return_value=MagicMock(content=json.dumps(mock_review_passed)))

    async def mock_get_llm(task_type):
        from providers.llm.tasks import TaskType
        if task_type == TaskType.GUIDE_PLANNER:
            return mock_planner_llm
        elif task_type == TaskType.GUIDE_WRITER:
            return mock_writer_llm
        else:
            return mock_reviewer_llm

    with patch(
        "agents.nodes.guide.guide_planner_node.get_llm_for_course_task",
        side_effect=mock_get_llm,
    ), patch(
        "agents.nodes.guide.guide_writer_node.get_llm_for_course_task",
        side_effect=mock_get_llm,
    ), patch(
        "agents.nodes.guide.guide_reviewer_node.get_llm_for_course_task",
        side_effect=mock_get_llm,
    ), patch(
        "services.generation.research_service.reference_research_service.research_for_guide",
        new=AsyncMock(
            return_value={
                "references": {
                    "official_docs": [
                        {"title": "FastAPI Official Documentation", "url": "https://fastapi.tiangolo.com/"}
                    ]
                },
                "warnings": [],
            }
        ),
    ), patch(
        "services.generation.event_publisher.event_publisher.publish_event",
        new=AsyncMock(),
    ), patch(
        "services.generation.checkpoint_manager.checkpoint_manager.persist_stage_checkpoint",
        new=AsyncMock(),
    ):

        graph = get_compiled_guide_graph(None)
        initial_state = GuideAgentState(
            topic="FastAPI REST APIs",
            skill_level="intermediate",
            job_id="test_guide_001",
            content_id=202,
        )

        final_state = await graph.ainvoke(initial_state)

        assert final_state["pipeline_status"] == "completed"
        draft = final_state["guide_draft"]
        assert draft is not None
        assert draft["title"] == "Building REST APIs with FastAPI"
        assert len(draft["modules"]) == 1
        assert "official_docs" in draft["references"]

        # Validate with GuideSchema
        validated = GuideSchema.model_validate(draft)
        assert validated.content_type == "guide"
        assert validated.reading_time_minutes == 30
        assert len(validated.modules[0].topics[0].tips) > 0
