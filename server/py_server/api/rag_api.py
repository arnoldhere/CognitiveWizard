import logging
import mimetypes
import os
import tempfile
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status, Request
from fastapi.responses import FileResponse
from schemas.rag_schema import (
    RAGIngestRequest,
    RAGQueryRequest,
    RAGResponse,
    RAGStatusResponse,
    RAGUploadResponse,
)
from services.rag.v1_rag_service import langchain_rag_service
from services.rag.source_files import (
    get_user_source_path,
    persist_uploaded_file,
    safe_filename,
)
from services.summarization.input_handlers import Document_handler
from services.chat_message_store import fetch_chat_history, delete_chat_history

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rag", tags=["RAG"])


def get_user_id(request: Request) -> str:
    user_id = request.headers.get("x-user-id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    return user_id


@router.get("/source/{filename}")
def get_uploaded_source(
    filename: str,
    user_id: str = Depends(get_user_id),
):
    safe_name = safe_filename(filename)
    source_path = get_user_source_path(user_id, safe_name)
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
    user_id: str = Depends(get_user_id),
):
    """JSON ingestion endpoint — uses LangChain RAG service."""
    try:
        result = langchain_rag_service.preprocess(
            documents=request.documents,
            metadata=request.metadata,
            user_id=user_id,
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
            detail=str(exc),
        ) from exc


@router.post("/upload-raw", response_model=RAGUploadResponse)
async def upload_document_raw(
    file: UploadFile = File(...),
    user_id: str = Depends(get_user_id),
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
            user_id,
            file.filename or "uploaded-file",
        )
        result = langchain_rag_service.preprocess(
            documents=[text],
            metadata={
                "filename": file.filename,
                "source_url": source_url,
                "content_type": file.content_type,
            },
            user_id=user_id,
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
            detail=str(exc),
        ) from exc
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except OSError:
                logger.warning("Failed to delete temp upload file: %s", temp_file_path)


@router.get("/status-raw")
def rag_status_raw(user_id: str = Depends(get_user_id)):
    payload = langchain_rag_service.status(user_id=user_id)
    return payload


@router.get("/status-langchain-raw")
def rag_status_langchain_raw(user_id: str = Depends(get_user_id)):
    """Get the status of the user's LangChain RAG knowledge base."""
    payload = langchain_rag_service.status(user_id=user_id)
    return payload


@router.post("/chat-raw", response_model=RAGResponse)
def chat_raw(
    req: RAGQueryRequest,
    user_id: str = Depends(get_user_id),
):
    """RAG chat endpoint — backed by LangChain RAG service."""
    try:
        result = langchain_rag_service.query(
            query=req.query,
            use_rag=req.use_rag,
            user_id=user_id,
            session_id=req.session_id,
        )

        ans = result.get("answer", "")
        mode = result.get("mode_used", "llm")
        sources = result.get("sources", [])
        log_meta = {
            "warning": result.get("warning"),
            "token_usage": result.get("token_usage"),
            "created_at": str(result.get("created_at", "")),
        }

        return RAGResponse(
            status="success",
            answer=ans,
            mode_used=mode,
            sources=sources,
            contexts=[s.get("text", s.get("snippet", "")) for s in sources] if sources else [],
            context_count=len(sources),
            log_metadata=log_meta,
        )
    except Exception as e:
        logger.exception("RAG chat failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process chat query.",
        ) from e


@router.post("/chat-langchain-raw", response_model=RAGResponse)
def chat_langchain_raw(
    req: RAGQueryRequest,
    user_id: str = Depends(get_user_id),
):
    """LangChain RAG chat endpoint."""
    try:
        result = langchain_rag_service.query(
            query=req.query,
            use_rag=req.use_rag,
            user_id=user_id,
            session_id=req.session_id,
        )

        ans = result.get("answer", "")
        mode = result.get("mode_used", "llm")
        sources = result.get("sources", [])
        log_meta = {
            "warning": result.get("warning"),
            "token_usage": result.get("token_usage"),
            "created_at": str(result.get("created_at", "")),
        }

        # Truncate context string if present
        if log_meta.get("context_str"):
            log_meta["context_str"] = log_meta["context_str"][:2000]

        return RAGResponse(
            status="success",
            answer=ans,
            mode_used=mode,
            sources=sources,
            contexts=[s.get("text", s.get("snippet", "")) for s in sources] if sources else [],
            context_count=len(sources),
            log_metadata=log_meta,
        )
    except Exception as e:
        logger.exception("LangChain RAG chat failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process chat query.",
        ) from e


@router.delete("/documents/{document_name}")
def delete_document(
    document_name: str,
    user_id: str = Depends(get_user_id),
):
    safe_name = safe_filename(document_name)
    success = langchain_rag_service.delete_uploaded_document(user_id, safe_name)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or could not be deleted.",
        )

    return {"detail": f"Document '{safe_name}' deleted successfully."}


@router.get("/sessions-raw/{session_id}/history")
def get_session_history_raw(
    session_id: str,
    user_id: str = Depends(get_user_id),
):
    history = fetch_chat_history(session_id)
    return history


@router.delete("/sessions-raw/{session_id}/history")
def delete_session_history_raw(
    session_id: str,
    user_id: str = Depends(get_user_id),
):
    delete_chat_history(session_id)
    return {"detail": "History deleted"}
