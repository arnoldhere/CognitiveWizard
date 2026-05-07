import logging
import mimetypes
import os
import tempfile
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from api.auth_api import get_current_active_user
from config.db import get_db
from models.user import User
from schemas.chat_schema import (
    ChatSessionCreateRequest,
    ChatSessionDeleteResponse,
    ChatSessionHistoryResponse,
    ChatSessionRenameRequest,
    ChatSessionResponse,
)
from schemas.rag_schema import (
    RAGIngestRequest,
    RAGQueryRequest,
    RAGResponse,
    RAGStatusResponse,
    RAGUploadResponse,
)
from services.chat_limit_service import chat_limit_service
from services.chat_session_service import (
    create_chat_session,
    get_chat_session,
    list_chat_sessions,
    rename_chat_session,
    soft_delete_chat_session,
)
from services.chat_message_store import fetch_chat_history
from services.rag.v0_rag_service import rag_service
from services.rag.source_files import (
    get_user_source_path,
    persist_uploaded_file,
    safe_filename,
)
from services.rag.v1_rag_service import langchain_rag_service
from services.summarization.input_handlers import Document_handler

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rag", tags=["RAG"])


@router.get("/source/{filename}")
def get_uploaded_source(
    filename: str,
    current_user: User = Depends(get_current_active_user),
):
    safe_name = safe_filename(filename)
    source_path = get_user_source_path(str(current_user.id), safe_name)
    if not source_path.exists() or not source_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source document is no longer available.",
        )

    media_type, _ = mimetypes.guess_type(str(source_path))
    return FileResponse(
        path=str(source_path),
        filename=safe_name,
        media_type=media_type or "application/octet-stream",
        content_disposition_type="inline",
    )


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
    db: Session = Depends(get_db),
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
        source_url = persist_uploaded_file(
            temp_file_path,
            str(current_user.id),
            file.filename or "uploaded-file",
        )
        result = langchain_rag_service.preprocess(
            documents=[text],
            metadata={
                "filename": file.filename,
                "source_url": source_url,
                "content_type": file.content_type,
            },
            user_id=str(current_user.id),
            db=db,
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
        user_status = chat_limit_service.get_user_status(db, current_user)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Daily chat limit reached. You have used {messages_used}/{user_status['max_per_day']} messages today. "
                "Please upgrade to a subscription plan to increase your daily limit."
            ),
        )

    try:
        # Route to appropriate RAG service based on use_langchain parameter
        selected_service = langchain_rag_service if req.use_langchain else rag_service

        if req.use_langchain:
            logger.info(f"Langchain mode enabled...")

        if req.session_id:
            session = get_chat_session(db, current_user.id, req.session_id)
            if not session:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Chat session not found or access denied.",
                )
            session_id = session.session_id
        else:
            session = create_chat_session(
                db,
                current_user.id,
                title=None,
                initial_prompt=req.query,
            )
            session_id = session.session_id

        result = selected_service.query(
            query=req.query,
            use_rag=bool(req.use_rag),
            user_id=user_id,
            session_id=session_id,
            db=db if req.use_langchain else None,
        )

        user = chat_limit_service.increment_message_count(db, current_user)
        result["chat_limit_info"] = chat_limit_service.get_user_status(db, user)
        result["session_id"] = session_id
        result["session_title"] = session.title
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


@router.post("/sessions", response_model=ChatSessionResponse)
def create_chat_session_endpoint(
    request: ChatSessionCreateRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    chat_session = create_chat_session(
        db,
        current_user.id,
        title=request.title,
        initial_prompt=request.initial_prompt,
    )
    return ChatSessionResponse(
        session_id=chat_session.session_id,
        title=chat_session.title,
        active=chat_session.active,
        message_count=chat_session.message_count,
        session_metadata=chat_session.chat_metadata,
        created_at=chat_session.created_at,
        last_message_at=chat_session.last_message_at,
    )


@router.get("/sessions", response_model=list[ChatSessionResponse])
def list_chat_sessions_endpoint(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    sessions = list_chat_sessions(db, current_user.id)
    return [
        ChatSessionResponse(
            session_id=session.session_id,
            title=session.title,
            active=session.active,
            message_count=session.message_count,
            session_metadata=session.chat_metadata,
            created_at=session.created_at,
            last_message_at=session.last_message_at,
        )
        for session in sessions
    ]


@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
def get_chat_session_endpoint(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    chat_session = get_chat_session(db, current_user.id, session_id)
    if not chat_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found.",
        )
    return ChatSessionResponse(
        session_id=chat_session.session_id,
        title=chat_session.title,
        active=chat_session.active,
        message_count=chat_session.message_count,
        session_metadata=chat_session.chat_metadata,
        created_at=chat_session.created_at,
        last_message_at=chat_session.last_message_at,
    )


@router.get("/sessions/{session_id}/history", response_model=ChatSessionHistoryResponse)
def get_chat_session_history_endpoint(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    chat_session = get_chat_session(db, current_user.id, session_id)
    if not chat_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found.",
        )
    messages = fetch_chat_history(session_id)
    return ChatSessionHistoryResponse(
        session_id=chat_session.session_id,
        title=chat_session.title,
        messages=[
            {
                "role": msg["role"],
                "content": msg["content"],
                "created_at": msg["created_at"],
                "metadata": msg.get("metadata"),
            }
            for msg in messages
        ],
    )


@router.put("/sessions/{session_id}", response_model=ChatSessionResponse)
def rename_chat_session_endpoint(
    session_id: str,
    request: ChatSessionRenameRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    chat_session = rename_chat_session(db, current_user.id, session_id, request.title)
    if not chat_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found.",
        )
    return ChatSessionResponse(
        session_id=chat_session.session_id,
        title=chat_session.title,
        active=chat_session.active,
        message_count=chat_session.message_count,
        session_metadata=chat_session.chat_metadata,
        created_at=chat_session.created_at,
        last_message_at=chat_session.last_message_at,
    )


@router.delete("/sessions/{session_id}", response_model=ChatSessionDeleteResponse)
def delete_chat_session_endpoint(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    chat_session = soft_delete_chat_session(db, current_user.id, session_id)
    if not chat_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found.",
        )
    return ChatSessionDeleteResponse(
        session_id=chat_session.session_id,
        deleted=True,
        active=chat_session.active,
        message="Chat session has been archived and will no longer receive new messages.",
    )


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
        user_status = chat_limit_service.get_user_status(db, current_user)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Daily chat limit reached. You have used {messages_used}/{user_status['max_per_day']} messages today. "
                "Please upgrade to a subscription plan to increase your daily limit."
            ),
        )

    try:
        if req.session_id:
            session = get_chat_session(db, current_user.id, req.session_id)
            if not session:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Chat session not found or access denied.",
                )
            session_id = session.session_id
        else:
            session = create_chat_session(
                db,
                current_user.id,
                title=None,
                initial_prompt=req.query,
            )
            session_id = session.session_id

        result = langchain_rag_service.query(
            query=req.query,
            use_rag=bool(req.use_rag),
            user_id=user_id,
            session_id=session_id,
            db=db,
        )

        user = chat_limit_service.increment_message_count(db, current_user)
        result["chat_limit_info"] = chat_limit_service.get_user_status(db, user)
        result["session_id"] = session_id
        result["session_title"] = session.title
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
