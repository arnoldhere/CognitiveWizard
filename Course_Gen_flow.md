# Course Generation — Architecture, Flow & Guide

## Overview

CognitiveWizard's course generation feature is a **multi-agent AI pipeline** that transforms a simple topic into a complete, structured, learner-ready course — with full lesson content (explanations, analogies, code examples, exercises, and resources). It is built on **LangGraph** running in the Python server, with the Express (JS) server handling persistence and the React frontend delivering the interactive learning experience.

---

## High-Level Architecture

```
User (Browser)
      │  POST /api/wizard/generate  (topic, skill level, goal, etc.)
      ▼
js_server  (Express)
      │  Creates WizardContent row (status: "generating")
      │  Calls py_server /wizard/generate-agentic
      ▼
py_server  (FastAPI + LangGraph)
      │  Returns immediately (202-style acknowledgement)
      │  Starts 5-stage pipeline as a background task
      │
      ├─── Stage 1: Learning Architect
      ├─── Stage 2: Research Agent
      ├─── Stage 3: Lesson Generator   ←─┐
      ├─── Stage 4: Pedagogical Reviewer ─┘ (retry loop, max 2x)
      └─── Stage 5: Quality Gate
                    │
                    │  POST /internal/wizard-webhook/complete
                    ▼
           js_server persists to MySQL
           (6 tables: CoursePhase, CourseModule, CourseLesson,
                      LessonSection, LessonResource, LessonExercise)
                    │
                    ▼
         Frontend polls for completion
         Opens CourseViewer ← LessonReader ← CodeSandbox
```

---

## 5-Stage Pipeline (LangGraph Graph)

```
  [architect]
       │
  [research]
       │
  [lesson_generator] ◄──────────────────────────────┐
       │                                              │
  [reviewer]                                          │
       │                                              │
       ├── any FAIL + retry_count < 2 ────────────────┘  (re-generates failed lessons only)
       │
       └── all PASS  or  retry_count == 2
                    │
              [quality_gate]
                    │
                   END
```

### Stage 1 — Learning Architect (`learning_architect_node.py`)

**Goal:** Generate the course *structure only* — no prose, no content.

- Input: topic, content_type, details, skill_level, goal, learning_style, user_role
- LLM task: `COURSE_ARCHITECT` (temperature 0.4, max_tokens 4096)
- Output: `CourseBlueprintSchema` — phases → modules → lesson titles + learning objectives + estimated times
- Sends status webhook: `🏗️ Designing your course structure...`
- Fast + cheap pass before any expensive content generation

### Stage 2 — Research Agent (`research_agent_node.py`)

**Goal:** Fetch curated web evidence for every lesson.

- Uses **Tavily** search API to gather URLs, articles, and YouTube links per lesson
- Runs in parallel batches of 5 lessons
- Output: `lesson_evidence` dict — keyed by lesson title → list of resource items
- Sends status webhook: `🔍 Researching sources for N lessons...`
- No LLM call — pure search tool usage

### Stage 3 — Lesson Generator (`lesson_generator_node.py`)

**Goal:** Generate complete, deep lesson content for every lesson.

- Processes lessons in concurrent batches of 3
- Each lesson gets: explanation, analogy, code examples, common mistakes, summary, exercises
- Injects research evidence from Stage 2 as lesson resources (more reliable than asking LLM)
- Validates each lesson against `CourseLessonSchema` (Pydantic v2)
- Soft-fails per lesson: a bad lesson produces a placeholder, pipeline continues
- LLM task: `COURSE_LESSON` (temperature 0.6, max_tokens 6144)
- Sends status webhook: `✍️ Writing content for N lessons...`

### Stage 4 — Pedagogical Reviewer (`pedagogical_reviewer_node.py`)

**Goal:** QA every lesson against a structured educational checklist.

- Reviews in parallel batches of 5
- Checks: objective coverage, explanation completeness, example correctness, difficulty alignment, Bloom's taxonomy levels, no hallucinated facts
- Issues PASS or FAIL per lesson with specific improvement suggestions
- If any FAIL + `retry_count < 2` → routes back to Stage 3 (only re-generates failed lessons)
- After 2 retries → proceeds regardless
- Reviewer failure itself is non-blocking (defaults to PASS to keep pipeline moving)
- LLM task: `COURSE_REVIEWER` (temperature 0.2, max_tokens 2048)
- Sends status webhook: `🧐 Reviewing N lessons for quality...`

### Stage 5 — Quality Gate (`quality_gate_node.py`)

**Goal:** Final validation, assembly, and DB persistence trigger.

- Validates all lessons: required fields, min word count, non-empty sections, citation presence
- Issues warnings (not hard blocks) for minor issues
- Hard blocks only if 0 valid lessons exist
- Assembles the final `CoursePackageSchema`
- POSTs the complete course to js_server webhook → triggers SQL transaction
- Sends status webhook: `✅ Running quality checks...`
- No LLM call — pure validation and assembly logic

---

## LLM Provider System

The pipeline uses a **provider-agnostic LLMRouter** that tries providers in priority order with health-check-based fallback.

```
LLMRouter
    │
    ├── OllamaProvider  (local, preferred — llama3.1:8b)
    │        └── health check: GET http://localhost:11434/api/tags (2s timeout)
    │
    └── HuggingFaceProvider  (remote, fallback)
             └── HF Inference API / Novita

Future slots: OpenAIProvider, AnthropicProvider (add to COURSE_PROVIDER_ORDER env var)
```

**Fallback logic:**
```
try Ollama  →  healthy?  →  use Ollama
                 NO
try HuggingFace  →  healthy?  →  use HF
                      NO
raise AllProvidersFailedError  →  pipeline sets status=error
```

**Task profiles** (temperature / max_tokens) are tuned per stage:
| Task | Temperature | Max Tokens | Purpose |
|---|---|---|---|
| `course_architect` | 0.4 | 4096 | Structured blueprint |
| `course_lesson` | 0.6 | 6144 | Rich lesson prose |
| `course_reviewer` | 0.2 | 2048 | Deterministic QA |
| `course_quality` | 0.1 | 1024 | Tight validation |

**Error types** (distinct for clean handling):
- `ProviderUnavailableError` — provider unreachable (connection refused, network down)
- `ModelError` — provider reachable but inference failed (OOM, timeout, bad output)
- `AllProvidersFailedError` — all configured providers exhausted

---

## Database Schema

Seven MySQL tables (auto-synced via Sequelize `alter: true`).

```
wizard_contents          ← root row per generated item (any type)
    │
    ├── course_phases    ← Phase 1: Foundations, Phase 2: Advanced, etc.
    │       │
    │       └── course_modules    ← Module: "What is AI?", "Linear Algebra", etc.
    │               │
    │               └── course_lessons    ← Each lesson (draft → reviewed → published)
    │                       │
    │                       ├── lesson_sections   ← Typed content blocks
    │                       │   (section_type: explanation | code_example | analogy |
    │                       │                  common_mistakes | summary | key_points)
    │                       │
    │                       ├── lesson_resources  ← YouTube, article, docs per lesson
    │                       │
    │                       └── lesson_exercises  ← Coding / quiz / reflection exercises
    │
    └── (wizard_modules, wizard_resources — unchanged, used by roadmap/guide/schedule)
```

**Lesson lifecycle status:**
- `draft` — generated by lesson_generator_node
- `reviewed` — passed pedagogical_reviewer_node
- `published` — tutor/admin approved and published to learners

**WizardContent status flow:**
```
generating → pending_approval → published
```

---

## Real-Time Status Updates (Webhook Flow)

Each pipeline stage sends a fire-and-forget HTTP POST to the JS server during execution. The frontend polls every 4 seconds to display these live.

```
py_server node                     js_server webhook              Frontend
─────────────────────────────────────────────────────────────────────────
architect_node          → POST /internal/wizard-webhook/status    🏗️ Designing...
research_agent_node     → POST /internal/wizard-webhook/status    🔍 Researching...
lesson_generator_node   → POST /internal/wizard-webhook/status    ✍️ Writing...
pedagogical_reviewer    → POST /internal/wizard-webhook/status    🧐 Reviewing...
quality_gate_node       → POST /internal/wizard-webhook/status    ✅ Quality check...
quality_gate_node       → POST /internal/wizard-webhook/complete  → DB write → done
```

The frontend shows a **5-step progress bar** in `WizardModule.jsx` with live label updates from these webhooks.

---

## Frontend Components

```
WizardModule.jsx          ← Tutor dashboard: generate, status polling, Publish
    └── WizardContentView.jsx   ← Dispatches to CourseViewer or roadmap view
            └── CourseViewer.jsx         ← Full course experience
                    │
                    ├── Collapsible sidebar (phases → modules → lessons)
                    ├── Progress tracking (localStorage, per lesson_id)
                    ├── Prev/Next lesson navigation
                    │
                    └── LessonReader.jsx   ← 5-tab lesson viewer
                            │
                            ├── 📖 Read      → Lesson sections (explanation, code, etc.)
                            ├── 🎥 Watch     → YouTube resources
                            ├── 💻 Code      → Interactive code editor + runner
                            ├── 🧪 Practice  → Exercises (coding/quiz/reflection)
                            └── 💬 Ask Tutor → RAG chatbot with lesson context injected

CodeSandbox.jsx
    ├── Python execution via Pyodide (WebAssembly, no server round-trip)
    └── JavaScript execution via eval() in sandboxed context
```

---

## Key Files Reference

### py_server (FastAPI / LangGraph)

| File | Role |
|---|---|
| `api/wizard_api.py` | `POST /wizard/generate-agentic` endpoint |
| `agents/graphs/course_generation_graph.py` | LangGraph pipeline definition |
| `agents/states/course_agent_state.py` | Shared state schema |
| `agents/nodes/learning_architect_node.py` | Stage 1 |
| `agents/nodes/research_agent_node.py` | Stage 2 |
| `agents/nodes/lesson_generator_node.py` | Stage 3 |
| `agents/nodes/pedagogical_reviewer_node.py` | Stage 4 |
| `agents/nodes/quality_gate_node.py` | Stage 5 |
| `providers/llm/router.py` | LLMRouter — provider selection + fallback |
| `providers/llm/ollama_provider.py` | Ollama local provider |
| `providers/llm/provider_errors.py` | Error type hierarchy |
| `providers/llm/tasks.py` | TaskType enum (incl. COURSE_* variants) |
| `providers/llm/llm_task_profiles.py` | Per-task temperature/token params |
| `providers/llm/factory.py` | `get_llm_for_course_task()` bridge |
| `schemas/course_generation.py` | All Pydantic v2 schemas |
| `utils/builders/wizard_prompt.py` | Prompt builders for architect + lesson |

### js_server (Express / Sequelize)

| File | Role |
|---|---|
| `controllers/wizardController.js` | Webhook handlers + getCourseLesson |
| `routes/user/wizardRoutes.js` | `GET /:content_id/lesson/:lesson_id` |
| `models/WizardContent.js` | Root content row |
| `models/CoursePhase.js` | Phase model |
| `models/CourseModule.js` | Module model |
| `models/CourseLesson.js` | Lesson model |
| `models/LessonSection.js` | Section content blocks |
| `models/LessonResource.js` | Per-lesson resources |
| `models/LessonExercise.js` | Exercises |

### client (React)

| File | Role |
|---|---|
| `pages/WizardModule.jsx` | Generation trigger + status UI |
| `pages/WizardContentView.jsx` | Course vs. roadmap routing |
| `components/wizard/CourseViewer.jsx` | Course navigation shell |
| `components/wizard/LessonReader.jsx` | 5-tab lesson reader |
| `components/wizard/CodeSandbox.jsx` | In-browser Python/JS executor |
| `services/api.js` | `getWizardCourseLesson()` |

---

## How to Run Course Generation

### Prerequisites

1. **MySQL** running with `cognitive_wizard` database
2. **Redis** running (for session/cache)
3. **Ollama** running locally with `llama3.1:8b`:
   ```bash
   ollama serve          # start the Ollama server
   ollama pull llama3.1:8b   # if not already pulled
   ```
4. **Tavily API key** set in `server/.env`

### Start the Servers

```bash
# Terminal 1 — JS server (Express + Sequelize)
cd apps/CognitiveWizard/server/js_server
npm run dev

# Terminal 2 — Python server (FastAPI + LangGraph)
cd apps/CognitiveWizard/server/py_server
uvicorn main:app --reload --port 8000
# OR
python3 main.py

# Terminal 3 — React frontend
cd apps/CognitiveWizard/client
npm run dev
```

### Environment Variables (`server/.env`)

```env
# LLM Provider — Ollama (local, preferred)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_ENABLED=true

# Provider order for course generation
# First healthy wins: try Ollama first, fall back to HuggingFace
COURSE_PROVIDER_ORDER=ollama,huggingface

# HuggingFace (fallback)
HF_API_KEY=hf_...
HF_DEF_MODEL=meta-llama/Llama-3.1-8B-Instruct

# Research (Tavily)
TAVILY_API_KEY=tvly-...
```

### Generate a Course (UI Flow)

1. Log in → navigate to **Wizard**
2. Select content type: **Course / Syllabus**
3. Enter topic (e.g. `Python Crash Course`), skill level, goal, learning style
4. Click **Generate**
5. Watch the 5-step progress bar update live:
   - `🏗️ Designing your course structure...`
   - `🔍 Researching sources for N lessons...`
   - `✍️ Writing content for N lessons...`
   - `🧐 Reviewing N lessons for quality...`
   - `✅ Running quality checks...`
6. When done → click **Preview Course** → opens `CourseViewer`
7. Navigate phases → modules → lessons in the sidebar
8. Open a lesson → use tabs to Read / Watch / Code / Practice / Ask Tutor
9. As tutor: click **Publish Course** to mark all lessons as `published`

### Generate via API (Direct)

```bash
# Trigger course generation
curl -X POST http://localhost:8000/wizard/generate-agentic \
  -H "Content-Type: application/json" \
  -d '{
    "content_id": 42,
    "topic": "Python Crash Course",
    "content_type": "Course/Syllabus",
    "skill_level": "beginner",
    "goal": "Build Python fundamentals from scratch",
    "learning_style": "hands-on",
    "user_role": "user"
  }'
# Returns immediately: {"content": {"status": "generating"}}

# Fetch a specific lesson (after generation completes)
curl http://localhost:3000/api/wizard/42/lesson/7 \
  -H "Authorization: Bearer <token>"
```

---

## Configuration Tips

| Setting | Effect |
|---|---|
| `OLLAMA_ENABLED=false` | Skips Ollama, goes straight to HuggingFace |
| `COURSE_PROVIDER_ORDER=huggingface,ollama` | Prefer HF, use Ollama as fallback |
| `OLLAMA_MODEL=llama3.2:3b` | Switch to a lighter/faster local model |
| `COURSE_PROVIDER_ORDER=openai,ollama` | Use OpenAI when added as a provider |

### Scaling the Pipeline

- **Batch sizes**: Adjust `_LESSON_BATCH_SIZE = 3` in `lesson_generator_node.py` and `_REVIEW_BATCH_SIZE = 5` in `pedagogical_reviewer_node.py`
- **Retry cap**: Change `_MAX_RETRY_COUNT = 2` in the graph or reviewer node
- **Token budget**: Per-task profiles in `llm_task_profiles.py` — increase `max_new_tokens` for richer content

---

## What is NOT Affected

The course generation pipeline is **isolated** from all other Wizard content types. The following features use the original `get_llm_for_task()` path (HuggingFace only, no router) and are completely unaffected:

- Roadmap generation
- Learning Guide generation
- Study Schedule generation
- RAG chatbot (Ask Tutor)
- Quiz generation
- Summarization
