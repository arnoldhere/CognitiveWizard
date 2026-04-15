from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class SummaryRequest(BaseModel):
    # Summarization mode: concise (2-3 sentences), brief (1-2 paragraphs), summary (2-3 paragraphs), or detailed (3-4 paragraphs)
    mode: str = Field(
        default="brief",
        description="Summarization mode: concise, brief, summary, or detailed",
        pattern="^(concise|brief|summary|detailed)$",
    )
    input_type: str = Field(..., description="Input type: 'url', 'youtube', or 'pdf'")
    source: str = Field(..., description="Source URL, YouTube URL, or file path")
