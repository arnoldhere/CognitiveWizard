import logging
import os
import tempfile
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form
from services.summarization.input_handlers import (
    URL_handler,
    Youtube_handler,
    Document_handler,
)
from services.summarization.summarization import Summarization
from schemas.summary_schema import SummaryRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/summarize", tags=["Summarize"])


@router.post("/content")
async def summarize(req: SummaryRequest):
    """
    Supports multiple input types: URLs, YouTube videos, and PDF documents.
    Provides hierarchical summarization with intelligent chunking.
    """
    try:
        logger.info(f"Summarization request: type={req.input_type}, mode={req.mode}")

        # Validate input type
        if req.input_type not in ["url", "youtube", "pdf"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid input type '{req.input_type}'. Must be 'url', 'youtube', or 'pdf'",
            )

        # Validate summarization mode
        if req.mode not in ["concise", "brief", "summary", "detailed"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid mode '{req.mode}'. Must be one of: concise, brief, summary, detailed",
            )

        # Extract text based on input type
        try:
            if req.input_type == "url":
                text = URL_handler.extract_text(req.source)
            elif req.input_type == "youtube":
                text = Youtube_handler.extract_text(req.source)
            elif req.input_type == "pdf":
                text = Document_handler.extract_text(req.source)
            else:
                raise ValueError(f"Unsupported input type: {req.input_type}")
        except ValueError as e:
            logger.error(f"Content extraction failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Content extraction failed: {str(e)}",
            )

        # Perform summarization
        success, result = Summarization(text=text, mode=req.mode)

        if not success:
            logger.error(f"Summarization failed: {result}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Summarization failed: {result}",
            )

        logger.info("Summarization completed successfully")
        return {
            "status": "success",
            "data": {
                "summary": result,
                "mode": req.mode,
                "input_type": req.input_type,
            },
        }

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error in summarization endpoint: {str(e)}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during summarization",
        )


@router.post("/upload")
async def summarize_upload(
    file: UploadFile = File(...),
    mode: str = Form("brief"),
    model_mode: str = Form("api"),
):
    """
    Upload a PDF or DOCX file and summarize its contents.
    """
    logger.info(
        f"Summarization upload request: file={file.filename}, mode={mode}, model={model_mode}"
    )

    if mode not in ["concise", "brief", "summary", "detailed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid mode '{mode}'. Must be one of: concise, brief, summary, detailed",
        )

    if model_mode not in ["api", "local"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid model mode '{model_mode}'. Must be 'api' or 'local'",
        )

    extension = os.path.splitext(file.filename)[1].lower()
    if extension not in [".pdf", ".docx"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Please upload a PDF or DOCX file.",
        )

    temp_file_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=extension) as tmp:
            temp_file_path = tmp.name
            tmp.write(await file.read())
            tmp.flush()

        text = Document_handler.extract_text(temp_file_path)
        success, result = Summarization(text=text, mode=mode, model_mode=model_mode)

        if not success:
            logger.error(f"File summarization failed: {result}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Summarization failed: {result}",
            )

        logger.info("File summarization completed successfully")
        return {
            "status": "success",
            "data": {
                "summary": result,
                "mode": mode,
                "input_type": "file",
                "model_mode": model_mode,
                "filename": file.filename,
            },
        }

    except ValueError as e:
        logger.error(f"File processing failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error during file summarization: {str(e)}", exc_info=True
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during file summarization",
        )
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except OSError:
                logger.warning(f"Failed to delete temporary file: {temp_file_path}")
