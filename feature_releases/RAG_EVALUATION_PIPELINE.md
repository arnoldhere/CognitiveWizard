# RAG Evaluation Pipeline

## Description

The RAG evaluation pipeline in CognitiveWizard measures how well the retrieval-augmented generation (RAG) chatbot performs on logged question-answer interactions. It is designed for admin-triggered evaluation runs and supports both curated golden datasets and recent RAG query logs.

The pipeline uses:
- `FastAPI` endpoints under `/rag-eval` and `/rag-eval-auto`
- `RAGAS` evaluation metrics for faithfulness, context precision, context recall, and answer relevancy
- a Hugging Face model provider for LLM scoring and embeddings
- persistent JSON report caching in `reports/rag_eval_latest.json`

## Summary Overview

The pipeline includes three main stages:

1. **Trigger**
   - Admin calls `POST /rag-eval/evaluate` with a list of QA pairs.
   - Admin can also trigger `POST /rag-eval-auto/auto-evaluate` to collect recent logs or golden dataset samples automatically.

2. **Evaluation**
   - The server creates a RAGAS-compatible dataset from QA pairs.
   - It loads the configured LLM and embeddings client.
   - It evaluates core metrics using RAGAS.
   - It computes additional custom metrics and latency aggregation.

3. **Report**
   - The result is stored in-memory and on disk.
   - Admin polls `GET /rag-eval/report` to retrieve the latest report.

## How the Flow Works

### Triggering evaluation

- `server/api/rag_evaluation_api.py`
  - `POST /rag-eval/evaluate` accepts an `EvaluationRequest` containing `qa_pairs`.
  - The request is guarded by admin authentication.
  - If no evaluation is already running, it schedules a background task and returns `status: running`.
  - Errors are captured in the report payload.

- `server/api/rag_auto_eval_api.py`
  - `POST /rag-eval-auto/auto-evaluate` collects samples from either:
    - the golden QA dataset, or
    - recent `RAGQueryLog` entries from the database.
  - It builds QA pair dictionaries and runs the same evaluator in the background.

### Building the evaluation dataset

- `server/services/rag_evaluator.py` converts each QA pair into the format RAGAS expects.
- Each entry includes:
  - `question`
  - `answer`
  - `contexts` (retrieved document chunks)
  - `ground_truth`
  - optional latency fields: `retrieval_ms`, `generation_ms`, `total_ms`
- Data is wrapped into a Hugging Face `datasets.Dataset` for RAGAS.

### Loading model clients

- `server/depedencies/get_evaluator.py` constructs a singleton `RAGEvaluator`.
- `server/providers/llm_provider.py` creates the actual LLM client.
- The current flow prefers Hugging Face conversational inference via `HuggingFaceEndpoint` and `ChatHuggingFace`.
- Embeddings use `langchain_huggingface.HuggingFaceEmbeddings`.

### Running RAGAS evaluation

- The evaluator calls `ragas.evaluate(...)` with:
  - `faithfulness`
  - `context_precision`
  - `context_recall`
  - `answer_relevancy`
- The call is executed in a worker thread to avoid blocking FastAPI's async loop.
- The returned `EvaluationResult` is converted to a DataFrame and averaged.

### Computing derived metrics

The pipeline computes:
- `hallucination_rate` = `1 - faithfulness`
- `context_retrieval_ratio` = fraction of retrieved chunks that overlap with ground truth keywords
- `context_awareness` = fraction of answer tokens traceable to retrieved context
- `answer_generation_quality` = average of faithfulness and answer relevancy
- latency averages from injected chatbot timings

### Reporting results

- The final report contains:
  - `evaluated_at`
  - `sample_count`
  - `metrics`
  - `latency`
  - `interpretation`
  - `per_sample`
  - `breakdowns`
- Reports are cached in `reports/rag_eval_latest.json`.

## Key Components

- `server/api/rag_evaluation_api.py`
  - Admin endpoint for manual evaluation runs.
  - Report caching and retrieval.

- `server/api/rag_auto_eval_api.py`
  - Automatic evaluation runner using DB logs or golden dataset.

- `server/services/rag_evaluator.py`
  - Core evaluation logic.
  - RAGAS dataset conversion.
  - Metric aggregation and report assembly.

- `server/depedencies/get_evaluator.py`
  - Singleton evaluator initialization.

- `server/providers/llm_provider.py`
  - Hugging Face provider handling and chat endpoint creation.

- `server/schemas/rag_eval_schema.py`
  - Request/response validation for evaluation runs.

## Notes and current issues

- The evaluation model is configured through environment variables:
  - `RAG_EVAL_LLM` for the evaluation LLM
  - `HF_DEF_MODEL` for fallback/default model
  - `DEF_EMBEDD_MODEL` for the embedding model
- Need to manage the request and routing limit to ensure load balancing and manage inference requests

## Recommended flow enhancements

- Use a stable fallback model when the configured evaluation model is unavailable.
- Validate HF model accessibility before starting a long evaluation run.
- Keep report persistence separate from the in-memory status so retries and restarts are recoverable.

## Example flow summary

1. Admin triggers `/rag-eval/evaluate` with QA pairs.
2. API validates and schedules async evaluation.
3. `RAGEvaluator` converts QA pairs to RAGAS dataset.
4. Model and embeddings are initialized.
5. RAGAS computes core scores.
6. Derived metrics and latency values are added.
7. The report is saved and made available via `/rag-eval/report`.
