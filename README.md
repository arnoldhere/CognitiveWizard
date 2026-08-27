# 🧙‍♂️ CognitiveWizard

> **AI-powered intelligent learning platform** for turning learning material and goals into useful, adaptive study experiences. It combines structured learning tools with conversational retrieval so learners can understand, practise, revise, and plan from anywhere.

---

## 📋 Table of Contents

- [Platform Overview](#platform-overview)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Modules & Workflows](#modules--workflows)
  - [1. Course Generation (Wizard)](#1-course-generation-wizard)
  - [2. RAG Chatbot (Ask Tutor)](#2-rag-chatbot-ask-tutor)
  - [3. Quiz Engine](#3-quiz-engine)
  - [4. Content Summarizer](#4-content-summarizer)
  - [5. Course Viewer & Lesson Reader](#5-course-viewer--lesson-reader)
  - [6. Subscription & Payments](#6-subscription--payments)
  - [7. Admin Panel](#7-admin-panel)
- [Database Schema](#database-schema)
- [LLM Provider System](#llm-provider-system)
- [Getting Started](#getting-started)
- [Docker Deployment](#docker-deployment)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)

---

## Platform Overview

CognitiveWizard is a **full-stack AI learning platform** designed for tutors and learners. Tutors define topics and the platform handles everything: it designs a course structure, researches real web sources, generates deep lesson content, performs automated pedagogical review, and delivers an interactive learning experience to students.

**Core capabilities at a glance:**

| Capability                | Description                                                                      |
| ------------------------- | -------------------------------------------------------------------------------- |
| 🏗️ Course Generation      | Multi-agent AI pipeline (LangGraph) builds complete courses from a single prompt |
| 🔍 Web Research           | Tavily-powered research agent fetches curated sources per lesson                 |
| 🧐 Pedagogical Review     | Automated QA loop checks educational quality before publishing                   |
| 💬 RAG Chatbot            | Ask Tutor chatbot with lesson context injected for grounded answers              |
| 🧪 Interactive Exercises  | Coding challenges, quizzes, and reflection prompts per lesson                    |
| 💻 In-Browser Code Runner | Python (Pyodide/WASM) and JavaScript sandbox — zero server round-trip            |
| 📝 Summarizer             | Paste any content to get instant structured summaries                            |
| 📊 Admin Dashboard        | User management, LLM config, generation job monitoring                           |

---

## Tech Stack

| Layer             | Technology                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------- |
| **Frontend**      | React 18 + Vite, Vanilla CSS, MUI, React Router                                             |
| **API Gateway**   | Node.js / Express, Sequelize ORM, JWT Auth, Helmet, Rate Limiting                           |
| **AI Backend**    | Python / FastAPI, LangGraph, Pydantic v2                                                    |
| **LLM Providers** | HuggingFace Inference API                                                                   |
| **Research**      | Tavily Search API                                                                           |
| **Databases**     | MySQL (relational data), MongoDB (RAG documents), Redis (sessions, LangGraph checkpointing) |
| **Vector DB**     | ChromaDB / in-process vector store                                                          |
| **Deployment**    | Docker Compose (3 containers: ai-backend, api-gateway, frontend)                            |

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                        Browser (React)                             │
│    Home · Login · Wizard · CourseViewer · Quiz · Summarize · RAG  │
└────────────────────────┬───────────────────────────────────────────┘
                         │  HTTP / REST  (port 80 in prod)
                         ▼
┌────────────────────────────────────────────────────────────────────┐
│               js_server  —  Express API Gateway  (port 3000)       │
│  Auth · Wizard · Quiz · RAG · Summary · Subscription · Admin       │
│  MySQL  ·  MongoDB  ·  Redis                                       │
└──────────────────────────┬─────────────────────────────────────────┘
                           │  Internal HTTP calls
                           ▼
┌────────────────────────────────────────────────────────────────────┐
│           py_server  —  FastAPI AI Engine  (port 8000)             │
│  /wizard  ·  /rag  ·  /quiz  ·  /summarize  ·  /subscription      │
│  LangGraph Agents · VectorDB · Tavily                              │
└──────────────────────────────────────────────────────────────────┘
                        │               │
                   HuggingFace      Tavily API
                   Inference API    (web research)
```

---

## Modules & Workflows

---

### 1. Course Generation (Wizard)

The flagship module. A **5-stage multi-agent LangGraph pipeline** converts a topic + preferences into a fully structured, content-rich course.

#### End-to-End Flow

```
User Input (topic, skill level, goal, learning style)
      │
      ▼  POST /api/wizard/generate
js_server  →  creates WizardContent row (status: "generating")
           →  calls py_server POST /wizard/generate-agentic  (returns 202)
                    │
                    ▼  Background LangGraph pipeline
         ┌──────────────────────────────────────────────┐
         │  Stage 1 — Learning Architect                │
         │    · Designs phases → modules → lesson titles │
         │    · No content yet (cheap, fast pass)        │
         └──────────────────┬───────────────────────────┘
                            │
         ┌──────────────────▼───────────────────────────┐
         │  Stage 2 — Research Agent                    │
         │    · Tavily: fetches URLs/YT per lesson       │
         │    · Parallel batches of 5 lessons            │
         │    · No LLM call — pure search                │
         └──────────────────┬───────────────────────────┘
                            │
         ┌──────────────────▼───────────────────────────┐
         │  Stage 3 — Lesson Generator                  │
         │    · Generates full content per lesson        │
         │    · Concurrent batches of 3                  │
         │    · Sections: explanation · analogy ·        │
         │      code example · mistakes · summary        │
         │    · Injects research evidence as resources   │
         └──────────────────┬───────────────────────────┘
                            │
         ┌──────────────────▼───────────────────────────┐
         │  Stage 4 — Pedagogical Reviewer              │
         │    · QA against educational checklist         │
         │    · Bloom's taxonomy, objective coverage     │
         │    · PASS / FAIL per lesson                   │
         │    · FAIL + retry < 2 → back to Stage 3       │
         └──────────────────┬───────────────────────────┘
                            │
         ┌──────────────────▼───────────────────────────┐
         │  Stage 5 — Quality Gate                      │
         │    · Final validation (word count, citations) │
         │    · Assembles CoursePackageSchema            │
         │    · POSTs to webhook → SQL transaction       │
         └──────────────────┬───────────────────────────┘
                            │
         js_server persists course to MySQL (6 tables)
                            │
         Frontend polls for completion → opens CourseViewer
```

#### Real-Time Status Updates

Each stage fires a webhook to the JS server. The React frontend polls every 4 seconds and shows a live 5-step progress bar:

| Stage                | Status message                          |
| -------------------- | --------------------------------------- |
| Learning Architect   | 🏗️ Designing your course structure...   |
| Research Agent       | 🔍 Researching sources for N lessons... |
| Lesson Generator     | ✍️ Writing content for N lessons...     |
| Pedagogical Reviewer | 🧐 Reviewing N lessons for quality...   |
| Quality Gate         | ✅ Running quality checks...            |

#### Content Lifecycle

```
generating  →  pending_approval  →  published
```

Lessons: `draft` → `reviewed` → `published` (tutor approval required)

#### Supported Content Types

- **Course / Syllabus** — full multi-phase course with exercises and resources
- **Roadmap** — milestone-based learning roadmap
- **Learning Guide** — structured guide without phase breakdown
- **Study Schedule** — time-blocked learning plan

---

### 2. RAG Chatbot (Ask Tutor)

A **Retrieval-Augmented Generation** chatbot that answers questions grounded in lesson content or user-uploaded documents.

#### Flow

```
User message
      │
      ▼  POST /api/rag/chat
js_server  →  forwards to py_server  POST /rag/chat
                    │
                    ▼
          Embed query → vector similarity search (ChromaDB)
                    │
          Retrieve top-k relevant chunks
                    │
          Build prompt: [context chunks] + [chat history] + [user message]
                    │
          LLM generates grounded answer
                    │
          Response + source references
                    ▼
          js_server stores ChatSession → returns to frontend
```

#### Features

- Lesson context auto-injected when opened from within `LessonReader` ("💬 Ask Tutor" tab)
- Persistent chat history per session (MongoDB)
- Source document references surfaced alongside answers
- RAG documents can be uploaded via admin or tutor interface

---

### 3. Quiz Engine

AI-generated quizzes based on course content or any custom topic.

#### Flow

```
User triggers quiz (topic / lesson_id)
      │
      ▼  POST /api/quiz/generate
js_server  →  py_server  POST /quiz/generate
                    │
          LLM generates MCQ / True-False / Short Answer set
                    │
          Pydantic validation of question schema
                    │
          Returns JSON question set  →  js_server stores (WizardQuestionSet)
                    │
          Frontend (QuizPage.jsx) renders interactive quiz
                    │
          On submit: grade against answer key
                    │
          Score + per-question feedback → Grade stored in DB
```

#### Features

- Multiple question types: MCQ, true/false, short answer
- Per-question explanations for wrong answers
- Grade stored for performance tracking
- Accessible from lesson Practice tab or standalone `QuizPage`

---

### 4. Content Summarizer

Paste any text, URL, or document and receive a structured AI summary.

#### Flow

```
User inputs content (text / URL)
      │
      ▼  POST /api/summary/generate
js_server  →  py_server  POST /summarize
                    │
          Content extracted (URL scraping if needed)
                    │
          LLM produces structured summary:
            · Key points  · Main concepts  · Takeaways
                    │
          Returns summary → displayed in Summarize.jsx
```

---

### 5. Course Viewer & Lesson Reader

The full interactive learning experience delivered to learners.

#### Component Hierarchy

```
WizardModule.jsx          — Tutor: generate, monitor status, Publish
  └── WizardContentView.jsx    — Routes: course vs. roadmap vs. guide
        └── CourseViewer.jsx         — Full course shell
              │
              ├── Collapsible sidebar (phases → modules → lessons)
              ├── Progress tracking (localStorage per lesson_id)
              ├── Prev / Next lesson navigation
              ├── DraftReviewUI.jsx — Tutor lesson review before publish
              ├── PdfExportModal.jsx — Export lesson as PDF
              └── LessonReader.jsx        — 5-tab lesson experience
                    │
                    ├── 📖 Read      → Lesson sections (explanation, code, analogy…)
                    ├── 🎥 Watch     → YouTube resources per lesson
                    ├── 💻 Code      → CodeSandbox (Python/JS in-browser runner)
                    ├── 🧪 Practice  → Exercises (coding / quiz / reflection)
                    └── 💬 Ask Tutor → RAG chatbot with lesson context injected
```

#### CodeSandbox

| Language   | Runtime                       | Notes                                   |
| ---------- | ----------------------------- | --------------------------------------- |
| Python     | Pyodide (WebAssembly)         | Fully client-side, no server round-trip |
| JavaScript | `eval()` in sandboxed context | Output captured and displayed           |

---

### 6. Subscription & Payments

Manages user subscription tiers and payment transactions.

#### Flow

```
User selects a plan  →  POST /api/subscription/checkout
                              │
                    py_server /subscription/create-session
                              │
                    Payment gateway integration
                              │
                    Webhook confirms payment
                              │
                    js_server updates user subscription tier
                              │
                    Features unlocked based on tier
```

---

### 7. Admin Panel

Full platform management for admins.

#### Capabilities

- **User Management** — view, block/unblock, role assignment
- **LLM Configuration** — set active models, provider order (`LLMConfig` model)
- **Generation Jobs** — monitor `GenerationJob` records, status, errors
- **RAG Documents** — upload/manage knowledge base documents
- **Content Moderation** — review and approve/reject generated courses

---

## Database & Storage Schema

> coming soon...

---

## LLM Provider System

## LLM Provider System

The pipeline configures the LLM provider directly from settings, defaulting to HuggingFace.

> Note: Current flow is to test the current features other modern features will be improved soon.

**Per-task profiles** (tuned independently):

| Task               | Temp | Max Tokens | Purpose              |
| ------------------ | ---- | ---------- | -------------------- |
| `course_architect` | 0.4  | 4096       | Structured blueprint |
| `course_lesson`    | 0.6  | 6144       | Rich lesson prose    |
| `course_reviewer`  | 0.2  | 2048       | Deterministic QA     |
| `course_quality`   | 0.1  | 1024       | Tight validation     |

**Error types:**

- `ProviderUnavailableError` — unreachable (network/connection)
- `ModelError` — reachable but inference failed (OOM, timeout, bad output)

---

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **Python** >= 3.11
- **MySQL** running with `cognitive_wizard` database
- **MongoDB** running (for RAG chat history)
- **Redis** with RedisJSON + RediSearch modules (for LangGraph checkpointing)
- **Tavily API key** for the research agent

### Local Development

```bash
# Terminal 1 — Express API Gateway
cd server/js_server
npm install
npm run dev              # http://localhost:3000

# Terminal 2 — FastAPI AI Backend
cd server/py_server
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 3 — React Frontend
cd client
npm install
npm run dev              # http://localhost:5173
```

---

## Docker Deployment

`Coming soon`

> **Note:** External services (MySQL, MongoDB, Redis) must be running on the host.

---

## API Reference

### Express Gateway (`js_server` — port 3000)

| Method | Endpoint                                    | Description                       |
| ------ | ------------------------------------------- | --------------------------------- |
| POST   | `/api/auth/register`                        | User registration                 |
| POST   | `/api/auth/login`                           | User login (JWT)                  |
| POST   | `/api/wizard/generate`                      | Trigger course/content generation |
| GET    | `/api/wizard/:content_id`                   | Get generated content             |
| GET    | `/api/wizard/:content_id/lesson/:lesson_id` | Fetch a single lesson             |
| POST   | `/api/wizard/:content_id/publish`           | Publish course (tutor)            |
| POST   | `/api/rag/chat`                             | Send RAG chatbot message          |
| POST   | `/api/quiz/generate`                        | Generate quiz for a topic         |
| POST   | `/api/summary/generate`                     | Summarize content                 |
| GET    | `/api/admin/*`                              | Admin routes (role-protected)     |

### FastAPI AI Backend (`py_server` — port 8000)

| Method | Endpoint                            | Description                     |
| ------ | ----------------------------------- | ------------------------------- |
| POST   | `/wizard/generate-agentic`          | Start LangGraph course pipeline |
| POST   | `/internal/wizard-webhook/status`   | Pipeline stage status update    |
| POST   | `/internal/wizard-webhook/complete` | Pipeline completion + DB write  |
| POST   | `/rag/chat`                         | RAG query + answer              |
| POST   | `/quiz/generate`                    | AI quiz generation              |
| POST   | `/summarize`                        | Content summarization           |
| GET    | `/health`                           | Service health check            |

---

## Project Structure

```
CognitiveWizard/
├── client/                    # React frontend (Vite)
│   └── src/
│       ├── pages/             # Route-level page components
│       │   ├── WizardModule.jsx
│       │   ├── WizardContentView.jsx
│       │   ├── QuizPage.jsx
│       │   ├── Summarize.jsx
│       │   ├── ChatbotPage.jsx
│       │   ├── Marketplace.jsx
│       │   └── Profile.jsx
│       └── components/
│           └── wizard/        # Course viewer components
│               ├── CourseViewer.jsx
│               ├── LessonReader.jsx
│               ├── CodeSandbox.jsx
│               ├── DraftReviewUI.jsx
│               └── PdfExportModal.jsx
│
├── server/
│   ├── js_server/             # Express API Gateway
│   │   ├── index.js           # Entry point
│   │   ├── routes/            # auth / user / admin routes
│   │   ├── controllers/       # Business logic
│   │   ├── models/            # Sequelize ORM models
│   │   ├── middlewares/       # Auth, rate limiting, error handling
│   │   └── config/            # DB, Redis, Mongo connections
│   │
│   └── py_server/             # FastAPI AI Engine
│       ├── main.py            # Entry point
│       ├── api/               # Route handlers (wizard, rag, quiz…)
│       ├── agents/
│       │   ├── graphs/        # LangGraph pipeline definitions
│       │   ├── nodes/         # Pipeline stage implementations
│       │   └── states/        # Shared agent state schemas
│       ├── providers/
│       │   └── llm/           # HF providers
│       ├── schemas/           # Pydantic v2 data models
│       ├── services/          # Shared business logic
│       ├── tasks/             # Background task runner
│       ├── utils/             # Prompt builders, helpers
│       └── vectorDB/          # ChromaDB / vector store
│
├── docker-compose.yml         # 3-container deployment
└── Course_Gen_flow.md         # Detailed course generation guide
```

---

## Roadmap (Proposed Features)

- [P] Content

---

- [1] Improve course generation workflow
- [1] enhance other content type generation
- [1] shorter course generation time
- [3] Adaptive learning path based on performance
- [5] Auto scheduling & time blocking with deadline awareness
- [3] Pomodoro / break-aware study scheduling
- [3] Progress tracking & analytics dashboard
- [2] Shareable / sellable course content (Marketplace)
- [3] Weak area detection with personalized recommendations
- [4] Smart reminders & notifications
- [4] Reduced burnout risk (fatigue & exhaustion pattern detection)
- [5] Multi-modal AI system (voice, image input)
- [3] PDF export for offline learning

---

<div align="center">
  <sub>CognitiveWizard © 2026</sub>
</div>
