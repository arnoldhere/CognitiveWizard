# Chat Session Persistence Setup Summary

## Goal
Add persisted chat session management for the RAG chatbot using:
- **MySQL** for chat session metadata and lifecycle management
- **MongoDB** for message history persistence
- **ChromaDB** for vector embeddings and semantic retrieval
- **Redis** as a recommended session cache for future active chat state and streaming contexts

## New Architecture
- `chat_sessions` stored in MySQL
  - session metadata
  - title, active state, message count
  - last activity timestamp
- `chat_messages` stored in MongoDB
  - user/assistant messages
  - session_id linkage
  - created_at order for replay and memory construction
- `ChromaDB` remains the vector store for RAG embeddings
- `Redis` remains available for active session caching and future real-time context management

## Files Added / Updated
- `server/models/chat_session.py` — new SQLAlchemy model for session metadata
- `server/schemas/chat_schema.py` — new Pydantic schemas for chat session API
- `server/config/mongo.py` — MongoDB client helper
- `server/services/chat_message_store.py` — Mongo message persistence layer
- `server/services/chat_session_service.py` — MySQL session lifecycle service
- `server/services/rag/memory/chat_memory.py` — loads persisted session history into LangChain memory
- `server/services/rag/v1_rag_service.py` — stores chat turns after generation and updates session activity
- `server/api/rag_api.py` — new chat session endpoints plus session-aware chat request routing
- `server/config/settings.py` — MongoDB environment configuration
- `server/requirements.txt` — added `pymongo`

## Environment Variables
Add or update the following in `.env` or your deployment environment:

```bash
MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=cognitive_wizard_chat
```

## MySQL Table Setup
This project already creates tables on startup via SQLAlchemy metadata.
If you prefer explicit Alembic migration, generate one after pulling the new model:

```bash
cd /home/novashell/Arnold/work/apps/CognitiveWizard/server
alembic revision --autogenerate -m "add chat_sessions table"
alembic upgrade head
```

## MongoDB Setup
Run MongoDB locally or use Atlas.
Example local startup:

```bash
mongod --dbpath /data/db --bind_ip localhost
```

The app uses the Mongo collection:
- `chat_messages`

## API Endpoints Added
- `POST /rag/sessions` — create a new chat session
- `GET /rag/sessions` — list active sessions for current user
- `GET /rag/sessions/{session_id}` — fetch single session metadata
- `GET /rag/sessions/{session_id}/history` — fetch persisted message history
- `DELETE /rag/sessions/{session_id}` — soft-delete/archive a session
- `POST /rag/chat` and `POST /rag/chat-langchain` — create or reuse a session automatically and return `session_id`/`session_title`

## Recommended DB Strategy
| Data Type         | Database          | Why                      |
| ----------------- | ----------------- | ------------------------ |
| Chat metadata     | MySQL             | relational + structured  |
| Messages/history  | MongoDB(Atlas)    | flexible + scalable      |
| Vector embeddings | ChromaDB          | semantic retrieval       |
| Session cache     | Redis             | fast active chat context, active sessions, stream response |

## Quick Startup
1. Activate your environment:
   ```bash
   source cogwiz/bin/activate
   ```
2. Install backend dependencies:
   ```bash
   pip install -r server/requirements.txt
   ```
3. Ensure RabbitMQ/Redis/MongoDB are running if required.
4. Start the backend:
   ```bash
   cd server
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
5. Test session endpoints after login.

## Notes
- Session creation uses an auto-generated title from the first prompt if no title is provided.
- Chat history is replayed into the LangChain chat memory on session load.
- This implementation is ready for later work on context window management, long-term semantic memory, and Redis session caching.
