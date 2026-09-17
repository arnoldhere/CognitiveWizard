# 🤖 CognitiveWizard — LLM Provider System & Routing Engine

Comprehensive technical documentation for the CognitiveWizard Multi-Provider LLM abstraction, intelligent routing layer, task profiles, failover policies, and error handling taxonomy.

---

## 📋 Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Supported AI Providers & Backends](#2-supported-ai-providers--backends)
3. [Task Profiles & Parameter Matrix](#3-task-profiles--parameter-matrix)
4. [Smart Routing & Failover Mechanism](#4-smart-routing--failover-mechanism)
5. [The FallbackRunnable Architecture](#5-the-fallbackrunnable-architecture)
6. [Error Taxonomy & Auto-Detection](#6-error-taxonomy--auto-detection)
7. [Environment Configuration Reference](#7-environment-configuration-reference)
8. [Developer Usage & Code Integration](#8-developer-usage--code-integration)
9. [Key Files Reference](#9-key-files-reference)

---

## 1. Architecture Overview

CognitiveWizard avoids vendor lock-in by decoupling consumer features from specific AI providers. Every task in the platform—from conversational tutoring and RAG vector searches to deep curriculum planning and multi-stage lesson drafting—requests an LLM configured for that specific **Task Type**.

The **LLM Provider Factory** resolves the task's profile, validates provider health, injects native SDK and LangChain retries, and returns a resilient `FallbackRunnable` that cascades across available models seamlessly.

```mermaid
graph TD
    Consumer["Feature Caller<br/>(Course, Roadmap, Guide, Quiz, RAG, Chat, Summary)"] --> Factory["LLM Factory<br/>(factory.py)"]

    subgraph ConfigLayer ["1. Configuration & Task Profiles"]
        TaskProfiles["Task Profiles<br/>(llm_configs.py)<br/>• Temperature<br/>• Token Budgets<br/>• Timeouts & Backoff"]
        EnvOrder["Priority Order<br/>(LLM_PROVIDER_ORDER)<br/>e.g. groq, huggingface, openai"]
        ModelOverrides["Model Overrides<br/>e.g. QUIZ_GENERATOR_MODEL"]
    end

    TaskProfiles --> Factory
    EnvOrder --> Factory
    ModelOverrides --> Factory

    Factory --> Router["Smart Provider Router<br/>(llm_provider.py)"]

    subgraph Backends ["2. Supported AI Providers"]
        Router --> Groq["Groq Cloud<br/>ChatGroq (Llama-3.3-70B)"]
        Router --> HF["HuggingFace Inference<br/>ChatHuggingFace / Endpoint"]
        Router --> OpenAI["OpenAI<br/>ChatOpenAI (GPT-4o)"]
        Router --> Anthropic["Anthropic<br/>ChatAnthropic (Claude-3.5)"]
    end

    subgraph ExecutionLayer ["3. Resilience & Execution"]
        Router --> FallbackChain["FallbackRunnable<br/>Primary + Fallback List<br/>with_retry backoff"]
        FallbackChain --> Output["Normalized Result<br/>(invoke / ainvoke / generate)"]
    end
```

---

## 2. Supported AI Providers & Backends

The unified [`Provider`](../server/py_server/providers/llm/llm_provider.py) class wraps external provider SDKs into standard LangChain `BaseChatModel` or `LLM` instances.

### 1. Groq Cloud (`groq`)
- **Underlying Client**: `langchain_groq.ChatGroq`
- **Primary Strength**: Ultra-fast LPU inference (optimal for real-time tutoring, fast blueprints, and rapid retries).
- **Default Model**: `GROQ_DEF_MODEL` (`llama-3.3-70b-versatile`)
- **Key Implementation Details**:
  - Maximum tokens are capped at `min(max_new_tokens, 8192)` to adhere to Groq context constraints.
  - Native SDK retries initialized to `max_retries=2`.

### 2. Hugging Face Inference (`huggingface` / `inference`)
- **Underlying Client**: `langchain_huggingface.ChatHuggingFace` & `HuggingFaceEndpoint` (or `InferenceClient` for raw classification).
- **Primary Strength**: Open-source model flexibility and cost control.
- **Default Model**: `HF_DEF_MODEL` (`meta-llama/Llama-3.1-8B-Instruct`)
- **Key Implementation Details**:
  - Automatically exports `HF_TOKEN` and `HUGGINGFACEHUB_API_TOKEN` to environment variables during instantiation so `huggingface_hub`'s internal `HfApi()` can inspect gated models.
  - Supports task-based routing: conversational endpoints use `ChatHuggingFace`, while raw text generation tasks use `HuggingFaceEndpoint`.
  - Configurable backend routing via `HF_PROVIDER` (e.g. `hf-inference`, `together`, `fireworks`).
  - Passes sampling parameters (`top_p`, `top_k`) conditionally when configured.

### 3. OpenAI (`openai`)
- **Underlying Client**: `langchain_openai.ChatOpenAI`
- **Primary Strength**: Benchmark intelligence, complex reasoning, and strict schema adherence.
- **Default Model**: `OPENAI_DEF_MODEL` (`gpt-4o`)
- **Key Implementation Details**:
  - Correctly maps `max_tokens` (OpenAI naming) from the profile's `max_new_tokens`.
  - Native SDK retries initialized to `max_retries=2`.

### 4. Anthropic (`anthropic`)
- **Underlying Client**: `langchain_anthropic.ChatAnthropic`
- **Primary Strength**: Deep academic reasoning, long-context comprehension, and nuanced writing.
- **Default Model**: `ANTHROPIC_DEF_MODEL` (`claude-3-5-sonnet-20241022`)
- **Key Implementation Details**:
  - Sets `max_tokens` and native SDK retries to `2`.

---

## 3. Task Profiles & Parameter Matrix

Rather than passing arbitrary generation arguments, all LLM invocations reference a standardized **Task Profile** in [`llm_configs.py`](../server/py_server/providers/llm/llm_configs.py).

### Complete Task Profiles Table

| Task Name (`TaskType`) | Temp | Max Tokens | Top P | Top K | Timeout | Base Backoff | Max Backoff | Expected Output Schema | Quality Threshold | Model Override |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :---: | :--- |
| `chat` | 0.5 | 1 024 | 0.9 | — | 30s | 1.0s | 10.0s | None (Conversational) | — | None |
| `summarize` | 0.3 | 1 024 | — | — | 45s | 1.5s | 15.0s | None (Summary text) | — | None |
| `quiz` | 0.7 | 2 500 | 0.9 | 50 | 60s | 2.0s | 20.0s | `QuizListSchema` | 0.80 | `QUIZ_GENERATOR_MODEL` |
| `rag` | 0.2 | 1 024 | — | — | 30s | 1.0s | 12.0s | None (Grounded answer) | — | None |
| `wizard` *(legacy)* | 0.5 | 3 500 | 0.9 | 50 | 90s | 2.0s | 30.0s | `WizardRawSchema` | 0.75 | None |
| `roadmap_planner` | 0.4 | 3 000 | 0.9 | 40 | 60s | 2.0s | 25.0s | `RoadmapPlanSchema` | 0.80 | None |
| `roadmap_composer` | 0.3 | 4 000 | 0.9 | 40 | 75s | 2.0s | 30.0s | `RoadmapSchema` | 0.85 | None |
| `guide_planner` | 0.4 | 3 000 | 0.9 | 40 | 60s | 2.0s | 25.0s | `GuidePlanSchema` | 0.80 | None |
| `guide_writer` | 0.5 | 5 000 | 0.9 | 50 | 90s | 2.5s | 35.0s | `GuideSchema` | 0.85 | None |
| `guide_reviewer` | 0.2 | 2 048 | — | — | 45s | 1.5s | 20.0s | `ReviewerSchema` | 0.90 | None |
| `course_architect` | 0.4 | 6 144 | 0.9 | 40 | 90s | 2.0s | 30.0s | `CourseBlueprintSchema`| 0.80 | None |
| `course_lesson` | 0.6 | 6 144 | 0.9 | 50 | 120s | 3.0s | 45.0s | `CourseLessonSchema` | 0.80 | None |
| `course_reviewer` | 0.2 | 2 048 | — | — | 45s | 1.5s | 20.0s | `LessonReviewSchema` | 0.90 | None |
| `course_quality` | 0.1 | 1 024 | — | — | 30s | 1.0s | 15.0s | `CoursePackageSchema` | 0.80 | None |

### Why Profiles Are Tuned Differently:
- **Pedagogical Review & Quality Gates (`0.1 - 0.2`)**: Minimal temperature ensures deterministic, objective assessment against Bloom's taxonomy and strict schema validation.
- **RAG & Summarization (`0.2 - 0.3`)**: Minimizes hallucinations, forcing answers to ground themselves directly in retrieved documentation.
- **Curriculum Architecture & Milestones (`0.4`)**: Balances structured organization with diverse domain topics.
- **Lesson Authorship (`0.5 - 0.6`)**: Rich explanations, real-world analogies, code snippets, and conversational teaching prose with high token limits (up to 6 144 tokens).
- **Quiz Generation (`0.7`)**: Higher creativity to generate varied question formats (MCQ, scenario-based, fill-in-the-blank) without repetitive phrasing.

---

## 4. Smart Routing & Failover Mechanism

The routing brain lives in [`providers/llm/factory.py`](../server/py_server/providers/llm/factory.py). It exposes two core initialization functions:

1. **`get_llm_for_task(task, provider=None)`**:
   Instantiates a single provider using the task's profile. If `provider` is omitted, defaults to `settings.DEF_LLM_PROVIDER`.
2. **`get_llm_for_course_task(task)`**:
   Builds a full multi-provider failover chain for generation pipeline nodes.

### Step-by-Step Failover Flow

```
Pipeline Node calls: get_llm_for_course_task(TaskType.COURSE_LESSON)
       │
       ▼
[factory.py] Parses LLM_PROVIDER_ORDER from environment
       │ (e.g. "groq, huggingface, openai")
       │
       ├─ Attempt 1: Initialize 'groq'
       │    → Apply task profile (temp=0.6, max_tokens=6144)
       │    → Attach LangChain retry: with_retry(stop_after_attempt=2, wait_exponential_jitter=True)
       │    → ✅ Appended as Primary
       │
       ├─ Attempt 2: Initialize 'huggingface'
       │    → Apply task profile
       │    → Attach LangChain retry
       │    → ✅ Appended to Fallbacks list
       │
       ├─ Attempt 3: Initialize 'openai'
       │    → Apply task profile
       │    → Attach LangChain retry
       │    → ✅ Appended to Fallbacks list
       │
       ▼
Returns FallbackRunnable(primary=groq, fallbacks=[huggingface, openai])
```

---

## 5. The FallbackRunnable Architecture

[`FallbackRunnable`](../server/py_server/providers/llm/factory.py) is a custom subclass of LangChain's `Runnable` designed to provide:
1. Multi-provider execution cascading.
2. Uniform support for synchronous `invoke()`, asynchronous `ainvoke()`, and legacy `.generate()`.
3. Error collection and propagation via `AllProvidersFailedError`.

```mermaid
flowchart TD
    Call["Invoke FallbackRunnable<br/>(invoke / ainvoke / generate)"] --> P1["Primary Provider (e.g. Groq)"]

    P1 -- "Success" --> Result["Return Response"]
    P1 -- "Error / 429 / 5xx" --> FB1["Fallback 1 (e.g. HuggingFace)"]

    FB1 -- "Success" --> Result
    FB1 -- "Error / Timeout" --> FB2["Fallback 2 (e.g. OpenAI)"]

    FB2 -- "Success" --> Result
    FB2 -- "All Failed" --> Err["Raise AllProvidersFailedError<br/>(contains diagnostic failure chain)"]
```

### Key Execution Capabilities:
- **Transparent Async Dispatch**: If an underlying fallback model only implements synchronous `invoke`, `ainvoke` executes it via `loop.run_in_executor` to avoid blocking the event loop.
- **Backward-Compatible `.generate()`**: Legacy services (such as Summarization, Quiz, and older RAG chains) invoke `.generate([messages])`. `FallbackRunnable` handles generation unpacking and formats results as `LLMResult(generations=[[Generation(text=...)]])`.
- **Zero Silent Failures**: If every candidate fails, the full chain of failures is formatted into an `AllProvidersFailedError` with the task name and specific provider failure reasons.

---

## 6. Error Taxonomy & Auto-Detection

All external errors from providers (HTTP status codes, SDK exceptions, network timeouts) are normalized in [`provider_errors.py`](../server/py_server/providers/llm/provider_errors.py) into a typed exception hierarchy.

```mermaid
classDiagram
    class LLMProviderError {
        +str message
        +str provider
        +Exception cause
        +Any raw_response
    }
    class RateLimitError {
        +float retry_after
        +float reset_time
    }
    class TransientProviderError
    class ProviderUnavailableError
    class AuthenticationError
    class InvalidRequestError
    class ModelNotFoundError
    class OutputValidationError
    class ContentQualityError
    class AllProvidersFailedError {
        +List failures
        +str task
    }

    LLMProviderError <|-- RateLimitError
    LLMProviderError <|-- TransientProviderError
    LLMProviderError <|-- ProviderUnavailableError
    LLMProviderError <|-- AuthenticationError
    LLMProviderError <|-- InvalidRequestError
    LLMProviderError <|-- ModelNotFoundError
    LLMProviderError <|-- OutputValidationError
    LLMProviderError <|-- ContentQualityError
    LLMProviderError <|-- AllProvidersFailedError
```

### Error Classes & Actions

| Exception Class | HTTP / Trigger | Description | Handling Policy |
| :--- | :---: | :--- | :--- |
| `RateLimitError` | 429 | Rate limit or quota exhausted. Carries `retry_after` seconds. | Router reads header/message retry duration and sleeps before retrying or falling back. |
| `TransientProviderError` | 500, 502, 503, 504, Timeout | Transient network glitch, socket reset, or upstream gateway timeout. | Safe to retry with exponential backoff up to task max attempts. |
| `ProviderUnavailableError` | ConnectionRefused | DNS failure, connection refused, or circuit open. | Skip immediately to next provider in fallback list. |
| `AuthenticationError` | 401, 403 | Invalid API key or expired credentials. | Non-retryable on same provider; fail fast or fallback to next vendor. |
| `InvalidRequestError` | 400, 422 | Context length exceeded or malformed prompt parameter. | Non-retryable without modifying inputs. |
| `ModelNotFoundError` | 404 | Decommissioned or mistyped model identifier. | Non-retryable on this model. |
| `OutputValidationError` | JSON parse / Pydantic failure | Model responded, but output failed schema extraction or validation. | Triggers validation auto-repair or regeneration. |
| `ContentQualityError` | Reviewer FAIL | Content generated but rejected by pedagogical review. | Routes through LangGraph retry loop back to generator node. |
| `AllProvidersFailedError` | All exhausted | Every configured provider failed to initialize or execute. | Surfaces graceful failure and user-friendly message in Celery task. |

### Automated Retry-After Header Extraction
`extract_retry_after(exc)` automatically inspects:
1. Standard HTTP headers: `Retry-After`.
2. Vendor-specific headers: `x-ratelimit-reset-requests`, `x-ratelimit-reset-tokens`.
3. Error message strings using regex for patterns like `"try again in 4.2s"` or `"wait 1m 30s"`.

---

## 7. Environment Configuration Reference

All LLM provider parameters are managed via environment variables (in `server/.env`).

```env
# ── Global Provider Selection ─────────────────────────────────
DEF_LLM_PROVIDER=groq
# Default provider used for standalone single-provider calls

LLM_PROVIDER_ORDER=groq,huggingface,openai
# Priority order for multi-provider pipelines (comma-separated, left = highest priority)

# ── Groq Cloud ────────────────────────────────────────────────
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_DEF_MODEL=llama-3.3-70b-versatile

# ── Hugging Face ──────────────────────────────────────────────
HF_API_KEY=hf_your_huggingface_token_here
HF_DEF_MODEL=meta-llama/Llama-3.1-8B-Instruct
HF_PROVIDER=hf-inference
# Optional routing backend: "hf-inference", "together", "fireworks"

# ── OpenAI ────────────────────────────────────────────────────
OPENAI_API_KEY=sk-proj-your_openai_api_key_here
OPENAI_DEF_MODEL=gpt-4o

# ── Anthropic ─────────────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-your_anthropic_api_key_here
ANTHROPIC_DEF_MODEL=claude-3-5-sonnet-20241022

# ── Task Model Overrides (Pin specific models per task) ────────
QUIZ_GENERATOR_MODEL=meta-llama/Llama-3.1-8B-Instruct
# Overrides provider default for the quiz generation task only
```

---

## 8. Developer Usage & Code Integration

### Using an LLM in a Multi-Agent Node
For generation nodes participating in a LangGraph pipeline (e.g. course, roadmap, guide):

```python
from providers.llm.factory import get_llm_for_course_task
from providers.llm.tasks import TaskType
from langchain_core.messages import SystemMessage, HumanMessage

# 1. Obtain resilient FallbackRunnable with automatic retries and failover
llm = await get_llm_for_course_task(TaskType.ROADMAP_PLANNER)

# 2. Invoke asynchronously
messages = [
    SystemMessage(content="You are a curriculum architect..."),
    HumanMessage(content="Create a roadmap for Python..."),
]
response = await llm.ainvoke(messages)
response_text = response.content
```

### Using an LLM in a Standalone Service
For single-shot services like text summarization or chat:

```python
from providers.llm.factory import get_llm_for_task
from providers.llm.tasks import TaskType

# Obtain LLM using global default provider and chat profile
llm = get_llm_for_task(TaskType.CHAT)
response = llm.invoke("Explain binary search simply.")
```

---

## 9. Key Files Reference

| File | Purpose |
| :--- | :--- |
| [`providers/llm/llm_provider.py`](../server/py_server/providers/llm/llm_provider.py) | Concrete `Provider` wrapper around Groq, HuggingFace, OpenAI, and Anthropic. |
| [`providers/llm/factory.py`](../server/py_server/providers/llm/factory.py) | Router and `FallbackRunnable` multi-provider cascading implementation. |
| [`providers/llm/llm_configs.py`](../server/py_server/providers/llm/llm_configs.py) | Central `TASK_PROFILES` repository with temperature, tokens, timeouts, and thresholds. |
| [`providers/llm/tasks.py`](../server/py_server/providers/llm/tasks.py) | `TaskType` enum defining all supported platform operations. |
| [`providers/llm/provider_errors.py`](../server/py_server/providers/llm/provider_errors.py) | Normalized exception hierarchy and `extract_retry_after` parser. |
| [`config/settings.py`](../server/py_server/config/settings.py) | Pydantic BaseSettings loading all environment variables. |

---

<div align="center">
  <sub>CognitiveWizard © 2026 — Intelligent Curriculum & Adaptive Learning Platform</sub>
</div>
