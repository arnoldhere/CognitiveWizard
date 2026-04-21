##  Core Idea
```
User Query
   ↓
Query Router
   ↓
[User Docs RAG]  OR  [External Knowledge RAG]
   ↓
Retriever → Re-ranker → Context Builder
   ↓
LLM Generator
   ↓
Response + Sources
```
---

## Proposed Pipeline

1. Ingestion with preprocessing
2. Vector store
3. Metadata store
4. Retriever layer
5. Re-Ranking layer
6. LLM layer
7. Query router
8. API-Output layer
