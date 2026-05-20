"""
Integration Guide: Instrumented Chain Setup (Optional)

This guide shows how to optionally wrap the existing LangChain RAG service
with the InstrumentedRAGChain to automatically capture metrics and logs
for the evaluation pipeline.

Current State:
- The evaluation pipeline works standalone via the /rag/evaluate endpoint
- Query logs can be populated manually or via batch operations
- Instrumentation is OPTIONAL - not required for evaluation to function

Optional Enhancement:
- Wrap langchain_rag_service with InstrumentedRAGChain
- Auto-logs every query with latency metrics
- Feeds real-time data to evaluation dashboard
"""

# ============================================================================
# OPTIONAL: Integrate Instrumented Chain into v1_rag_service.py
# ============================================================================

# In server/services/rag/v1_rag_service.py, add at the end:

# After the line: langchain_rag_service = LangChainRAGService()
# Add this optional instrumentation:

"""
from services.instrumented_chain import InstrumentedRAGChain

# Create singleton instance with optional instrumentation
_base_rag_service = LangChainRAGService()

# Wrap with instrumentation (optional - can be done at query time instead)
# langchain_rag_service = InstrumentedRAGChain(
#     rag_service=_base_rag_service,
#     db_session=None  # db_session passed at query time
# )
"""

# ============================================================================
# RECOMMENDED: Instrument at Query Time (rag_api.py)
# ============================================================================

# In server/api/rag_api.py, modify the chat endpoint:

"""
from services.instrumented_chain import InstrumentedRAGChain

@router.post("/chat", response_model=RAGResponse)
def chat(
    req: RAGQueryRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    # Wrap service with instrumentation for this query
    instrumented = InstrumentedRAGChain(
        rag_service=langchain_rag_service,
        db_session=db
    )
    
    try:
        # Query is automatically logged to rag_query_logs table
        result = instrumented.query(
            query=req.query,
            use_rag=bool(req.use_rag),
            user_id=user_id,
            session_id=session_id,
            db=db,
        )
        
        # Rest of existing logic...
        # ...
        
    except Exception as exc:
        # Existing error handling
        pass
"""

# ============================================================================
# Data Flow with Instrumentation
# ============================================================================

"""
User Query
    ↓
[rag_api.py] - chat endpoint
    ↓
[InstrumentedRAGChain] - wraps LangChainRAGService
    ↓
[LangChainRAGService] - actual RAG logic
    ├─ Retrieval (latency captured)
    └─ Generation (latency captured)
    ↓
[RAGQueryLog] - Logged to database
    ├─ question, answer
    ├─ contexts, latency_*_ms
    └─ sources, metadata
    ↓
[Admin Dashboard] - /rag/evaluation-report endpoint
    ├─ Fetches recent logs
    ├─ Runs evaluation
    └─ Returns metrics

"""

# ============================================================================
# Without Instrumentation (Current Recommended State)
# ============================================================================

"""
The evaluation pipeline functions perfectly without instrumentation:

1. Users make queries normally
2. Queries are handled by existing RAG service
3. Admin can manually call /rag/evaluate endpoint with query details
4. Or use /rag/auto-evaluate to batch-evaluate recent logs
5. Dashboard displays evaluation results

Benefits:
- No changes to existing query flow
- Zero overhead if not evaluating
- Can be added incrementally
- Evaluation is on-demand, not continuous
"""

# ============================================================================
# Testing Instrumentation (if implemented)
# ============================================================================

"""
from sqlalchemy.orm import Session
from config.db import get_db
from services.instrumented_chain import InstrumentedRAGChain
from services.rag.v1_rag_service import langchain_rag_service
from models.rag_log import RAGQueryLog

# Get a database session
db = next(get_db())

try:
    # Wrap with instrumentation
    instrumented = InstrumentedRAGChain(
        rag_service=langchain_rag_service,
        db_session=db
    )
    
    # Make a query
    result = instrumented.query(
        query="What is machine learning?",
        use_rag=True,
        user_id="123",
        session_id="sess-456",
        db=db
    )
    
    # Verify log was created
    log = db.query(RAGQueryLog).filter(
        RAGQueryLog.user_id == 123,
        RAGQueryLog.question == "What is machine learning?"
    ).first()
    
    print(f"Log created: {log.id}")
    print(f"Latency: {log.latency_total_ms}ms")
    
finally:
    db.close()
"""

# ============================================================================
# Migration: Enabling Instrumentation Later
# ============================================================================

"""
If you decide to add instrumentation later:

1. Update rag_api.py chat endpoints to use InstrumentedRAGChain
2. Existing queries will be automatically logged
3. Evaluation pipeline will have real data to work with
4. Zero breaking changes - just wraps existing service

The evaluation dashboard will immediately start showing metrics
for all new queries once instrumentation is added.
"""
