# Backend API Contract

**Service:** Backend API (FastAPI)
**Base URL:** `http://127.0.0.1:8000`
**OpenAPI spec (live):** `http://127.0.0.1:8000/openapi.json`
**Version:** `0.1.0`

All request/response examples below are from *real tested calls* against the
running server, not from assumptions. Types shown are the actual JSON shapes.

---

## Auth

- The only auth scheme in the app is `HTTPBearer` (in-memory session token).
- It is issued by **POST /officer/login** and returned as `access_token`.
- **Only two endpoints require the token:**

| Endpoint | Auth required |
| --- | --- |
| `POST /officer/login` | ❌ no |
| `POST /chat` | ❌ no |
| `POST /chat/voice` | ❌ no |
| `GET /prices` | ❌ no |
| `GET /schemes` | ❌ no |
| `POST /presence/start` | ❌ no |
| `GET /presence/status` | ❌ no |
| `POST /presence/stop` | ❌ no |
| `POST /grievance` | ❌ no |
| `GET /grievance/{grievance_id}` | ❌ no |
| `GET /grievance/officer/list` | ✅ Bearer `<access_token>` |
| `PATCH /grievance/{grievance_id}/status` | ✅ Bearer `<access_token>` |

- **Token format:** a short string (in-memory session token from the officer
  account in `.env`).
- Usage:

```bash
TOKEN=$(curl -s -X POST http://127.0.0.1:8000/officer/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"officer","password":"<from .env>"}' \
  | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

curl -s -X GET http://127.0.0.1:8000/grievance/officer/list \
  -H "Authorization: Bearer $TOKEN"
```

- **Credentials (dev only):**
  - `OFFICER_USERNAME=officer`
  - `OFFICER_PASSWORD` — generate a strong one: `python -c "import secrets; print(secrets.token_urlsafe(20))"`

---

## Common response envelopes

- **Success** is always `HTTP 200` (or `201` for create), body is a JSON object.
- **Validation error:** `HTTP 422` → `{"detail": [{"loc": [...], "msg": "...", "type": "...", "input": {...}}]}`
- **Auth failure:** `HTTP 401` (if a bearer token is malformed/missing on a
  protected endpoint).
- **Rate/quota/authority errors:** `HTTP 403` / `429` with a `detail` string (e.g.
  voice-turn limits on `/chat/voice`).
- Fields shown as `null` are **optional** in the real schema (schema marks them
  not-required), even if a response example in the wild shows a value.

---

## Endpoints

### GET / (health)

| Item | Value |
| --- | --- |
| Method | `GET` |
| Path | `/` |
| Auth | none |
| Request body | — |
| Response (200) | `{"status": "running"}` |

---

### POST /chat (answer a farmer's question)

| Item | Value |
| --- | --- |
| Method | `POST` |
| Path | `/chat` |
| Auth | none |
| Content-Type | `application/json` |
| Request body | `ChatRequest` (required) |
| Response (200) | `ChatResponse` |

**`ChatRequest` (request body, required `query`)**

| Field | Type | Required | Note |
| --- | --- | --- | --- |
| `query` | string | ✅ | Farmer's question (Telugu / Hindi / English), min length 1 |
| `session_id` | string\|null | no | Client-generated ID; enables conversation memory (last 3 Q/A) + 24h cache |

**`ChatResponse` (response body)** — example from a real grounded turn:

```json
{
  "answer": "Paddy generally requires about 2,000 to 2,500 liters of water per acre per day during its peak growth stages. Over the entire growing season, a typical paddy crop needs a total of 1,500 to 2,000 millimeters of water, which is usually managed through regular irrigation to keep the field moist.",
  "provider": "groq",
  "sources": [
    {
      "kind": "icar",
      "source": "ICAR\\Telangana Promising.pdf",
      "page": 55,
      "distance": 0.1531849503517151
    },
    {
      "kind": "icar",
      "source": "ICAR\\Telangana Promising.pdf",
      "page": 54,
      "distance": 0.16807430982589722
    },
    {
      "kind": "ppqs",
      "source": "PPQS\\sop_for_safe_and_judicious_use_of_tricyclazole_and_buprofezin_0.pdf",
      "page": 25,
      "distance": 0.17519092559814453
    }
  ],
  "cached": false,
  "sources_count": 3
}
```

| Field | Type | Note |
| --- | --- | --- |
| `answer` | string | The answer text |
| `provider` | string | Answer engine used (e.g. `groq`) |
| `sources` | array of `Source` | RAG provenance; empty array when cache hit or weakly supported |
| `cached` | boolean | `true` when the exact question answered from the 24h cache |
| `sources_count` | integer\|null | Provenance count; `null` when cache hit |

> **Note:** on a cache hit the response is `{"answer": ..., "provider": "cache", "sources": [], "cached": true, "sources_count": null}`.

---

### POST /chat/voice (transcribe + answer from audio)

| Item | Value |
| --- | --- |
| Method | `POST` |
| Path | `/chat/voice` |
| Auth | none |
| Content-Type | `multipart/form-data` |
| Query params | `session_id` (optional, but **recommended** — voice quota and session memory are keyed by it) |
| Request body | `Body_chat_voice_chat_voice_post` (required) |
| Response (200) | `VoiceChatResponse` |

**`Body_chat_voice_chat_voice_post` (request body)**

| Field | Type | Required | Note |
| --- | --- | --- | --- |
| `file` | string (binary, `application/octet-stream`) | ✅ | Recorded audio clip |
| `session_id` | string\|null | no | Reused from `/chat`; optional query-param alternative |
| `description` | string | no | (form field) |

**`VoiceChatResponse` (response body)** — example from a real voice round trip:

```json
{
  "answer": "Hello! I am here to help you with your farming needs. Please tell me what crop you are growing or what specific problem you are facing, and I will provide you with simple, practical advice.",
  "provider": "cache",
  "sources": [],
  "cached": true,
  "transcribed_text": "Hello Please ask your question"
}
```

| Field | Type | Note |
| --- | --- | --- |
| `transcribed_text` | string | Gemini STT output |
| `detected_language` | string | `te` \| `hi` \| `en` from the transcript (mixed Telugu+English reports `te`); `und` only when no transcription engine was available |
| `answer` | string | Same RAG pipeline as `/chat` on the transcript |
| `provider` | string | Answer engine (`groq`, `cache`, etc.) |
| `sources` | array of `Source` | RAG provenance |
| `cached` | boolean | Cache-hit flag |
| `sources_count` | integer\|null | Provenance count |

> Voice-turn limits (configured server-side): clips > 60 s → `413`; session used
> 5 min total → `429` with `retry_after_seconds`; no transcription engine → degraded
> response (`provider: "degraded"`, `detected_language: "und"`) asking to type instead.
>
> Additive since the kiosk stages: every `/chat/voice` response now carries
> `detected_language`, and both AI steps (STT, RAG answer) run on worker threads,
> so `/hardware/status` and `/presence/status` stay responsive during turns.
> No previously documented field changed shape.

---

### GET /prices (market price records)

| Item | Value |
| --- | --- |
| Method | `GET` |
| Path | `/prices` |
| Auth | none |
| Request body | — |
| Response (200) | JSON object (no fixed schema) |

**Example response** (real, from the prices dataset `Market_Wise_Price...pdf`):

```json
{
  "report": {
    "source_file": "prices\\Market_Wise_Price_Arrival_11-10-2026_01-53-54_PM.pdf",
    "unit": "Rs./Quintal (price, MSP); Metric Tonnes (arrival)",
    "dates": ["2026-10-07", "2026-10-08", "2026-10-09"],
    "market_scope": "national aggregate — this report is not broken down by market"
  },
  "count": 69,
  "records": [
    {
      "commodity": "Bajra(Pearl Millet/Cumbu)",
      "group": "Cereals",
      "market": null,
      "msp": 2900.0,
      "date": "2026-10-09",
      "price": 2420.96,
      "arrival": 8819.76
    }
  ]
}
```

| Field | Type | Note |
| --- | --- | --- |
| `report.source_file` | string | Source PDF path |
| `report.unit` | string | Unit strings (Rs./Quintal, MT) |
| `report.dates` | string[] | Date range of the report |
| `report.market_scope` | string | National aggregate |
| `count` | integer | Total records |
| `records` | array | One object per commodity/date, `market: null`, `msp`/`price`/`arrival` numeric |

---

### GET /schemes (scheme summaries)

| Item | Value |
| --- | --- |
| Method | `GET` |
| Path | `/schemes` |
| Auth | none |
| Request body | — |
| Response (200) | JSON object (no fixed schema) |

**Example response** (real):

```json
{
  "schemes": [
    {
      "name": "PM-KISAN",
      "description": "Income support of Rs 6,000 a year in three equal instalments for landholding farmer families, paid directly into their bank account.",
      "source_url": "https://pmkisan.gov.in",
      "chunk_count": 7,
      "source_files": []
    },
    {
      "name": "PMFBY",
      "description": "Pradhan Mantri Fasal Bima Yojana: crop insurance covering prevented sowing, standing-crop, yield and post-harvest losses.",
      "source_url": null,
      "chunk_count": 230,
      "source_files": ["PMFBY\\Hindi.pdf", "PMFBY\\New Schemes-english_.pdf", "PMFBY\\PMFBY_Features.pdf", "PMFBY\\Revamped Operational Guidelines_17th August 2020 (1).pdf"]
    }
  ],
  "total_knowledge_chunks": 3310
}
```

| Field | Type | Note |
| --- | --- | --- |
| `schemes` | array | Scheme objects |
| `schemes[].name` | string | Scheme name |
| `schemes[].description` | string | Summary |
| `schemes[].source_url` | string\|null | Official source (e.g. gov.in) |
| `schemes[].chunk_count` | integer | Knowledge chunks |
| `schemes[].source_files` | string[] | PDF paths in the knowledge DB |
| `total_knowledge_chunks` | integer | Overall KB chunk count |

---

### POST /officer/login (issue the Bearer token)

| Item | Value |
| --- | --- |
| Method | `POST` |
| Path | `/officer/login` |
| Auth | none |
| Content-Type | `application/json` |
| Request body | `OfficerLogin` (required) |
| Response (200) | `OfficerLoginResponse` |

**`OfficerLogin` (request body)**

| Field | Type | Required |
| --- | --- | --- |
| `username` | string | ✅ |
| `password` | string | ✅ |

**`OfficerLoginResponse` (response body)**

```json
{
  "access_token": "<string>",
  "token_type": "bearer",
  "expires_at": "2026-10-20T12:00:00"
}
```

| Field | Type | Note |
| --- | --- | --- |
| `access_token` | string | The Bearer token to send in `Authorization: Bearer <token>` |
| `token_type` | string | always `bearer` |
| `expires_at` | string | ISO-8601 expiry (in-memory session) |

> Credentials: `OFFICER_USERNAME=officer`; password from `.env` (default in
> `.env.example` is `change_me_to_a_long_random_password`).

---

### POST /grievance (file a new grievance)

| Item | Value |
| --- | --- |
| Method | `POST` |
| Path | `/grievance` |
| Auth | none |
| Content-Type | `application/json` |
| Request body | `GrievanceCreate` (required) |
| Response (201) | `GrievanceCreated` |

**`GrievanceCreate` (request body)**

| Field | Type | Required | Note |
| --- | --- | --- | --- |
| `problem` | string | ✅ | What went wrong |
| `name` | string\|null | no | Farmer's name |
| `village` | string\|null | no | Village / block |
| `phone` | string\|null | no | Contact number |

**`GrievanceCreated` (response body) — real:**

```json
{
  "grievance_id": "<uuid>",
  "status": "new"
}
```

| Field | Type | Note |
| --- | --- | --- |
| `grievance_id` | string | Assigned ID |
| `status` | string | Always `new` on creation |

> Validation error (`422`) if `problem` is missing: `{"detail": [{"loc": ["body", "problem"], "msg": "Field required", ...}]}`.

---

### GET /grievance/{grievance_id} (one grievance)

| Item | Value |
| --- | --- |
| Method | `GET` |
| Path | `/grievance/{grievance_id}` |
| Auth | none |
| Path params | `grievance_id` (string, required) |
| Response (200) | `GrievanceOut` |

**`GrievanceOut` (response body) — real:**

```json
{
  "grievance_id": "<uuid>",
  "name": "Rajesh Kumar",
  "village": "Dharmavaram",
  "phone": "9876543210",
  "problem": "Crop yellowing after pesticide spray.",
  "status": "new",
  "created_at": "2026-10-12T10:00:00",
  "updated_at": "2026-10-12T10:00:00"
}
```

| Field | Type | Note |
| --- | --- | --- |
| `grievance_id` | string | ID |
| `name` / `village` / `phone` | string\|null | Farmer contact |
| `problem` | string | The issue |
| `status` | string | `new` \| `seen` \| `in_progress` \| `resolved` |
| `created_at` / `updated_at` | string | ISO-8601 timestamps |

---

### GET /grievance/officer/list (all grievances — **Bearer required**)

| Item | Value |
| --- | --- |
| Method | `GET` |
| Path | `/grievance/officer/list` |
| Auth | ✅ `Authorization: Bearer <token>` |
| Request body | none |
| Response (200) | JSON object (no fixed schema) |

```json
[
  {
    "grievance_id": "<uuid>",
    "name": "Rajesh Kumar",
    "village": "Dharmavaram",
    "phone": "9876543210",
    "problem": "Crop yellowing after pesticide spray.",
    "status": "new",
    "created_at": "2026-10-12T10:00:00",
    "updated_at": "2026-10-12T10:00:00"
  }
]
```

---

### PATCH /grievance/{grievance_id}/status (update status — **Bearer required**)

| Item | Value |
| --- | --- |
| Method | `PATCH` |
| Path | `/grievance/{grievance_id}/status` |
| Auth | ✅ `Authorization: Bearer <token>` |
| Path params | `grievance_id` (string, required) |
| Request body | `GrievanceStatusUpdate` (required) |
| Response (200) | `GrievanceOut` |

**`GrievanceStatusUpdate` (request body)** — `status` enum: `new`, `seen`, `in_progress`, `resolved`.

```json
{ "status": "in_progress" }
```

---

### POST /presence/start (start the presence watchdog)

| Item | Value |
| --- | --- |
| Method | `POST` |
| Path | `/presence/start` |
| Auth | none |
| Query params | `camera_index` (integer, optional, default `0`) |
| Request body | none |
| Response (200) | JSON object (no fixed schema) |

Example:

```json
{
  "status": "running",
  "camera_index": 0,
  "thread": 24176,
  "initial": {
    "faces": 0,
    "streak": 0,
    "present": false,
    "fired": false,
    "reasons": [],
    "cooldown_left": 0.0
  }
}
```

> If a watcher is already running, returns `{"status": "already_running", ...}` (no-op).
> If the camera cannot be opened, returns `{"status": "stopped", ...}` (no error).

**Behavior notes:**
- Seeds a **daemon background thread**; the call returns immediately and does not
  block the event loop.
- The watcher is **edge-triggered**: a person is only confirmed after
  `MIN_STABILITY_FRAMES` (5) consecutive face-detected frames; re-triggers are
  gated by `COOLDOWN_SECONDS` (8).
- Polls every `POLL_SECONDS` (0.1 s, ~10 fps).

---

### GET /presence/status (watchdog state)

| Item | Value |
| --- | --- |
| Method | `GET` |
| Path | `/presence/status` |
| Auth | none |
| Request body | none |
| Response (200) | JSON object (no fixed schema) |

Example (watcher running):

```json
{
  "status": "running",
  "faces": 1,
  "streak": 322,
  "present": true,
  "fired": false,
  "reasons": [],
  "cooldown_left": 0.0,
  "camera_index": 0
}
```

Example (nothing running):

```json
{
  "status": "stopped",
  "message": "no watcher running; POST /presence/start first"
}
```

| Field | Type | Note |
| --- | --- | --- |
| `status` | string | `running` \| `stopped` |
| `faces` | integer | Faces detected in the current frame |
| `streak` | integer | Consecutive face-detected frames |
| `present` | boolean | Sustained face present |
| `fired` | boolean | `true` on the trigger frame (person first detected) |
| `cooldown_left` | number | Seconds until next allowed trigger |

---

### POST /presence/stop (stop the watchdog)

| Item | Value |
| --- | --- |
| Method | `POST` |
| Path | `/presence/stop` |
| Auth | none |
| Request body | none |
| Response (200) | JSON object (no fixed schema) |

Example:

```json
{
  "status": "stopped",
  "last": {
    "faces": 1,
    "streak": 323,
    "present": true,
    "fired": false,
    "reasons": [],
    "cooldown_left": 0.0
  }
}
```

---

### POST /hardware/trigger (drive the kiosk manually)

| Item | Value |
| --- | --- |
| Method | `POST` |
| Path | `/hardware/trigger` |
| Auth | none |
| Query params | `force` (boolean, optional, default `false`) |
| Request body | none |
| Response (200) | JSON object (no fixed schema) |

The manual stand-in for the (optional) ultrasonic sensor: arms the trigger that
the kiosk's IDLE state waits for. Normal flow: CHECKING (presence confirmed
within 5 `/presence/status` frames) → GREETING (multilingual welcome, up to
`WELCOME_RETRIES` repeats) → LISTENING (`POST /chat/voice` with a per-session
id) → RESPONDING loops → END → IDLE. `force=true` skips CHECKING's human
confirmation (testing without anyone in frame).

```json
{
  "status": "armed",
  "cooldown_seconds": 10.0,
  "force": false,
  "state": "IDLE",
  "gpio_available": false,
  "camera_on": false,
  "session_state": "inactive",
  "cooldown_left": 0.0
}
```

>`status: "busy"` while a session is running (return body shows live state).
>`gpio_available: false` on laptops (no RPi.GPIO) — sensor trigger disabled, the
>state machine still works through this endpoint.

---

### GET /hardware/status (kiosk state)

| Item | Value |
| --- | --- |
| Method | `GET` |
| Path | `/hardware/status` |
| Auth | none |
| Response (200) | JSON object (no fixed schema) |

```json
{
  "status": "ok",
  "state": "LISTENING",
  "gpio_available": false,
  "trig_pin": null,
  "echo_pin": null,
  "camera_on": true,
  "session_state": "LISTENING",
  "session_start": "2026-10-14T06:20:01.123456+00:00",
  "remaining_seconds": 540,
  "session_timeout_minutes": 10.0,
  "grace_period_seconds": 120.0,
  "absence_grace_seconds": 60.0,
  "detected_language": "en",
  "no_response_count": 0,
  "silent_turns": 0,
  "welcome_retries": 0,
  "turns_answered": 2,
  "listen_cap_seconds": 20.0,
  "cooldown_left": 0.0,
  "last_reason": "turn 3 (no-response 0/3)",
  "last_error": null,
  "transitions": 9
}
```

| Field | Type | Note |
| --- | --- | --- |
| `state` | string | FSM state `IDLE\|CHECKING\|GREETING\|LISTENING\|RESPONDING\|END` |
| `session_state` | string | Same as `state` while a session runs; `inactive` when none |
| `session_start` | string\|null | ISO-8601 UTC start of the current session |
| `remaining_seconds` | integer\|null | Countdown to `SESSION_TIMEOUT_MINUTES` |
| `detected_language` | string\|null | Locked session language (`te`\|`hi`\|`en`) |
| `cooldown_left` | number | Seconds left of the post-session cooldown |
| `turns_answered` | integer | Answers spoken this process lifetime |

> The whole timeout/grace/absence env matrix is documented in `.env.example`;
> all of it is kiosk-internal behavior, no extra endpoints. Log lines print as
> `[hardware] ...` so they can be filtered out of server logs.

---

## Error envelope

| Status | Meaning | Body shape |
| --- | --- | --- |
| 422 | Validation error (missing/invalid fields) | `{"detail": [{"loc": [...], "msg": "...", "type": "...", "input": {...}, "ctx": {...}}]}` |
| 401 | Unauthorized (Bearer token missing/malformed on a protected endpoint) | `{"detail": "Not authenticated"}` |
| 403 | Forbidden (officer action on a non-officer resource) | `{"detail": "Forbidden"}` |
| 429 | Voice usage quota exceeded | `{"detail": "...", "retry_after_seconds": <seconds>}` |
| 502 | Upstream AI/transcription failure | `{"detail": "<message>"}` |

---

## Conventions for the frontend

1. **Always send `session_id`** with `/chat` and `/chat/voice`. It enables the
   3-turn conversation memory and the 24h answer cache. For `/chat/voice`, it may
   be sent as a query parameter **or** a `session_id` form field.
2. **Send audio as `multipart/form-data`** with a field named `file`.
3. **Keep the token for `/grievance/*` PUT** — the officer-dashboard endpoints
   only.
4. `sources` and `sources_count` are internal/debug-only flags; the answer text is
   the only user-facing RAG output.
5. `cached: true` means the answer came from the 24h cache without a retrieval or
   AI call — treat `sources` as empty in that case.
