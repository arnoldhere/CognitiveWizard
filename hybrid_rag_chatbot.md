##  Core Idea
Hybrid RAG Engine (Chatbot): A sophisticated retrieval pipeline utilizing Faiss (CPU/GPU) for vector storage. It features a query router that dynamically selects between user-uploaded documents and external knowledge bases, followed by a retriever, a re-ranker, and an LLM generator.

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
