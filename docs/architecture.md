# LexiAI Architecture

System design for the LexiAI MVP: a full-stack RAG application that lets users upload PDFs, ask questions, and receive streaming, citation-backed answers.

See also: [roadmap.md](./roadmap.md) · [api-spec.md](./api-spec.md) · [database-schema.md](./database-schema.md)

---

## Overview

LexiAI follows a classic three-tier layout:

1. **Frontend** — React SPA for upload, document list, and chat.
2. **Backend** — FastAPI API that handles ingestion, retrieval, and LLM calls.
3. **Data layer** — PostgreSQL with the pgvector extension for embeddings and relational metadata.

External services provide **embedding** and **chat completion** APIs (e.g. OpenAI). The backend orchestrates them; the frontend never holds API keys.

```
┌─────────────┐     HTTPS      ┌─────────────┐     SQL/pgvector   ┌──────────────┐
│   React     │ ◄───────────► │   FastAPI   │ ◄────────────────► │  PostgreSQL  │
│  (browser)  │   REST + SSE  │   backend   │                    │  + pgvector  │
└─────────────┘               └──────┬──────┘                    └──────────────┘
                                     │
                                     │ HTTPS
                                     ▼
                              ┌─────────────┐
                              │  LLM /      │
                              │  Embedding  │
                              │  Provider   │
                              └─────────────┘
```

---

## System Components

### Frontend (`frontend/`)

| Responsibility | Notes |
|----------------|-------|
| Auth UI | Login, register, session handling (Phase 7) |
| Document management | Upload, list, processing status (Phases 1–2) |
| Chat interface | Message history, streaming display (Phases 4–5) |
| Citations | Badges, source preview panel (Phase 6) |

The frontend talks only to the backend API. It stores auth tokens in memory or `httpOnly` cookies depending on the auth approach chosen in Phase 7.

### Backend (`backend/`)

| Module / concern | Responsibility | Roadmap phase |
|------------------|----------------|---------------|
| **API layer** | REST routes, request validation, CORS | 0+ |
| **Auth** | JWT or provider integration, `user_id` on all queries | 7 |
| **Document service** | Upload handling, metadata CRUD | 1 |
| **File storage** | Persist raw PDFs (local disk in dev; S3-compatible in prod) | 1, 8 |
| **Ingestion pipeline** | Extract → chunk → embed (background job) | 2–3 |
| **Retrieval** | Embed query, pgvector similarity search | 3–4 |
| **RAG / chat** | Prompt assembly, LLM calls | 4 |
| **Streaming** | SSE token stream from LLM to client | 5 |
| **Citations** | Attach chunk metadata to responses | 6 |

For the MVP, ingestion can run **in-process** (FastAPI background tasks) or via a simple worker. A dedicated queue (e.g. Celery, Redis) is post-MVP unless upload volume demands it early.

### Database (PostgreSQL + pgvector)

| Stores | Purpose |
|--------|---------|
| Users | Accounts and auth (Phase 7) |
| Documents | PDF metadata, processing status, file path |
| Pages / extracted text | Optional; can live in JSON on `documents` for MVP |
| Chunks | Text segments, page numbers, embedding vectors |
| Chat sessions & messages | Conversation history (Phase 4, optional at first) |

Schema details: [database-schema.md](./database-schema.md).

### File storage

| Environment | Approach |
|-------------|----------|
| Local dev | `storage/uploads/{document_id}.pdf` on disk |
| Production | Object storage (S3, R2, etc.) with signed URLs if needed |

The database stores the **path or object key**, not the file bytes.

### External AI provider

| Call type | When | Typical model class |
|-----------|------|---------------------|
| Embeddings | Ingestion (per chunk) + each user question | `text-embedding-3-small` or equivalent |
| Chat completion | Each chat message (RAG context in prompt) | `gpt-4o-mini` or equivalent |

All provider calls originate from the backend. Rate limits and retries are handled server-side.

---

## Data Flow

### 1. Document ingestion pipeline

Triggered after a successful PDF upload (Phases 1–3).

```
Upload PDF
    │
    ▼
Save file + insert document (status: uploaded)
    │
    ▼
status → processing
    │
    ├── Extract text per page          (Phase 2)
    │
    ├── Split into semantic chunks     (Phase 3)
    │
    ├── Generate embeddings per chunk  (Phase 3)
    │
    └── Insert chunks + vectors into pgvector
    │
    ▼
status → ready  (or failed + error_message)
```

**Failure handling:** Any step failure sets `status = failed` and stores a human-readable `error_message`. The frontend polls or refreshes document status until `ready` or `failed`.

### 2. RAG chat (non-streaming)

Phase 4 baseline before SSE is added.

```
User message + document_id
    │
    ▼
Embed user question
    │
    ▼
pgvector: top-k similar chunks (filtered by document_id, user_id)
    │
    ▼
Build prompt: system + context blocks + question
    │
    ▼
LLM completion → answer + citation metadata (Phase 6)
    │
    ▼
Persist messages (optional) → JSON response
```

**Retrieval defaults (MVP):** `k = 5` chunks, cosine similarity, scoped to the selected document.

### 3. Streaming chat (SSE)

Phase 5 extends the RAG flow.

```
Same retrieval + prompt assembly as above
    │
    ▼
Open streaming LLM connection
    │
    ▼
For each token: emit SSE event { type: "token", content: "..." }
    │
    ▼
On finish: emit SSE event { type: "done", citations: [...] }
```

The client accumulates tokens for display. Citations are sent in the final `done` event (retrieval happens before streaming starts, so sources are known upfront).

### 4. Authentication & isolation

Phase 7 wraps all document and chat flows.

```
Request → validate JWT / session
    │
    ▼
Resolve user_id
    │
    ▼
Every DB query includes WHERE user_id = :current_user
```

No endpoint returns another user's `document_id`, chunks, or chat history.

---

## Technology Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | React + Vite | Fast dev experience, large ecosystem |
| Backend | FastAPI (Python) | Async-friendly, great for SSE and ML libs |
| Database | PostgreSQL 16+ | Reliable, JSON support, pgvector extension |
| Vector search | pgvector | Keeps vectors alongside relational data; no extra DB for MVP |
| PDF parsing | PyMuPDF or pdfplumber | Mature text extraction for digital PDFs |
| Embeddings / LLM | OpenAI API (or compatible) | Simple SDKs; swap provider via env config later |
| Containerization | Docker Compose (dev), Docker (prod) | Consistent Postgres + pgvector locally |
| CI | GitHub Actions | Lint, test, build images (`.github/workflows/`) |

---

## Backend Project Structure (planned)

```
backend/
├── app/
│   ├── main.py              # FastAPI app, CORS, routers
│   ├── config.py            # Settings from environment
│   ├── api/
│   │   ├── health.py
│   │   ├── auth.py          # Phase 7
│   │   ├── documents.py     # Phases 1–2
│   │   └── chat.py          # Phases 4–6
│   ├── services/
│   │   ├── storage.py
│   │   ├── extraction.py
│   │   ├── chunking.py
│   │   ├── embeddings.py
│   │   ├── retrieval.py
│   │   └── rag.py
│   ├── models/              # SQLAlchemy / DB models
│   └── schemas/             # Pydantic request/response types
├── storage/                 # Local PDF uploads (dev)
└── tests/
```

---

## Frontend Project Structure (planned)

```
frontend/
├── src/
│   ├── api/                 # Fetch wrappers for backend
│   ├── components/
│   │   ├── DocumentUpload.tsx
│   │   ├── DocumentList.tsx
│   │   ├── ChatWindow.tsx
│   │   ├── MessageBubble.tsx
│   │   └── CitationBadge.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Documents.tsx
│   │   └── Chat.tsx
│   ├── hooks/
│   │   └── useChatStream.ts # SSE consumer (Phase 5)
│   └── App.tsx
└── public/
```

---

## Deployment Architecture

Phase 8 target layout:

```
                    ┌─────────────────┐
                    │   CDN / Static  │
                    │   (React build) │
                    └────────┬────────┘
                             │ HTTPS
                             ▼
┌──────────┐          ┌─────────────┐          ┌──────────────┐
│  User    │ ───────► │  API host   │ ───────► │  Managed PG  │
│  browser │          │  (FastAPI)  │          │  + pgvector  │
└──────────┘          └──────┬──────┘          └──────────────┘
                             │
                             ▼
                      ┌─────────────┐
                      │  Object     │
                      │  storage    │
                      │  (PDFs)     │
                      └─────────────┘
```

| Concern | MVP approach |
|---------|--------------|
| Frontend | Static build on Vercel, Netlify, or S3 + CloudFront |
| Backend | Container on Railway, Fly.io, Render, or VPS |
| Database | Managed Postgres with pgvector (e.g. Supabase, Neon, RDS) |
| Secrets | Environment variables on host; never in git |
| HTTPS | Platform-managed TLS or reverse proxy (Caddy/nginx) |
| CORS | Allow only production frontend origin |

`docker-compose.yml` at the repo root orchestrates **local** development (database + optional backend). Production compose lives under `docker/` when Phase 8 begins.

---

## Security Model (MVP)

| Topic | Approach |
|-------|----------|
| API keys | Backend only; loaded from env |
| Auth | Bearer JWT or session cookie after Phase 7 |
| Authorization | Row-level isolation by `user_id` |
| File upload | Validate MIME type and size; reject non-PDF |
| Input | Sanitize filenames; limit message length |
| SSE | Same auth as REST; short-lived connections |

Post-MVP: rate limiting per user, virus scanning on uploads, audit logs.

---

## Roadmap Alignment

| Phase | Architecture focus |
|-------|-------------------|
| 0 | Health check, DB connection, React ↔ API wiring |
| 1 | Upload API + file storage + document metadata |
| 2 | Extraction service + `processing` / `ready` / `failed` states |
| 3 | Chunking service, embedding service, pgvector index |
| 4 | Retrieval + RAG prompt + `POST /chat` |
| 5 | Streaming LLM + `POST /chat/stream` (SSE) |
| 6 | Citation objects in chat responses |
| 7 | Auth middleware on all protected routes |
| 8 | Split deploy, object storage, production env |

Build each layer before depending on it. Phase 4 (working RAG without streaming or auth) is the first meaningful end-to-end demo.

---

## Key Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| One document per chat (MVP) | User selects a single PDF per session | Simpler retrieval filter and UX |
| Citations from retrieval, not LLM | Backend attaches chunk metadata | Page numbers stay accurate |
| pgvector over dedicated vector DB | Fewer moving parts for MVP | Good enough at moderate scale |
| Auth late (Phase 7) | Faster iteration on RAG quality | Multi-tenancy touches every query |
| SSE over WebSockets | One-way server → client stream | Simpler for token streaming |

These can be revisited post-MVP as usage and scale grow.
