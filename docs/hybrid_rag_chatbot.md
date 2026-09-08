# Hybrid RAG Chatbot

## Overview

The Hybrid RAG Chatbot is a retrieval-augmented generation solution built into CognitiveWizard. It combines user-uploaded content and persistent vector embeddings with an LLM backend to produce grounded, study-oriented answers. The current implementation supports both a legacy v0 RAG workflow and a newer LangChain-based v1 workflow through a shared API.


## What RAG Chatbot Means Here

Retrieval-Augmented Generation (RAG) means the chatbot does not rely solely on the language model's internal knowledge. Instead, it retrieves document slices from user-uploaded content, embeds them into a vector store, and uses those retrieved passages as context for answer generation.

> Current RAG behavior in this project:

```
- Ingest user documents (PDF/DOCX or raw text) into a per-user knowledge base
- Split documents into chunks and build embeddings
- Store vectors in ChromaDB for fast similarity search
- Use a retriever to retrieve relevant chunks for each query
- Pass retrieved context into the LLM prompt
- Return an answer plus source snippets and metadata
```
## Current Architecture

### Core Components

- `server/api/rag_api.py` — HTTP endpoints for ingestion, upload, status, chat, and session management
- `server/services/rag/v1_rag_service.py` — current LangChain-powered RAG orchestration
- `server/services/rag/v0_rag_service.py` — legacy in-house RAG pipeline, still available via API toggle
- `server/config/vector_store/vectordb.py` — Chroma + LangChain vector store factory
- `server/services/rag/hybrid_retriver.py` — retriever wrapper for similarity search with stable scoring
- `server/config/chroma_index.py` — persistent ChromaDB service used by v0 and other vector workloads
- `server/utils/prompt_builder/prompts/rag_prompt.py` — prompt template enforcing context usage
- `server/providers/llm_provider.py` — LLM provider abstraction for OpenAI, Anthropic, HuggingFace, etc.

### High-level Flow

1. Upload / ingest documents
2. Chunk and embed document text
3. Persist vectors and metadata in ChromaDB
4. Query user text via `/rag/chat` or `/rag/chat-langchain`
5. Retrieve top-k relevant documents from the user's collection
6. Assemble context and call the LLM
7. Persist chat session history when enabled

## What Works (15-05-2026)

- Document ingestion
- Retrieval and response generation
- Session-aware chat

## Detailed Working Flow

### Ingestion pipeline

1. User uploads a document via `/rag/upload`
2. Backend extracts text with `Document_handler.extract_text`
3. Text is broken into chunks in `LangChainRAGService._chunk_docs`
4. Each chunk becomes a `langchain_core.documents.Document`
5. Chunks are stored into a per-user Chroma collection
6. Metadata such as `title`, `source_url`, and `chunk_index` are recorded
7. Upload metadata is saved to SQL through `RAGDocument`

### Query pipeline

1. User sends a query to `/rag/chat` or `/rag/chat-langchain`
2. Request payload supports `use_rag`, `use_langchain`, and `session_id`
3. `rag_api.chat()` chooses v1 or v0 service based on `use_langchain`
4. `LangChainRAGService.query()` determines whether retrieval should run
5. If retrieval is enabled and a knowledge base exists:
   - `HybridRetriever.get_relevant_documents_with_scores()` fetches top-k documents
   - `build_retrieval_qa_chain()` formats docs to prompt context
   - The chain executes LLM generation using `RAG_PROMPT`
6. If retrieval is disabled or no context is found:
   - The service falls back to direct LLM generation via `providers.llm_provider.llm`
7. The response includes:
   - `answer`
   - `mode_used` (`rag` or `llm`)
   - `sources` with snippets and score
   - optional `warning`
   - `session_id` when persisted

### Prompt behavior

The current prompt template is intentionally strict:

- System instruction: "Use ONLY the provided context to answer."
- If the answer is not in context, the model should say it does not know
- Chat history is optionally included for session context

This limits hallucinations and increases grounding.

## Tools Used

- FastAPI — backend API server
- SQLAlchemy — database access and session management
- Pydantic — request/response validation
- LangChain / LCEL — RAG chain orchestration and prompt composition
- ChromaDB — persistent vector store for embeddings
- HuggingFace/OpenAI/Anthropic providers — LLM inference through `providers/llm_provider.py`
- Custom embedding adapters in `server/utils/preprocess/embedder.py`
- `Document_handler` — document text extraction for PDF/DOCX uploads

## Important Configuration

- `CHROMA_PERSIST_DIR` — persistent ChromaDB root
- `RAG_USER_VECTOR_DIR` — per-user vector storage path
- `RAG_CHROMA_COLLECTION_PREFIX` — base name for user RAG collections
- `TOP_K_RESULTS_RAG` — number of retrieved documents returned per query
- `OPENAI_API_KEY`, `OPENAI_DEF_MODEL` — OpenAI provider settings
- `QUIZ_GENERATOR_MODEL` and other model settings may impact LLM behavior indirectly


## Production Considerations

- Ensure `CHROMA_PERSIST_DIR` and `RAG_USER_VECTOR_DIR` are persistent and backed up
- Monitor per-user vector store growth; user-specific collections are created under `vectorDB/chroma/rag_user_vectors`
- Enforce upload limits for PDF/DOCX size and chunk count
- Validate returned `sources` and handle fallback `mode_used = llm`
- Use caching or rate limiting on `/rag/chat` for scale
- Configure chat message limits to avoid excessive prompt costs
- Ensure the chosen LLM provider has enough quota and supports the configured prompt style

## Current Limitations and Notes

- The service still retains a legacy v0 implementation; `use_langchain=true` is preferred
- Retrieval quality depends on chunk size and overlap tuning (`chunk_size=512`, `overlap=100` in v1)
- Source attribution is built from `original_docs` and may require cleanup for long documents
- Session memory is persisted only when `session_id` is present or created automatically
- There is no distributed vector store now; scaling horizontally requires per-instance file persistence or shared storage

## Deployment Checklist

1. Set environment variables: `CHROMA_PERSIST_DIR`, `RAG_USER_VECTOR_DIR`, `OPENAI_API_KEY`, etc.
2. Confirm `cogwiz/bin/activate` or Python environment has installed dependencies from `server/requirements.txt`
3. Ensure database migrations are up-to-date for `RAGDocument` and chat session tables
4. Verify `vectorDB/chroma` paths are writable by the app user
5. Test upload → ingest → chat → status → session lifecycle end-to-end
6. Monitor logs for Chroma load failures, retriever exceptions, and fallback `llm` warnings

---

This document should serve as the primary reference for understanding the current RAG chatbot implementation and its production deployment requirements.