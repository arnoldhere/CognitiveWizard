from fastapi import APIRouter, HTTPException
from schemas.rag_schema import *
from services.rag.rag_service import rag_service

router = APIRouter(prefix="/rag", tags=["RAG"])


# =============
# Document ingestion endpoint
# =============
@router.post("/ingest")
def ingest_documents(request: RAGIngestRequest):
    try:
        result = rag_service.preprocess(
            documents=request.documents, metadata=request.metadata
        )

        return {"message": "Documents processed successfully", "details": result}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat", response_model=RAGResponse)
def chat(req: RAGQueryRequest):
    try:
        use_rag = req.use_rag  # Optional improvement: auto-detect if RAG should be used
        res = rag_service.query(query=req.query, use_rag=use_rag)

        return RAGResponse(answer=res, sources=None)  # TODO:sources to improve later

    except Exception as e:
        # raise HTTPException(status_code=500, detail=str(e))
        print(str(e))
        return {"error": f"Interal server error.."}
