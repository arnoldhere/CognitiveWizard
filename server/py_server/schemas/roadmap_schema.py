"""
schemas/roadmap_schema.py
=========================
Pydantic v2 schemas for the Agentic Roadmap Generation pipeline.
Enforces 100% backward compatibility with the existing Roadmap frontend viewer,
database persistence layer, and PDF export service.
"""

from __future__ import annotations
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator, model_validator


class RoadmapTopicSchema(BaseModel):
    name: str = Field(..., min_length=2, description="Topic name")
    details: str = Field(..., min_length=5, description="Brief explanation or guidance")
    importance: Optional[str] = Field(default="High", description="High, Medium, or Core")


class RoadmapModuleItemSchema(BaseModel):
    title: str = Field(..., min_length=3, description="Module title")
    description: str = Field(default="", description="Summary of module goals")
    estimated_time: str = Field(default="1 week", description="Estimated completion duration")
    difficulty: Optional[str] = Field(default="beginner", description="beginner, intermediate, advanced")
    topics: List[RoadmapTopicSchema] = Field(default_factory=list)

    @field_validator("difficulty", mode="before")
    @classmethod
    def normalize_difficulty(cls, v: Any) -> str:
        if isinstance(v, str):
            val = v.lower().strip()
            if val in ("easy", "beginner"):
                return "beginner"
            if val in ("medium", "intermediate"):
                return "intermediate"
            if val in ("hard", "advanced"):
                return "advanced"
            return val
        return "beginner"


class RoadmapPhaseSchema(BaseModel):
    phase: str = Field(..., min_length=3, description="Phase title (e.g. 'Phase 1: Foundations')")
    modules: List[RoadmapModuleItemSchema] = Field(default_factory=list)


class RoadmapPlanSchema(BaseModel):
    """Output of Roadmap Planner Node (structure, milestones, and phases)."""
    title: str = Field(..., min_length=3)
    description: Optional[str] = Field(default="")
    prerequisites: List[str] = Field(default_factory=list)
    outcomes: List[str] = Field(default_factory=list)
    learning_phases: List[str] = Field(default_factory=list)
    phasewise_modules: List[RoadmapPhaseSchema] = Field(default_factory=list)


class RoadmapSchema(BaseModel):
    """
    Final assembled Roadmap package.
    Matches the schema expected by the React RoadmapDisplay and PDF export service.
    """
    content_type: str = Field(default="roadmap")
    title: str = Field(..., min_length=3)
    description: Optional[str] = Field(default="")
    prerequisites: List[str] = Field(default_factory=list)
    outcomes: List[str] = Field(default_factory=list)
    learning_phases: List[str] = Field(default_factory=list)
    phasewise_modules: List[RoadmapPhaseSchema] = Field(default_factory=list)
    modules: Optional[List[Any]] = Field(default=None, description="Alias for compatibility")
    references: Dict[str, List[Dict[str, Any]]] = Field(default_factory=dict)
    images: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def normalize_modules_structure(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data

        # If LLM put modules under 'modules' instead of 'phasewise_modules'
        if "phasewise_modules" not in data or not data["phasewise_modules"]:
            raw_modules = data.get("modules") or []
            if raw_modules and isinstance(raw_modules, list):
                # If it's already a list of phases (has 'phase' or 'modules')
                if any(isinstance(x, dict) and ("phase" in x or "modules" in x) for x in raw_modules):
                    data["phasewise_modules"] = [
                        {
                            "phase": x.get("phase") or f"Phase {i + 1}",
                            "modules": x.get("modules") if isinstance(x.get("modules"), list) else [x]
                        }
                        for i, x in enumerate(raw_modules)
                    ]
                else:
                    # Flat list of modules -> group into Phase 1
                    data["phasewise_modules"] = [
                        {"phase": "Phase 1: Core Curriculum", "modules": raw_modules}
                    ]

        # Sync learning_phases list with phasewise_modules
        if not data.get("learning_phases") and data.get("phasewise_modules"):
            data["learning_phases"] = [
                p.get("phase") if isinstance(p, dict) else str(p)
                for p in data["phasewise_modules"]
            ]

        return data
