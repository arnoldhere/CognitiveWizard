"""
Wizard API router.

Orchestrates:
1. LLM-based content generation (roadmap / course / syllabus / guide / schedule).
2. Reference retriever agent (refr_retr) for roadmap requests — runs concurrently
    with LLM generation and injects curated web references into the response.

Reusability note:
The reference agent (`compiled_reference_graph`) is a standalone singleton
that any future API module can import and invoke independently.
"""

import asyncio
import logging
from collections import defaultdict
from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from fastapi.responses import Response
import httpx
from config.settings import settings
from agents.graphs.refr_retr_graph import compiled_reference_graph
from schemas.wizard import *
from services.wizard_service import generate_wizard_content
from services.roadmap_pdf_service import generate_roadmap_pdf

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/wizard", tags=["wizard"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _build_agent_state(request: WizardRawRequest) -> dict:
    """
    Build the initial AgentState dict from an incoming wizard request.
    Centralised here so future endpoints can reuse the same mapping.
    """
    return {
        "topic": request.topic,
        "content_type": request.content_type,
        "details": request.details or "",
        "skill_level": request.skill_level or "",
        "goal": request.goal or "",
        "learning_style": request.learning_style or "",
        "warnings": [],
    }


def _group_references_by_category(
    resources: List[Dict[str, Any]],
) -> Dict[str, List[Dict]]:
    """
    Group a flat list of ResourceItem dicts by their `category` field.
    Returns a dict like:
        {
            "youtube":        [{"title": ..., "url": ..., "description": ...}, ...],
            "article":        [...],
            "official_docs":  [...],
            "course":         [...],
            "research_paper": [...],
        }

    Reusable utility — import from this module to enrich any future feature
    that receives a list of ResourceItem dicts from the reference agent.
    """
    grouped: Dict[str, List[Dict]] = defaultdict(list)
    for r in resources:
        category = r.get("category", "other")
        grouped[category].append(
            {
                "title": r.get("title", ""),
                "url": str(r.get("url", "")),
                "description": r.get("description"),
                "source": r.get("source", ""),
                "relevance_score": r.get("relevance_score", 0.0),
            }
        )
    return dict(grouped)


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------


@router.post("/generate-raw", response_model=WizardRawResponse)
async def generate_raw_content(request: WizardRawRequest):
    """
    Generate structured educational content.

    For `content_type=roadmap`:
    - Fires the reference retriever agent AND the LLM concurrently.
    - Merges agent references into the LLM output before returning.

    For all other content types:
    - Only the LLM is invoked (agent integration will be added per type later).
    """

    is_roadmap = request.content_type.lower().strip() == "roadmap"
    agent_warnings: List[str] = []
    references: Dict[str, Any] = {}
    images: List[str] = []

    # ------------------------------------------------------------------
    # Roadmap path: run agent + LLM concurrently for best latency
    # ------------------------------------------------------------------
    if is_roadmap:
        agent_state = _build_agent_state(request)

        logger.info(
            "Roadmap request: launching reference agent + LLM concurrently for topic=%s",
            request.topic,
        )

        try:
            final_state, wizard_result = await asyncio.gather(
                compiled_reference_graph.ainvoke(agent_state),
                generate_wizard_content(
                    topic=request.topic,
                    content_type=request.content_type,
                    details=request.details,
                    skill_level=request.skill_level,
                    goal=request.goal,
                    learning_style=request.learning_style,
                    user_role=request.user_role,
                ),
                return_exceptions=False,  # surface real errors; each has own try/except
            )
        except Exception as e:
            logger.exception(
                "Concurrent gather failed for topic=%s: %s", request.topic, e
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal error during roadmap generation. Please try again.",
            )

        # ------------------------------------------------------------------
        # Unpack LLM result
        # ------------------------------------------------------------------
        success, data = wizard_result

        if not success:
            logger.error("LLM wizard generation failed for topic=%s", request.topic)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate structured roadmap content.",
            )

        # ------------------------------------------------------------------
        # Unpack agent result and inject references into the LLM output
        # ------------------------------------------------------------------
        logger.info("Agent final state received for topic=%s", request.topic)

        reference_result = final_state.get("reference_result") or {}
        raw_resources: List[Dict] = reference_result.get("resources", [])
        agent_warnings = reference_result.get("warnings", [])
        images = reference_result.get("images", [])

        if raw_resources:
            references = _group_references_by_category(raw_resources)
            logger.info(
                "Injecting %d references (%d categories) into roadmap for topic=%s",
                len(raw_resources),
                len(references),
                request.topic,
            )
        else:
            logger.warning(
                "No references returned by agent for topic=%s — warnings: %s",
                request.topic,
                agent_warnings,
            )

        # Inject agent-enriched fields into the LLM-generated content dict
        data["references"] = references  # categorised reference links
        data["images"] = images  # image URLs for visual learning style

    # TODO:When extending to other content types, just add:
    # elif request.content_type == "course":
    # Fire compiled_reference_graph with the same pattern

    # ------------------------------------------------------------------
    # Non-roadmap path: LLM only (agent integration added per type later)
    # ------------------------------------------------------------------
    else:
        logger.info(
            "Non-roadmap request (type=%s): using LLM only for topic=%s",
            request.content_type,
            request.topic,
        )
        try:
            success, data = await generate_wizard_content(
                topic=request.topic,
                content_type=request.content_type,
                details=request.details,
                skill_level=request.skill_level,
                goal=request.goal,
                learning_style=request.learning_style,
                user_role=request.user_role,
            )
        except Exception as e:
            logger.exception(
                "LLM generation failed for topic=%s type=%s: %s",
                request.topic,
                request.content_type,
                e,
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal error during content generation. Please try again.",
            )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate structured wizard content.",
            )

    return WizardRawResponse(
        content=data, warnings=agent_warnings if agent_warnings else None
    )


@router.post("/export-pdf")
async def export_roadmap_pdf(request: WizardPdfExportRequest):
    """
    Export the roadmap content as a beautifully formatted PDF document.
    """
    try:
        topic_name = request.topic or request.content.get("title", "Roadmap")
        pdf_bytes = generate_roadmap_pdf(request.content, topic_name=topic_name)

        filename = f"{topic_name.replace(' ', '_')}_roadmap.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        logger.exception("PDF export failed for topic=%s: %s", request.topic, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate PDF document.",
        )


async def run_agentic_workflow_bg(agent_state: dict):
    from agents.graphs.course_generation_graph import compiled_course_graph
    
    content_id = agent_state.get("content_id")
    config = {"configurable": {"thread_id": str(content_id)}} if content_id else {}
    
    try:
        final_state = await compiled_course_graph.ainvoke(agent_state, config=config)
        
        if content_id:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{settings.JS_SERVER_URL}/internal/wizard-webhook/complete",
                    json={"content_id": content_id, "data": final_state.get("course_draft", {})}
                )
    except Exception as e:
        logger.exception("Background agentic generation failed: %s", e)
        if content_id:
            try:
                async with httpx.AsyncClient() as client:
                    await client.post(
                        f"{settings.JS_SERVER_URL}/internal/wizard-webhook/complete",
                        json={"content_id": content_id, "error": str(e)}
                    )
            except Exception as inner_e:
                logger.error(f"Failed to send error webhook: {inner_e}")

@router.post("/generate-agentic", response_model=WizardRawResponse)
async def generate_agentic_content(request: WizardAgenticRequest, background_tasks: BackgroundTasks):
    """
    Start the agentic workflow for course/syllabus generation in the background.
    """
    agent_state = {
        "content_id": getattr(request, "content_id", None),
        "topic": request.topic,
        "content_type": request.content_type,
        "details": request.details or "",
        "skill_level": request.skill_level or "",
        "goal": request.goal or "",
        "learning_style": request.learning_style or "",
        "user_role": request.user_role or "user",
        "feedback": None,
        "course_draft": {},
        "warnings": [],
    }

    background_tasks.add_task(run_agentic_workflow_bg, agent_state)
    return WizardRawResponse(content={"status": "generating_planning"}, warnings=[])

@router.post("/regenerate-agentic", response_model=WizardRawResponse)
async def regenerate_agentic_content(request: WizardAgenticRegenerateRequest, background_tasks: BackgroundTasks):
    """
    Regenerate course draft based on tutor feedback in the background.
    """
    agent_state = {
        "content_id": getattr(request, "content_id", None),
        "topic": request.topic,
        "content_type": "Course/Syllabus",
        "details": "",
        "skill_level": "",
        "goal": "",
        "learning_style": "",
        "user_role": "tutor",
        "feedback": request.feedback,
        "course_draft": request.content,
        "warnings": [],
    }

    background_tasks.add_task(run_agentic_workflow_bg, agent_state)
    return WizardRawResponse(content={"status": "generating_planning"}, warnings=[])
