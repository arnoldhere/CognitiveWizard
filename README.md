# CognitiveWizard

CognitiveWizard is an AI-assisted study platform for turning learning material and goals into useful, adaptive study experiences. It combines structured learning tools with conversational retrieval so learners can understand, practise, revise, and plan from anywhere.

## Current product scope

The platform is organised around four core modules:

- **Quiz generation** — creates structured quizzes from a topic or learning material, with validation and grading support.
- **Summarization engine** — accepts documents, URLs, and YouTube links, preprocesses the source, and produces readable study notes.
- **RAG chatbot** — answers questions using user-uploaded material and retrieval pipelines, with chat history and source-aware context.
- **AI Wizard** — generates structured learning plans. Roadmap generation is the current working capability: it accepts planning inputs, retrieves relevant references, and returns a structured roadmap response.

Course/syllabus generation, schedules, and guides are part of the AI Wizard direction but are not yet presented as completed product capabilities. Their planning and preparation automation will be expanded in later iterations.

## Repository layout

```text
client/              React + Vite web application
server/js_server/    Express API gateway, auth, persistence-facing routes
server/py_server/    FastAPI AI service, quiz, summarization, RAG, and wizard logic
docker-compose.yml   Local container orchestration for the three application services
```

## Architecture

```text
Browser
   │
   ▼
React/Vite frontend :80
   │
   ▼
Express API gateway :3000
   │
   ▼
FastAPI AI backend :8000
   ├── Quiz generation and validation
   ├── Summarization and document ingestion
   ├── RAG retrieval, chat memory, and vector storage
   └── AI Wizard roadmap and reference retrieval

External/runtime dependencies:
   MySQL · MongoDB · Redis · LLM/embedding providers · optional search provider
```

The Express gateway is the browser-facing API boundary. It handles authentication, CORS, rate limiting, request logging, domain routes, and proxying to the FastAPI service. The AI backend exposes the task-specific Python APIs and `/health` endpoint.

## Running with Docker Compose

### Prerequisites

- Docker Engine with the Compose plugin
- A configured environment for the gateway and AI backend
- Reachable MySQL, MongoDB, and Redis instances
- Credentials for the selected LLM/embedding provider
- A search provider key such as `TAVILY_API_KEY` when reference retrieval is enabled

The current Compose file does **not** create database containers. The checked-in environment files are used by the services and may point to managed infrastructure. For a new deployment, create local, untracked environment files or provide equivalent deployment secrets; do not commit credentials.

### Build and start

```bash
docker compose build
docker compose up -d
docker compose ps
docker compose down
```

The frontend API URL is baked into the Vite build. Set `VITE_BACKEND_BASE_URL` as a Compose build argument when the browser must reach the gateway at a different public URL, for example:

```bash
VITE_BACKEND_BASE_URL=https://api.example.com docker compose build frontend
```

For production, use a production environment file or your secret manager and review CORS origins, JWT secrets, administrator credentials, provider keys, and database URLs before starting the stack.

## Development without Docker

Install the JavaScript dependencies in `client/` and `server/js_server/`, and install Python dependencies from `server/py_server/requirements.txt`. Then run the services with their respective package/runtime commands:

```bash
# frontend
cd client && npm run dev

# gateway
cd server/js_server && npm start

# AI backend
cd server/py_server && uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The gateway and AI backend require the environment variables used by their configuration modules. The frontend uses `VITE_BACKEND_BASE_URL` to select the gateway URL.


Python tests are located in `server/py_server/tests`. The frontend provides `npm run lint`; the gateway currently has no substantive automated test script.

## Enhancements

- Expand AI Wizard output types from roadmaps into courses, syllabus, schedules, and guides.
- Add deeper plan preparation and automation around generated learning plans.
- Improve adaptive difficulty, revision recommendations, and learner progress feedback.
- Extend quiz formats, explanations, multilingual support, and voice-based study flows.
