# RAG Evaluation Pipeline Implementation Guide

## Overview
Complete RAG performance evaluation system using RAGAS metrics integrated with the CognitiveWizard backend and admin dashboard. Provides one-click evaluation on recent query logs with detailed metric analysis.

## Architecture

### Backend Components

#### 1. **RAG Query Log Model** (`server/models/rag_log.py`)
Stores RAG query execution logs for evaluation and monitoring.

**Database Table: `rag_query_logs`**

#### 2. **RAG Evaluator Service** (`server/services/rag_evaluator.py`)
Core evaluation engine implementing RAGAS and custom metrics.

**Features:**
- RAGAS Native Metrics (when available):
  - Faithfulness Score (0-1): Factual correctness based on context
  - Context Precision (0-1): Relevance of retrieved contexts
  - Context Recall (0-1): Coverage of relevant contexts
  - Answer Relevancy (0-1): Query-answer alignment

- Custom Metrics:
  - **Hallucination Rate** (0-1): 1 - token coverage ratio
  - **Context Retrieval Ratio** (0-1): Keyword overlap between question and contexts
  - **Context Awareness** (0-1): Answer coverage over retrieved chunks
  - **Hallucination Rate** (derived from faithfulness)

- Latency & Efficiency:
  - Retrieval latency in ms
  - Generation latency in ms
  - Overall efficiency score (0-1)

#### 3. **Instrumented Chain Wrapper** (`server/services/instrumented_chain.py`)
Wraps existing RAG chains to capture metrics and log queries.

**Features:**
- Measures retrieval and generation latency
- Captures contexts and generated answers
- Persists query logs to database
- Maintains backward compatibility with existing RAG service

#### 4. **Evaluation API Routes** (`server/api/rag_evaluation.py`)
RESTful endpoints for running and retrieving evaluations.

**Endpoints:**

- **POST `/rag/evaluate`** - Evaluate a single query-answer pair
  ```json
  {
    "question": "What is AI?",
    "answer": "AI is artificial intelligence...",
    "contexts": ["AI refers to...", "Machine learning..."],
    "latency_retrieval_ms": 150.5,
    "latency_generation_ms": 320.8
  }
  ```
  Returns: Structured evaluation report with all metrics

- **POST `/rag/auto-evaluate`** - One-click evaluation on recent logs
  - Fetches last N queries from user's query logs
  - Runs background evaluation
  - Returns task status
  - Caches results for dashboard display

- **GET `/rag/evaluation-report`** - Get latest evaluation report
  - Returns cached report if available
  - Otherwise runs auto-evaluation on recent logs
  - Includes aggregated statistics across queries

- **GET `/rag/evaluation-logs`** - Retrieve recent query logs
  - Returns last N query logs for manual analysis
  - Includes latency and context metadata

- **DELETE `/rag/evaluation-report`** - Clear cached reports
  - Clears in-memory cache
  - Clears evaluator cache

### Frontend Components

#### 1. **RAG Evaluation Dashboard** (`client/src/components/admin/RAGEvalDashboard.jsx`)
React component for admin RAG performance monitoring.

**Features:**
- **One-Click Evaluation**: Run evaluation on recent query logs
- **Real-time Polling**: Monitors evaluation progress
- **Metric Display**: Color-coded performance indicators
  - Green: ≥80% (Excellent)
  - Yellow: 60-80% (Good)
  - Orange: 40-60% (Fair)
  - Red: <40% (Poor)
- **Latency Breakdown**: Retrieval vs generation timing
- **JSON Export**: Download metrics for analysis
- **Overall Score**: Composite quality metric

#### 2. **Dashboard Styles** (`client/src/styles/RAGEvalDashboard.css`)
- Responsive grid layout
- Color-coded metric cards
- Progress indicators
- Mobile-optimized design

### Integration Points

#### Database Integration
```python
# Models automatically created via SQLAlchemy
from models import RAGQueryLog

# Logs are created by instrumented chain
log = RAGQueryLog(
    user_id=123,
    question="Query...",
    answer="Response...",
    contexts=[...],
    latency_retrieval_ms=150.5,
    latency_generation_ms=320.8
)
```

#### API Integration
```python
# In main.py - routes are auto-registered
from api.rag_evaluation import router as rag_evaluation_router
app.include_router(rag_evaluation_router)
```

#### Frontend Integration
```jsx
// In AdminDashboard.jsx
import RAGEvalDashboard from '../components/admin/RAGEvalDashboard';

// Component automatically handles API calls and state
<RAGEvalDashboard />
```

## Overall Score Calculation

The dashboard displays an **Overall Score** (0-1) weighted composite:

```
Overall = (
  0.25 × Faithfulness +
  0.20 × Answer Relevancy +
  0.15 × Context Precision +
  0.15 × Context Recall +
  0.10 × Context Awareness +
  -0.10 × Hallucination Rate +  // Inverted (lower is better)
  0.05 × Latency Efficiency
)
```

**Interpretation:**
- 0.8-1.0: Excellent RAG performance
- 0.6-0.8: Good performance with minor improvements possible
- 0.4-0.6: Fair performance, optimization recommended
- <0.4: Poor performance, significant improvements needed

### Running Evaluation

1. Click **"🚀 Run Evaluation"** button
2. System fetches last 50 queries from logs
3. Runs evaluation in background
4. Dashboard polls for results (typically 10-30 seconds)
5. Displays comprehensive metrics when complete

### Interpreting Results

- **Green cards** (≥80%): Areas performing well
- **Yellow cards** (60-80%): Good performance, room for improvement
- **Red cards** (<60%): Needs attention

For each metric:
- Check the interpretation text for specific recommendations
- Use latency breakdown to identify bottlenecks
- Export JSON for detailed analysis

## Performance Optimization Tips

### To Improve Faithfulness
- Enhance document quality in knowledge base
- Reduce context window size
- Use better summarization prompts

### To Improve Context Recall
- Add more documents to knowledge base
- Improve chunking strategy
- Use hybrid retrieval (BM25 + vector search)

### To Reduce Hallucination
- Increase context provision
- Add source citations to answers
- Use chain-of-thought prompting

### To Improve Latency
- Optimize vector database queries
- Implement caching layer
- Reduce context window size
- Use faster embedding models

## Future Enhancements

- [ ] Support for custom metric plugins
- [ ] Time-series metrics dashboard
- [ ] Per-document quality metrics
- [ ] Automated improvement suggestions
- [ ] A/B testing framework
- [ ] Metric alerting/thresholds
- [ ] Integration with monitoring tools (Datadog, New Relic)
