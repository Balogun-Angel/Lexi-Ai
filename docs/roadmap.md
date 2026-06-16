# LexiAI Development Roadmap

A practical, phase-by-phase plan for building the LexiAI MVP: upload a PDF, ask questions, and get streaming, citation-backed answers powered by RAG and pgvector.

**Stack (planned):** React frontend · FastAPI backend · PostgreSQL + pgvector · OpenAI (or compatible) for embeddings and chat.

---

## MVP Scope

| Feature | What it means |
|---------|---------------|
| PDF upload | Users can upload one or more PDF files |
| PDF text extraction | Text is pulled out of each page |
| Semantic chunking | Text is split into meaningful pieces for search |
| Embeddings in pgvector | Each chunk is converted to a vector and stored for similarity search |
| AI chat with RAG | The model answers using retrieved chunks, not just its training data |
| Streaming with SSE | Answers appear word-by-word in the UI |
| Citation-based answers | Each answer points back to the PDF page/chunk it came from |
| User authentication | Each user sees only their own documents |
| Deployed frontend & backend | The app runs on the internet, not just localhost |

---

## How to Use This Roadmap

- Work through phases **in order** — later phases depend on earlier ones.
- Finish each milestone's **"Done when"** checklist before moving on.
- It's okay to keep things simple first (e.g. non-streaming chat before SSE). Add polish in later milestones within the same phase.
- If you get stuck, ship the smallest version that satisfies "Done when" and improve later.

---

## Phase 0 — Foundation

**Goal:** A running dev environment and empty app skeleton you can build on.

### Milestones

| # | Milestone | What you build |
|---|-----------|----------------|
| 0.1 | Dev environment | Docker Compose with PostgreSQL + pgvector extension enabled |
| 0.2 | Backend skeleton | FastAPI app with health check (`GET /health`) and project structure |
| 0.3 | Frontend skeleton | React app that can call the backend health endpoint |
| 0.4 | Shared config | `.env` for API keys and DB URL; document variables in `.env.example` |

**Done when:**
- [ ] `docker compose up` starts the database
- [ ] Backend runs locally and returns `{ "status": "ok" }`
- [ ] Frontend loads in the browser and shows the health check result
- [ ] No secrets committed to git

**Beginner tip:** Get "hello world" working end-to-end before touching PDFs or AI. Most bugs later are easier to debug when you know the basic connection works.

---

## Phase 1 — PDF Upload & Storage

**Goal:** Users can upload a PDF and the backend stores it reliably.

### Milestones

| # | Milestone | What you build |
|---|-----------|----------------|
| 1.1 | Upload API | `POST /documents` accepts a PDF file (multipart form) |
| 1.2 | File storage | Save PDF to disk or object storage; record filename, size, upload time in DB |
| 1.3 | Document list | `GET /documents` returns uploaded documents |
| 1.4 | Upload UI | Frontend page with drag-and-drop or file picker and upload progress |

**Done when:**
- [ ] You can upload a PDF from the browser
- [ ] The file appears in storage and a row exists in the database
- [ ] Refreshing the page still shows the document in a list

**Beginner tip:** Start with a 5–10 page PDF. Test with a scanned image-only PDF later — that needs OCR and is out of scope for the first pass.

---

## Phase 2 — Text Extraction

**Goal:** Turn each uploaded PDF into plain text the system can search.

### Milestones

| # | Milestone | What you build |
|---|-----------|----------------|
| 2.1 | Extraction library | Integrate a PDF library (e.g. PyMuPDF / pdfplumber) |
| 2.2 | Extraction job | After upload, extract text per page; store in DB or JSON |
| 2.3 | Processing status | Document states: `uploaded` → `processing` → `ready` / `failed` |
| 2.4 | Status UI | Show processing spinner or error message on the frontend |

**Done when:**
- [ ] Uploading a PDF triggers extraction automatically
- [ ] You can inspect extracted text in the DB or via a debug endpoint
- [ ] Failed extractions show a clear error instead of hanging forever

**Beginner tip:** Log the first 500 characters of extracted text to verify quality before building chunking.

---

## Phase 3 — Chunking & Embeddings

**Goal:** Split documents into searchable pieces and store vectors in pgvector.

### Milestones

| # | Milestone | What you build |
|---|-----------|----------------|
| 3.1 | Semantic chunking | Split text by paragraphs/sections with overlap; target ~500–1000 tokens per chunk |
| 3.2 | Chunks table | Store chunk text, page number, document ID, and chunk index |
| 3.3 | Embedding generation | Call an embedding API for each chunk |
| 3.4 | pgvector storage | `vector` column + index; similarity search query works |
| 3.5 | Ingestion pipeline | Upload → extract → chunk → embed runs as one background flow |

**Done when:**
- [ ] A processed document has many chunk rows linked to it
- [ ] A test query like "What is the main topic?" returns the top 3–5 relevant chunks
- [ ] Similarity scores look reasonable when you read the matched text

**Beginner tip:** Chunking is iterative. If answers feel wrong later, come back and adjust chunk size and overlap before blaming the LLM.

---

## Phase 4 — RAG Chat (Non-Streaming)

**Goal:** Ask a question and get an answer grounded in the uploaded PDF.

### Milestones

| # | Milestone | What you build |
|---|-----------|----------------|
| 4.1 | Chat API | `POST /chat` with `document_id` + `message` |
| 4.2 | Retrieval step | Embed the user question; fetch top-k chunks from pgvector |
| 4.3 | Prompt assembly | System prompt + retrieved context + user question → LLM |
| 4.4 | Chat UI | Simple chat box scoped to one selected document |
| 4.5 | Conversation history | Optional: store messages per session in DB |

**Done when:**
- [ ] You can ask a question about an uploaded PDF and get a relevant answer
- [ ] Asking something **not** in the PDF produces an honest "I don't know" style response
- [ ] Chat works for at least one full conversation without errors

**Beginner tip:** Build RAG without streaming first. Streaming adds complexity; get correct answers before making them pretty.

---

## Phase 5 — Streaming Responses (SSE)

**Goal:** Answers stream token-by-token in the UI using Server-Sent Events.

### Milestones

| # | Milestone | What you build |
|---|-----------|----------------|
| 5.1 | Streaming endpoint | `POST /chat/stream` returns `text/event-stream` |
| 5.2 | Backend streaming | Stream LLM tokens as SSE events (`data: {...}\n\n`) |
| 5.3 | Frontend consumer | `EventSource` or `fetch` + reader to append tokens live |
| 5.4 | UX polish | Loading state, stop button, handle disconnect/retry |

**Done when:**
- [ ] Answers appear progressively in the chat UI
- [ ] The final streamed answer matches what a non-streaming call would return
- [ ] Network tab shows a long-lived SSE connection during generation

**Beginner tip:** Test streaming with `curl -N` before wiring the frontend. Fix the backend format first.

---

## Phase 6 — Citation-Based Answers

**Goal:** Every answer shows which PDF pages/chunks supported it.

### Milestones

| # | Milestone | What you build |
|---|-----------|----------------|
| 6.1 | Citation metadata | Include chunk IDs, page numbers, and snippet text in the API response |
| 6.2 | Prompt discipline | Instruct the model to reference sources; avoid inventing page numbers |
| 6.3 | Citation UI | Footnotes or clickable badges: "Page 4", "Page 12" |
| 6.4 | Source preview | Clicking a citation shows the original chunk text |

**Done when:**
- [ ] Each answer displays at least one citation when context was used
- [ ] Clicking a citation shows text that actually came from the PDF
- [ ] Answers without supporting chunks say so clearly

**Beginner tip:** Citations are often more trustworthy to users than fluent prose. Prioritize accurate page numbers over fancy formatting.

---

## Phase 7 — User Authentication

**Goal:** Users sign in and only access their own documents.

### Milestones

| # | Milestone | What you build |
|---|-----------|----------------|
| 7.1 | Auth strategy | Choose approach: JWT sessions, or a provider (e.g. Supabase Auth, Auth0) |
| 7.2 | Register & login | Sign-up, login, logout endpoints or integrated auth UI |
| 7.3 | Protected routes | All document and chat APIs require a valid user |
| 7.4 | Data isolation | `user_id` on documents, chunks, and chat sessions; filter every query |
| 7.5 | Auth UI | Login/register pages; redirect unauthenticated users |

**Done when:**
- [ ] User A cannot see or query User B's documents
- [ ] Logging out invalidates access to protected endpoints
- [ ] New uploads are tied to the logged-in user

**Beginner tip:** Add auth **after** RAG works for a single user. Multi-tenancy touches almost every query — easier to add once core features are stable.

---

## Phase 8 — Production Deployment

**Goal:** LexiAI is live on the internet with separate frontend and backend deployments.

### Milestones

| # | Milestone | What you build |
|---|-----------|----------------|
| 8.1 | Production Dockerfiles | Separate images for frontend and backend |
| 8.2 | Production compose / IaC | Database, backend, reverse proxy (e.g. nginx or Caddy) |
| 8.3 | Environment secrets | API keys and DB credentials in host secrets, not in images |
| 8.4 | Frontend deploy | Static build on Vercel, Netlify, or CDN behind your domain |
| 8.5 | Backend deploy | API on Railway, Fly.io, Render, or a VPS |
| 8.6 | HTTPS & CORS | TLS certificates; CORS allows only your frontend origin |
| 8.7 | Smoke test | Upload PDF → ask question → streamed cited answer in production |

**Done when:**
- [ ] App is reachable via a public URL
- [ ] HTTPS works
- [ ] Full MVP flow works in production, not just locally
- [ ] `.env.example` documents every variable needed to deploy

**Beginner tip:** Deploy early with just the health check, then redeploy after each phase. Smaller deploys are easier to debug.

---

## Suggested Timeline (Rough Guide)

| Phase | Focus | Typical effort* |
|-------|--------|-----------------|
| 0 | Foundation | 2–4 days |
| 1 | PDF upload | 2–3 days |
| 2 | Text extraction | 2–3 days |
| 3 | Chunking & embeddings | 4–7 days |
| 4 | RAG chat | 3–5 days |
| 5 | SSE streaming | 2–4 days |
| 6 | Citations | 2–4 days |
| 7 | Authentication | 3–5 days |
| 8 | Deployment | 3–5 days |

\*Assumes part-time learning pace. Adjust freely — consistency matters more than speed.

---

## MVP Definition of Done

LexiAI MVP is complete when a new user can:

1. **Sign up** and log in
2. **Upload** a text-based PDF
3. **Wait** for processing (extract → chunk → embed)
4. **Ask questions** in a chat interface
5. **See answers stream** in real time
6. **Click citations** to verify sources
7. Do all of the above on the **deployed** app

---

## Future Considerations (Post-MVP)

These are intentionally **out of scope** for the first release. Revisit after MVP ships.

- Multiple PDFs in one chat session (cross-document RAG)
- OCR for scanned PDFs
- Document deletion and re-processing
- Admin dashboard and usage analytics
- Rate limiting and cost controls per user
- Alternative LLM / embedding providers
- Conversation export and sharing
- Mobile-responsive polish and accessibility audit

---

## Quick Reference — Build Order

```
Phase 0  Foundation (DB, API, React shell)
   ↓
Phase 1  PDF upload
   ↓
Phase 2  Text extraction
   ↓
Phase 3  Chunking + pgvector embeddings
   ↓
Phase 4  RAG chat (no streaming)
   ↓
Phase 5  SSE streaming
   ↓
Phase 6  Citations
   ↓
Phase 7  User authentication
   ↓
Phase 8  Production deployment
```

Start simple, verify each layer, then add the next. That order keeps debugging manageable and gets you to a working demo as early as Phase 4.
