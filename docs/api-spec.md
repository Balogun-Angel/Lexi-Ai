# LexiAI API Specification

REST + SSE API for the LexiAI MVP. Endpoints are introduced incrementally per [roadmap.md](./roadmap.md).

**Related docs:** [architecture.md](./architecture.md) · [database-schema.md](./database-schema.md)

---

## Base URL

| Environment | URL |
|-------------|-----|
| Local dev | `http://localhost:8000` |
| Production | `https://api.<your-domain>` |

All paths below are relative to the base URL (e.g. `GET /health` → `http://localhost:8000/health`).

**API prefix (optional):** `/api/v1` — use consistently if you version from day one.

---

## Conventions

### Request format

- JSON bodies: `Content-Type: application/json`
- File uploads: `Content-Type: multipart/form-data`
- Timestamps: ISO 8601 UTC (`2026-06-16T12:00:00Z`)
- IDs: UUID strings

### Response envelope

Successful JSON responses return the resource directly (no wrapper) unless noted.

Errors use a consistent shape:

```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Document not found or access denied."
  }
}
```

### HTTP status codes

| Code | Usage |
|------|-------|
| `200` | Success (GET, PATCH) |
| `201` | Created (POST) |
| `204` | Success, no body (DELETE) |
| `400` | Invalid input |
| `401` | Missing or invalid auth |
| `403` | Authenticated but not allowed |
| `404` | Resource not found |
| `409` | Conflict (e.g. document still processing) |
| `413` | File too large |
| `422` | Validation error (Pydantic) |
| `500` | Server error |
| `503` | Dependency unavailable (DB, LLM provider) |

---

## Authentication

**Introduced in Phase 7.** Before auth ships, document and chat endpoints can run open in local dev only.

### Scheme

```
Authorization: Bearer <access_token>
```

### Endpoints

#### `POST /auth/register`

Create a new account.

**Phase:** 7

**Request:**

```json
{
  "email": "user@example.com",
  "password": "secure-password-min-8-chars"
}
```

**Response `201`:**

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com"
  },
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

#### `POST /auth/login`

**Phase:** 7

**Request:**

```json
{
  "email": "user@example.com",
  "password": "secure-password-min-8-chars"
}
```

**Response `200`:** Same shape as register.

#### `POST /auth/logout`

**Phase:** 7

Invalidate refresh token / session if using server-side sessions.

**Response `204`:** No body.

#### `GET /auth/me`

**Phase:** 7

**Response `200`:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com"
}
```

---

## Health

#### `GET /health`

Liveness check. No authentication.

**Phase:** 0

**Response `200`:**

```json
{
  "status": "ok"
}
```

Optional extended check (`GET /health/ready`) can verify DB connectivity in Phase 0.

---

## Documents

All document endpoints require authentication after Phase 7.

### Document object

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "filename": "report.pdf",
  "size_bytes": 1048576,
  "status": "ready",
  "error_message": null,
  "page_count": 12,
  "created_at": "2026-06-16T10:00:00Z",
  "updated_at": "2026-06-16T10:02:30Z"
}
```

**`status` values:**

| Value | Meaning |
|-------|---------|
| `uploaded` | File saved; ingestion not started |
| `processing` | Extracting, chunking, or embedding |
| `ready` | Safe to chat against |
| `failed` | Ingestion failed; see `error_message` |

---

#### `POST /documents`

Upload a PDF. Triggers the ingestion pipeline (Phases 2–3).

**Phase:** 1 (upload); 2–3 (background processing)

**Request:** `multipart/form-data`

| Field | Type | Required |
|-------|------|----------|
| `file` | file (PDF) | yes |

**Constraints (MVP):**

- Max size: 20 MB (configurable)
- Allowed type: `application/pdf`

**Response `201`:** Document object with `status: "uploaded"` or `"processing"`.

---

#### `GET /documents`

List the current user's documents, newest first.

**Phase:** 1

**Query parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | integer | `20` | Page size (max 100) |
| `offset` | integer | `0` | Pagination offset |

**Response `200`:**

```json
{
  "items": [ /* Document objects */ ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

---

#### `GET /documents/{document_id}`

Get one document including current processing status.

**Phase:** 1–2

**Response `200`:** Document object.

**Response `404`:** Unknown ID or not owned by user.

---

#### `DELETE /documents/{document_id}`

Remove document, stored file, chunks, and related chat sessions.

**Phase:** Post-MVP (optional); document in schema for completeness.

**Response `204`:** No body.

---

## Chat

Chat is scoped to a **single document** per request in the MVP.

### Citation object

**Phase:** 6

```json
{
  "chunk_id": "770e8400-e29b-41d4-a716-446655440002",
  "page_number": 4,
  "snippet": "Revenue increased by 12% year over year...",
  "score": 0.87
}
```

### Message object

```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "role": "assistant",
  "content": "According to the report, revenue increased by 12%.",
  "citations": [ /* Citation objects */ ],
  "created_at": "2026-06-16T11:00:00Z"
}
```

---

#### `POST /chat`

Non-streaming RAG chat. Build this before streaming (Phase 4).

**Phase:** 4 (core); 6 (citations); 7 (auth)

**Request:**

```json
{
  "document_id": "660e8400-e29b-41d4-a716-446655440001",
  "message": "What was the revenue growth?",
  "session_id": "990e8400-e29b-41d4-a716-446655440004"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `document_id` | yes | Must be `ready` |
| `message` | yes | User question; max 4000 chars |
| `session_id` | no | Omit to start a new session |

**Response `200`:**

```json
{
  "session_id": "990e8400-e29b-41d4-a716-446655440004",
  "message": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "role": "assistant",
    "content": "Revenue increased by 12% year over year.",
    "citations": [
      {
        "chunk_id": "770e8400-e29b-41d4-a716-446655440002",
        "page_number": 4,
        "snippet": "Revenue increased by 12% year over year...",
        "score": 0.87
      }
    ],
    "created_at": "2026-06-16T11:00:00Z"
  }
}
```

**Response `409`:** Document not `ready` (still processing or failed).

```json
{
  "error": {
    "code": "DOCUMENT_NOT_READY",
    "message": "Document is still processing. Try again shortly."
  }
}
```

---

#### `POST /chat/stream`

Streaming RAG chat via **Server-Sent Events**.

**Phase:** 5 (streaming); 6 (citations in `done` event); 7 (auth)

**Request:** Same JSON body as `POST /chat`.

**Response headers:**

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**SSE event format:**

Each event is a line `data: <json>\n\n`.

| `type` | When | Payload |
|--------|------|---------|
| `session` | First event | `{ "type": "session", "session_id": "..." }` |
| `token` | Per LLM token | `{ "type": "token", "content": "Rev" }` |
| `done` | Stream complete | `{ "type": "done", "message_id": "...", "citations": [...] }` |
| `error` | Failure mid-stream | `{ "type": "error", "code": "...", "message": "..." }` |

**Example stream:**

```
data: {"type":"session","session_id":"990e8400-e29b-41d4-a716-446655440004"}

data: {"type":"token","content":"Revenue"}

data: {"type":"token","content":" increased"}

data: {"type":"done","message_id":"880e8400-e29b-41d4-a716-446655440003","citations":[{"chunk_id":"770e8400-e29b-41d4-a716-446655440002","page_number":4,"snippet":"Revenue increased by 12%...","score":0.87}]}

```

**Client notes:**

- Use `fetch` with a readable stream (POST + SSE) or a library that supports POST-based SSE.
- `EventSource` only supports GET; prefer `fetch` + manual parsing for `POST /chat/stream`.
- Reconnect is not required for MVP; show an error if the connection drops.

**curl test (Phase 5):**

```bash
curl -N -X POST http://localhost:8000/chat/stream \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"document_id":"<uuid>","message":"What is this document about?"}'
```

---

#### `GET /chat/sessions`

List chat sessions for the current user.

**Phase:** 4 (optional)

**Query:** `document_id` (optional filter), `limit`, `offset`

**Response `200`:**

```json
{
  "items": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440004",
      "document_id": "660e8400-e29b-41d4-a716-446655440001",
      "title": "What was the revenue growth?",
      "created_at": "2026-06-16T11:00:00Z",
      "updated_at": "2026-06-16T11:05:00Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

---

#### `GET /chat/sessions/{session_id}/messages`

Retrieve message history for a session.

**Phase:** 4 (optional)

**Response `200`:**

```json
{
  "session_id": "990e8400-e29b-41d4-a716-446655440004",
  "messages": [
    {
      "id": "...",
      "role": "user",
      "content": "What was the revenue growth?",
      "citations": [],
      "created_at": "2026-06-16T11:00:00Z"
    },
    {
      "id": "...",
      "role": "assistant",
      "content": "Revenue increased by 12% year over year.",
      "citations": [ /* Citation objects */ ],
      "created_at": "2026-06-16T11:00:01Z"
    }
  ]
}
```

---

## Debug / Development (optional)

Remove or protect behind admin auth before production.

#### `GET /documents/{document_id}/chunks`

Return chunks for a document (debug retrieval quality).

**Phase:** 3

**Response `200`:**

```json
{
  "document_id": "660e8400-e29b-41d4-a716-446655440001",
  "chunks": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "chunk_index": 0,
      "page_number": 1,
      "text": "Introduction\nThis report covers..."
    }
  ]
}
```

---

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 422 | Request body or query failed validation |
| `UNAUTHORIZED` | 401 | Missing or expired token |
| `FORBIDDEN` | 403 | Valid token, insufficient permission |
| `DOCUMENT_NOT_FOUND` | 404 | Unknown or inaccessible document |
| `DOCUMENT_NOT_READY` | 409 | Chat requested before ingestion completes |
| `FILE_TOO_LARGE` | 413 | Upload exceeds size limit |
| `INVALID_FILE_TYPE` | 400 | Non-PDF upload |
| `LLM_PROVIDER_ERROR` | 503 | Upstream embedding or chat API failed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Endpoint Summary by Roadmap Phase

| Phase | Endpoints to implement |
|-------|------------------------|
| 0 | `GET /health` |
| 1 | `POST /documents`, `GET /documents`, `GET /documents/{id}` |
| 2 | Processing status on document object (no new routes) |
| 3 | `GET /documents/{id}/chunks` (debug, optional) |
| 4 | `POST /chat`, `GET /chat/sessions`, `GET /chat/sessions/{id}/messages` |
| 5 | `POST /chat/stream` |
| 6 | `citations` on chat responses and `done` SSE event |
| 7 | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` + protect all routes |
| 8 | Production base URL, CORS, HTTPS — no new routes required |

---

## CORS (Phase 8)

Backend allows:

```
Access-Control-Allow-Origin: https://app.<your-domain>
Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
```

Local dev typically allows `http://localhost:5173` (Vite default).

---

## Rate Limits (Post-MVP)

Not required for MVP. When added, return:

```
HTTP 429 Too Many Requests
Retry-After: 60
```

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Try again in 60 seconds."
  }
}
```
