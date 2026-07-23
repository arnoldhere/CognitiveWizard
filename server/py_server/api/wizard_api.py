from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict, Any
from services.wizard_service import generate_wizard_content
from agents.graphs.roadmap_graph import build_roadmap_graph
from agents.services.refr_retr_agent import reference_retriever
from schemas.wizard import WizardRawResponse, WizardRawRequest

router = APIRouter(prefix="/wizard", tags=["wizard"])

# Initialize the compiled LangGraph for roadmap generation
roadmap_graph_app = build_roadmap_graph(reference_retriever)


@router.post("/generate-raw", response_model=WizardRawResponse)
async def generate_raw_content(request: WizardRawRequest):
    if request.content_type.lower() == "roadmap":
        try:
            initial_state = {
                "topic": request.topic,
                "content_type": request.content_type,
                "details": request.details or "",
                "skill_level": request.skill_level or "",
                "goal": request.goal or "",
                "learning_style": request.learning_style or "",
                "warnings": [],
            }
            final_state = await roadmap_graph_app.ainvoke(initial_state)

            if "adjusted_roadmap" in final_state and final_state["adjusted_roadmap"]:
                return {
                    "content": final_state["adjusted_roadmap"],
                    "warnings": final_state.get("warnings", []),
                }
            elif "base_roadmap" in final_state and final_state["base_roadmap"]:
                return {
                    "content": final_state["base_roadmap"],
                    "warnings": final_state.get("warnings", []),
                }
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Agentic roadmap generation failed",
                )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Agentic workflow error: {str(e)}",
            )
    else:
        # Step 1: Generate via LLM (No DB operations)
        success, data = generate_wizard_content(
            topic=request.topic,
            content_type=request.content_type,
            details=request.details,
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate structured wizard content",
            )

        return {"content": data}
