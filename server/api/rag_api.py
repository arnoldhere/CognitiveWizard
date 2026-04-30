import logging
import os
import tempfile
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status, Query
from sqlalchemy.orm import Session
from api.auth_api import get_current_active_user
from config.db import get_db
from models.user import User
from schemas.rag_schema import (
    RAGIngestRequest,
    RAGQueryRequest,
    RAGResponse,
    RAGStatusResponse,
    RAGUploadResponse,
)
from services.chat_limit_service import chat_limit_service
from services.rag.v0_rag_service import rag_service
from services.rag.v1_rag_service import langchain_rag_service
from services.summarization.input_handlers import Document_handler

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rag", tags=["RAG"])


@router.post("/ingest")
def ingest_documents(
    request: RAGIngestRequest,
    current_user: User = Depends(get_current_active_user),
):
    """JSON ingestion endpoint retained for compatibility."""
    try:
        result = rag_service.preprocess(
            documents=request.documents,
            metadata=request.metadata,
            user_id=str(current_user.id),
        )
        return result
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    except Exception as exc:
        logger.exception("RAG ingest failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to ingest RAG documents.",
        ) from exc


@router.post("/upload", response_model=RAGUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
):
    """Upload a PDF/DOCX file and ingest it into the user's RAG knowledge base."""
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
        result = langchain_rag_service.preprocess(
            documents=[text],
            metadata={"filename": file.filename},
            user_id=str(current_user.id),
        )

        return RAGUploadResponse(
            status="success",
            filename=file.filename or "uploaded-file",
            chunks=result["chunks"],
            ready_for_rag=result["ready_for_rag"],
            uploaded_documents=result.get("uploaded_documents", []),
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
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
def rag_status(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    user_id = str(current_user.id)
    payload = langchain_rag_service.status(user_id=user_id)
    payload["chat_limit_info"] = chat_limit_service.get_user_status(db, current_user)
    return RAGStatusResponse(**payload)


@router.get("/status-langchain", response_model=RAGStatusResponse)
def rag_status_langchain(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get the status of the user's LangChain RAG knowledge base."""
    user_id = str(current_user.id)
    payload = langchain_rag_service.status(user_id=user_id)
    payload["chat_limit_info"] = chat_limit_service.get_user_status(db, current_user)
    return RAGStatusResponse(**payload)


@router.post("/chat", response_model=RAGResponse)
def chat(
    req: RAGQueryRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    RAG Chat endpoint - supports both v0 and v1 (LangChain).
    Use use_langchain parameter to switch between implementations.
    """
    user_id = str(current_user.id)

    can_send, messages_used, _messages_remaining = chat_limit_service.check_limit(
        db, current_user
    )
    if not can_send:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Daily chat limit reached. You have used {messages_used}/5 messages today. "
                "Please upgrade to premium for unlimited access."
            ),
        )

    try:
        # Route to appropriate RAG service based on use_langchain parameter
        selected_service = langchain_rag_service if req.use_langchain else rag_service

        if req.use_langchain:
            logger.info(f"Langchain mode enabled...")

        result = selected_service.query(
            query=req.query,
            use_rag=bool(req.use_rag),
            user_id=user_id,
        )

        user = chat_limit_service.increment_message_count(db, current_user)
        result["chat_limit_info"] = chat_limit_service.get_user_status(db, user)
        return RAGResponse(**result)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    except Exception as exc:
        logger.exception("RAG chat failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate RAG response.",
        ) from exc


@router.post("/chat-langchain", response_model=RAGResponse)
def chat_langchain(
    req: RAGQueryRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    LangChain RAG Chat endpoint - dedicated endpoint for LangChain-based RAG.
    This is equivalent to calling /chat with use_langchain=true.
    """
    user_id = str(current_user.id)

    can_send, messages_used, _messages_remaining = chat_limit_service.check_limit(
        db, current_user
    )
    if not can_send:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Daily chat limit reached. You have used {messages_used}/5 messages today. "
                "Please upgrade to premium for unlimited access."
            ),
        )

    try:
        result = langchain_rag_service.query(
            query=req.query,
            use_rag=bool(req.use_rag),
            user_id=user_id,
        )

        user = chat_limit_service.increment_message_count(db, current_user)
        result["chat_limit_info"] = chat_limit_service.get_user_status(db, user)
        return RAGResponse(**result)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    except Exception as exc:
        logger.exception("LangChain RAG chat failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate LangChain RAG response.",
        ) from exc
