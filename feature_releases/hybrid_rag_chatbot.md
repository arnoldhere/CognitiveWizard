##  Core Idea
Hybrid RAG Engine (Chatbot): A sophisticated retrieval pipeline for vector storage. It features a query router that dynamically selects between user-uploaded documents and external knowledge bases, followed by a retriever, a re-ranker, and an LLM generator.

> Current RAG chatbot architecture

   ```
      User Query
         ↓
      Embedding
         ↓
      Vector DB Search
         ↓
      Re-ranking
         ↓
      Context Assembly
         ↓
      LLM Generation
         ↓
      Response
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

---
## RAG chatbot evaluation

> **Goal**

| Goal               | Example               |
| ------------------ | --------------------- |
| Accurate retrieval | Right documents found |
| Grounded answers   | No hallucinations     |
| Helpful responses  | Practical/useful      |
| Fast responses     | <3s                   |
| Stable outputs     | Consistent behavior   |
