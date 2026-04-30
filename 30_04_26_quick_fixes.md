# Bug Fixes Summary (30 April 2026)

This file summarizes recent bug fixes and test-related changes applied to the CognitiveWizard project.

## Backend Fixes

- **Per-user FAISS Indexing:**
  - Updated `v1_rag_service.py` to use per-user FAISS vector stores for LangChain RAG, matching legacy v0 behavior.
  - Ensured user state persistence is compatible with both legacy and new keys.
- **API Routing:**
  - Changed `/rag/status` endpoint in `rag_api.py` to use the new LangChain RAG service for status reporting.
- **HybridRetriever:**
  - Fixed recursive bug in `HybridRetriever.retrieve()` and ensured correct wrapper methods.
- **Admin Config:**
  - Added JSON-backed persistence for admin configuration in `admin_api.py`.

## Frontend Fixes

- **Quiz Session:**
  - Fixed quiz session reset on failed submit to allow retry.
- **Quiz Results Filtering:**
  - Debounced filter effect to avoid rapid API calls.
- **Auth Context:**
  - Cleaned up duplicate `useAuth` export/import path confusion.

## Testing & Validation

- Syntax checks performed on all modified backend files; no errors found.
- Manual review of frontend logic for bug fixes.

---

For more details, see the commit history or contact the development team.
