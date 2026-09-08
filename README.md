# 🧙‍♂️ CognitiveWizard

> **AI-Powered Adaptive Learning Platform** — Transforms topics, goals, and source materials into structured, interactive, and pedagogically sound courses. Featuring multi-agent content generation, durable checkpoint & resume execution, grounded RAG tutoring, and interactive in-browser code execution.

---

## 📋 Table of Contents

- [Platform Overview](#platform-overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Multi-Agent Course Generation & Resilient Checkpointing](#multi-agent-course-generation--resilient-checkpointing)
- [Getting Started & Startup Guide](#getting-started--startup-guide)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Roadmap](#roadmap)

---

## Platform Overview (Sep. 2026)

CognitiveWizard empowers tutors and self-directed learners with an end-to-end intelligent curriculum engine. Rather than relying on simple one-shot LLM prompts, CognitiveWizard orchestrates a **AI-driven multi-agent pipeline** that designs curricula, gathers verified web sources, drafts deep modular lessons, conducts pedagogical reviews, and applies strict quality gates.

---

## Key Features

| Capability                              | Description                                                                                                                                                    |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🏗️ **Multi-Agent Course Generation**    | 5-stage LangGraph workflow: Architect → Research → Generator → Pedagogical Reviewer → Quality Gate.                                                            |
| 🔄 **Durable Checkpoint & Resume**      | Celery + Redis task queue with native MySQL checkpointing (`MySQLSaver`). Server restarts or worker crashes resume from the last completed stage.              |
| 🛡️ **Pedagogical QA & Quality Gate**    | Validates lesson structure, Bloom's taxonomy alignment, and enforces an 80% pass ratio threshold. Distinguishes between `passed`, `failed`, and `unavailable`. |
| ⚡ **Multi-Provider LLM Fallbacks**     | Resilient provider orchestration with automatic retry and fallback order (Groq → HuggingFace → OpenAI → Anthropic).                                            |
| 🔍 **Live Web Research**                | Tavily-powered research agent fetches curated documentation, articles, and video resources per lesson.                                                         |
| 💬 **Grounded RAG Chatbot (Ask Tutor)** | In-context tutoring assistant grounded in lesson content using ChromaDB vector search and MongoDB session history.                                             |
| 💻 **In-Browser Code Execution**        | Zero-server round-trip sandbox running Python (Pyodide / WASM) and JavaScript directly in the browser.                                                         |
| 🧪 **Adaptive Exercises & Quizzes**     | Automated generation of interactive quizzes, coding challenges, and conceptual reflection questions.                                                           |
| 📊 **Real-Time Progress & Monitoring**  | Live stage-by-stage generation progress polling (`/wizard/generation/:content_id`) and admin control over jobs.                                                |

---

## Tech Stack

| Layer                     | Technology                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------- |
| **Frontend**              | React 19, Vite, Tailwind CSS v4, Lucide Icons, Framer Motion, GSAP                    |
| **API Gateway**           | Node.js / Express, Sequelize ORM, JWT Authentication, Rate Limiting                   |
| **AI Backend**            | Python 3.11+, FastAPI, LangGraph, Pydantic v2                                         |
| **Task Queue & Broker**   | Celery, Redis                                                                         |
| **Checkpointing & State** | MySQL (`langgraph_checkpoints`, `langgraph_writes`, `generation_checkpoints`)         |
| **Databases**             | MySQL (relational content/jobs), MongoDB (chat history), ChromaDB (vector embeddings) |
| **LLM Providers**         | Groq, HuggingFace Inference API, OpenAI, Anthropic (with automatic failover)          |
| **Search & Research**     | Tavily Search API                                                                     |

---

## System Architecture

```txt
┌────────────────────────────────────────────────────────────────────────┐
│                        Client: React 19 (Vite)                         │
│       CourseViewer · LessonReader · CodeSandbox · AskTutor · Quiz      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST (port 5173 / 80)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│              Express API Gateway (js_server — port 3000)               │
│      Auth · Content CRUD · Checkpoint Webhooks · Rate Limiting         │
│               MySQL  ·  MongoDB (Chat)  ·  Redis (Cache)               │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │ REST                           │ Webhooks
                    ▼                                ▲
┌────────────────────────────────────────────────────┴───────────────────┐
│                 FastAPI AI Engine (py_server — port 8000)              │
│       /wizard/generate-agentic  ·  /rag/chat  ·  /quiz/generate        │
└───────────────────┬────────────────────────────────────────────────────┘
                    │ Enqueues Task (.delay)
                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│              Celery Distributed Worker (py_server background)          │
│                Redis Broker  ◄───►  MySQL LangGraph Saver              │
│                                                                        │
│  [Architect Node] ──► [Research Node] ──► [Generator Node]            │
│                              ▲                     │                   │
│                              │ (Retry on Fail)     ▼                   │
│                       [Quality Gate] ◄── [Reviewer Node]               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ External APIs
                                    ▼
                Groq / HuggingFace / OpenAI / Anthropic  ·  Tavily Search
```

---

## Multi-Agent Course Generation & Resilient Checkpointing

### 1. The 5-Stage Agent Pipeline

1. **Learning Architect**: Generates the modular blueprint (Phases → Modules → Lessons).
2. **Research Agent**: Queries Tavily in parallel batches to gather verified URLs and reference material.
3. **Lesson Generator**: Generates full lesson content (theory, analogies, code snippets, misconceptions, practice exercises) in concurrent batches.
4. **Pedagogical Reviewer**: Audits lesson depth, clarity, and objectives. Outputs explicit statuses: `passed`, `failed`, or `unavailable`. Retries failed lessons up to 2 times.
5. **Quality Gate**: Validates complete course completeness against an 80% passing threshold before packaging the syllabus for publication.

### 2. Checkpoint & Resume Architecture

- **Durable Queuing**: FastAPI endpoints push jobs to Celery via Redis broker. Worker crashes or service restarts do not drop jobs.
- **MySQL Checkpointer**: Graph state is persisted using a custom `MySQLSaver` connected to MySQL (`langgraph_checkpoints` & `langgraph_writes`).
- **Incremental Progress**: Each completed lesson and stage triggers an internal webhook (`/internal/wizard-webhook/checkpoint` and `/lesson-incremental`), allowing frontend polling via `GET /wizard/generation/:content_id`.
- **Fault Tolerance**: If execution is interrupted, the job picks up from the latest checkpoint without re-running completed LLM calls.

---

## Getting Started & Startup Guide

### Prerequisites

Ensure the following services and runtimes are installed and running:

- **Node.js** >= 18.0
- **Python** >= 3.11
- **MySQL Server** (running with your configured database, e.g., `cogntivewizard_db`)
- **Redis Server** (running on `localhost:6379`)
- **MongoDB** (running locally or cloud connection string)

---

### Step 1: Environment Setup

Create `.env` inside `server/` (shared by `js_server` and `py_server`), or verify the existing environment file:

```env
# Application Ports
JS_SERVER_PORT=3000
JS_SERVER_URL=http://localhost:3000
PY_SERVER_URL=http://localhost:8000

# Databases
DATABASE_URL=mysql+pymysql://root:password@localhost:3306/cogntivewizard_db
DATABASE_NAME=cogntivewizard_db
DATABASE_USER=root
DATABASE_PASSWORD=password
MONGO_URI=mongodb://localhost:27017/cognitivewizard_chat
REDIS_URL=redis://localhost:6379/0

# Security
JWT_SECRET_KEY=your_jwt_secret_key

# LLM & Search Providers
GROQ_API_KEY=your_groq_api_key
GROQ_DEF_MODEL=llama-3.3-70b-versatile
HF_API_KEY=your_huggingface_key
TAVILY_API_KEY=your_tavily_api_key
LLM_PROVIDER_ORDER=groq,huggingface,openai
```

---

### Step 2: Running the Services

To run CognitiveWizard locally, start the following **4 terminal processes**:

#### Terminal 1 — Express API Gateway

```bash
cd server/js_server
npm install
npm run dev
# Running on http://localhost:3000
```

#### Terminal 2 — FastAPI AI Engine

```bash
cd server/py_server
# Activate virtual environment
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# Running on http://localhost:8000
```

#### Terminal 3 — Celery Background Worker

```bash
cd server/py_server
# Activate the same virtual environment
source .venv/bin/activate
celery -A core.celery_app worker --loglevel=info
# Listens for agentic course generation and resume tasks
```

#### Terminal 4 — React Frontend

```bash
cd client
npm install
npm run dev
# Running on http://localhost:5173
```

---

## API Reference

### Express Gateway (`js_server` — Port 3000)

| Method | Endpoint                              | Description                                                 |
| ------ | ------------------------------------- | ----------------------------------------------------------- |
| `POST` | `/api/auth/register`                  | Register a new user                                         |
| `POST` | `/api/auth/login`                     | Authenticate user and receive JWT                           |
| `POST` | `/api/wizard/generate`                | Generate roadmap / guide / single-prompt content            |
| `POST` | `/api/wizard/generate-agentic`        | Dispatch multi-agent course generation to Celery            |
| `GET`  | `/api/wizard/generation/:content_id`  | **New**: Poll realtime checkpoint progress & stage statuses |
| `GET`  | `/api/wizard/:content_id`             | Fetch full course hierarchy or generated content            |
| `GET`  | `/api/wizard/:content_id/lesson/:lid` | Fetch individual lesson with sections & resources           |
| `POST` | `/api/wizard/:content_id/publish`     | Approve and publish generated course draft                  |
| `POST` | `/api/rag/chat`                       | Query RAG assistant with grounded lesson context            |
| `POST` | `/api/quiz/generate`                  | Generate topic- or lesson-based quiz                        |
| `POST` | `/api/summary/generate`               | Generate structured summary of text or URL                  |

### Internal Webhooks & Job Control

| Method | Endpoint                                      | Handler                                           |
| ------ | --------------------------------------------- | ------------------------------------------------- |
| `POST` | `/internal/wizard-webhook/checkpoint`         | Records granular stage checkpoint in MySQL        |
| `POST` | `/internal/wizard-webhook/lesson-incremental` | Saves lesson as soon as it is generated           |
| `POST` | `/internal/wizard-webhook/complete`           | Finalizes complete course persistence transaction |
| `GET`  | `/internal/wizard-webhook/job/:job_id`        | Fetches generation job metadata                   |
| `POST` | `/internal/wizard-webhook/job/:job_id/retry`  | Re-enqueues failed job for resumption             |
| `POST` | `/internal/wizard-webhook/job/:job_id/cancel` | Marks job cancelled and revokes task              |

---

## Project Structure

```text
CognitiveWizard/
├── client/                     # React 19 Frontend (Vite + Tailwind CSS v4)
│   └── src/
│       ├── components/wizard/  # CourseViewer, LessonReader, CodeSandbox
│       └── pages/              # WizardModule, QuizPage, Summarize, ChatbotPage
│
├── server/
│   ├── js_server/              # Express API Gateway
│   │   ├── controllers/        # Request handling & webhook receivers
│   │   ├── models/             # Sequelize models (WizardContent, GenerationJob, GenerationCheckpoint)
│   │   ├── routes/             # User and admin route definitions
│   │   └── index.js            # Gateway entrypoint & webhook routing
│   │
│   └── py_server/              # FastAPI AI & Multi-Agent Engine
│       ├── agents/
│       │   ├── graphs/         # LangGraph course generation workflow
│       │   ├── nodes/          # Architect, Research, Lesson Generator, Reviewer, Quality Gate
│       │   └── states/         # TypedDict pipeline states
│       ├── core/
│       │   ├── celery_app.py   # Celery app configured with Redis
│       │   ├── db.py           # PyMySQL database connection helper
│       │   └── mysql_checkpointer.py # Custom LangGraph MySQLSaver implementation
│       ├── providers/llm/      # Multi-provider client factory with fallback backoff
│       ├── tasks/              # Celery background tasks (run_agentic_workflow_task, resume_job_task)
│       └── main.py             # FastAPI entrypoint
│
└── README.md
```

---

## Roadmap

- [x] Resilient multi-agent course generation with LangGraph
- [x] Celery + Redis distributed queuing for heavy background workflows
- [x] Durable MySQL checkpointing and recovery from server restarts
- [x] Web research agent integration with Tavily
- [x] In-browser Python WASM (Pyodide) and JS execution
- [ ] Adaptive learning path adjustment based on quiz performance
- [ ] Automated deadline-aware scheduling & calendar export (ICS)
- [ ] Audio/voice synthesis for hands-free lesson listening
- [ ] Community marketplace for sharing & discovering curated courses

---

<div align="center">
  <sub>CognitiveWizard © 2026</sub>
</div>
