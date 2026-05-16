# RAG Chatbot Evaluation Framework

A production-grade, 6-layer evaluation framework for CognitiveWizard's RAG (Retrieval-Augmented Generation) chatbot system.

## Quick Overview

| Layer | Focus | Status | Key Metrics |
|-------|-------|--------|------------|
| 1 | **Retrieval** | ✅ Complete | Recall, Precision, MRR, nDCG, Latency |
| 2 | **Generation** | ✅ Complete | Faithfulness, Relevance, Hallucination, Similarity |
| 3 | **Memory** | ✅ Complete | Context Retention, Follow-up, Consistency |
| 4 | **Safety** | ✅ Complete | Hallucination, Citations, Refusal Accuracy |
| 5 | **Product** | 🚧 In Progress | Engagement, Retention, Success Rate |
| 6 | **Quiz** | ✅ Complete | Gen Success, Accuracy, Difficulty, Bloom's |



## Folder Structure

```
evaluation/
├── schemas/                    # Pydantic validation schemas
├── retrieval/                  # Layer 1: Retrieval metrics  
├── generation/                 # Layer 2: Generation metrics
├── memory/                     # Layer 3: Memory evaluation
├── hallucination/              # Layer 4: Hallucination detection
├── quiz/                       # Layer 6: Quiz evaluation
├── loaders/                    # Dataset utilities
├── datasets/                   # 23+ benchmark test cases
├── IMPLEMENTATION_GUIDE.md     # Comprehensive guide
└── IMPLEMENTATION_SUMMARY.md   # Status & details
```

## ✨ Key Features
- **25+ Evaluation Metrics** across 6 layers
- **6 Independent Layers** for failure isolation
- **Production-Ready Schemas** with Pydantic validation
- **23+ Benchmark Datasets** with real scenarios
- **Dataset Utilities** for loading, filtering, splitting
- **Comprehensive Documentation** with examples

## 📊 Proposed Evaluation Architecture

- Layer 1 — Retrieval Evaluation Checks whether the correct chunks are retrieved before generation.

    > Metrics :

    | Metric            | Meaning                                           |
    | ----------------- | ------------------------------------------------- |
    | Recall@K          | Was relevant chunk retrieved?                     |
    | Precision@K       | How many retrieved chunks were actually relevant? |
    | MRR               | Rank quality                                      |
    | nDCG              | Retrieval ranking quality                         |
    | Retrieval latency | Speed                                             |

- Layer 2 — Generation Evaluation Checks whether generated answers are accurate, grounded, relevant, and useful.

    > Metrics:

    | Metric              | Meaning                              |
    | ------------------- | ------------------------------------ |
    | Faithfulness Score  | Does answer match retrieved context? |
    | Context Utilization | Was retrieved info actually used?    |
    | Answer Relevance    | Does answer solve user query?        |
    | Semantic Similarity | Compared to reference answer         |
    | Hallucination Rate  | Unsupported claims                   |

- Layer 3 — Conversational/Memory Evaluation Checks whether the chatbot remembers and uses previous context correctly.
    > Metrics:

    | Metric                   | Meaning                          |
    | ------------------------ | -------------------------------- |
    | Context Retention Score  | Memory quality                   |
    | Follow-up Accuracy       | Follow-up understanding          |
    | Conversation Consistency | No contradictions                |
    | Memory Recall Accuracy   | Correct recall from earlier chat |

- Layer 4 — Hallucination & Safety Evaluation Checks whether the model invents information not present in documents.

    > Metrics:
    
    | Metric                  | Meaning                     |
    | ----------------------- | --------------------------- |
    | Hallucination Rate      | Unsupported statements      |
    | Unsupported Claim Ratio | Claims not found in context |
    | Citation Correctness    | References validity         |
    | Refusal Accuracy        | Proper handling of unknowns |

- Layer 5 — Product/User Metrics Checks engagement, retention, and UX-level performance.

    > Metrics:
    
    | Metric             | Meaning                   |
    | ------------------ | ------------------------- |
    | Session Length     | User engagement           |
    | Retention Rate     | Returning users           |
    | Query Success Rate | Users got expected answer |
    | Avg Response Time  | Speed                     |
    | Conversation Depth | Multi-turn usage          |
    
- Layer 6 — Quiz Generator Evaluation Checks quality and correctness of generated quizzes/questions.

    > Metrics:

    | Metric                       | Meaning                      |
    | ---------------------------- | ---------------------------- |
    | Quiz Generation Success Rate | Valid quiz generation        |
    | Question Accuracy            | Correctness                  |
    | Difficulty Alignment         | Easy/medium/hard correctness |
    | Answer Correctness           | Correct answers              |
    | Duplicate Question Rate      | Redundancy                   |
    | Bloom Taxonomy Coverage      | Cognitive depth              |


### Tools can be used for evaluation

| Purpose              | Recommended Tool                                                             |
| -------------------- | ---------------------------------------------------------------------------- |
| Retrieval evaluation | [Ragas](https://github.com/explodinggradients/ragas )  |
| LLM evaluation       | [DeepEval](https://github.com/confident-ai/deepeval )  |
| Experiment tracking  | [LangSmith](https://www.langchain.com/langsmith )      |
| Vector DB inspection | [ChromaDB](https://www.trychroma.com/ ) / FAISS tools  |
| User analytics       | [PostHog](https://posthog.com/ )                       |
| Monitoring           | [OpenTelemetry](https://opentelemetry.io/ )            |
| Benchmark datasets   | [BEIR Benchmark](https://github.com/beir-cellar/beir ) |
