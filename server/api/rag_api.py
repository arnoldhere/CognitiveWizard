import logging
import os
import tempfile

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from schemas.rag_schema import (
    RAGIngestRequest,
    RAGQueryRequest,
    RAGResponse,
    RAGStatusResponse,
    RAGUploadResponse,
)
from services.rag.rag_service import rag_service
from services.summarization.input_handlers import Document_handler

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rag", tags=["RAG"])


@router.post("/ingest")
def ingest_documents(request: RAGIngestRequest):
    """
    JSON ingestion endpoint retained for compatibility.
    """
    try:
        result = rag_service.preprocess(
            documents=request.documents, metadata=request.metadata
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("RAG ingest failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to ingest RAG documents.",
        ) from exc


@router.post("/upload", response_model=RAGUploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """
    Upload a PDF/DOCX file and ingest it into the active RAG knowledge base.
    """
    extension = os.path.splitext(file.filename or "")[1].lower()
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
        result = rag_service.preprocess(
            documents=[text],
            metadata={"filename": file.filename},
        )

        return RAGUploadResponse(
            status="success",
            filename=file.filename or "uploaded-file",
            chunks=result["chunks"],
            ready_for_rag=result["ready_for_rag"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("RAG upload failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process uploaded document for RAG.",
        ) from exc
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except OSError:
                logger.warning("Failed to delete temp upload file: %s", temp_file_path)


@router.get("/status", response_model=RAGStatusResponse)
def rag_status():
    return RAGStatusResponse(**rag_service.status())


@router.post("/chat", response_model=RAGResponse)
def chat(req: RAGQueryRequest):
    try:
        result = rag_service.query(query=req.query, use_rag=bool(req.use_rag))
        return RAGResponse(**result)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("RAG chat failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate RAG response.",
        ) from exc
