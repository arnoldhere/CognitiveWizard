# ChromaDB Migration Summary (01-05-2026)

## What changed

- Replaced active FAISS vector storage with persistent ChromaDB.
- Added `server/config/chroma_index.py` as the shared vector service for:
  - facial-recognition embeddings,
  - legacy v0 RAG embeddings,
  - stable vector ID mapping used by the existing SQL metadata.
- Updated LangChain RAG to use `langchain-chroma` through `VectorDBFactory`.
- Added ChromaDB settings in `server/config/settings.py`:
  - `CHROMA_PERSIST_DIR`
  - `FACE_CHROMA_COLLECTION`
  - `RAG_CHROMA_COLLECTION_PREFIX`
  - `RAG_USER_VECTOR_DIR`
- Replaced FAISS dependencies with:
  - `chromadb`
  - `langchain-chroma`

## Compatibility notes

- Existing callers can still use the same vector-store operations:
  - `add_vector`
  - `add_vectors`
  - `search_top_k`
  - `delete_vector`
  - `rebuild_index`
  - `count`
- Facial auth still stores integer `vector_id` values in MySQL, while Chroma stores the same IDs as collection document IDs.
- Legacy FAISS config code was removed from the active server tree.
- ChromaDB supports real vector deletion, so profile cleanup now removes vectors instead of relying on a no-op delete.

## RAG behavior

- v1 LangChain RAG now creates one persistent Chroma collection per user.
- v0 RAG now uses the shared Chroma service while preserving its existing retrieval flow.
- The duplicate document insert in v1 ingestion was removed during migration.

## Verification

- `python -m compileall server/config server/services/rag server/services/facial_service server/api server/tests`
- `python -m pytest server/tests/test_chroma_vector_service.py -q`

The broader service import checks are still blocked in this local environment by missing non-vector dependencies such as `sqlalchemy`, `cv2`, and the current PyTorch/Pillow stack.
