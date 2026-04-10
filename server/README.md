# Dhaka Emergency Response Backend (FastAPI)

## What This Backend Is For

This backend is built to support emergency response handling for Dhaka 999-related incidents.
It centralizes incident intake, AI triage, responder dispatch, and real-time communication.

## How It Helps

- Prioritizes incidents by severity and dispatch score.
- Notifies nearby available responders in real time.
- Supports AI-assisted triage and Bangla guidance for users.
- Provides a shared incident data pipeline for operations visibility.

Production-oriented backend for an emergency response platform in Dhaka, Bangladesh.

## Tech Stack

- FastAPI
- MongoDB (Motor)
- Native WebSockets
- Google Gemini API (free tier)
- Whisper speech-to-text
- In-memory severity priority queue

## Features Implemented

1. Admin system (CRUD responders)
2. Responder login with dummy OTP + JWT session token
3. Anonymous user sessions
4. SOS incident workflow + dispatcher
5. AI chat triage in Bangla with escalation logic
6. Voice transcription endpoint
7. Real-time responder alerts and incident chat channels
8. Active incident priority queue ordering

## Project Structure

```text
server/
  app/
    api/
      admin.py
      responder.py
      public.py
      ws.py
      deps.py
    core/
      config.py
      security.py
      logging.py
    db/
      mongo.py
      indexes.py
    models/
      auth.py
      common.py
      responder.py
      session.py
      incident.py
      message.py
      ai.py
    repositories/
      responders.py
      sessions.py
      incidents.py
      messages.py
      base.py
    services/
      ai_triage.py
      dispatcher.py
      queue.py
      transcription.py
      websocket_manager.py
    main.py
  requirements.txt
  .env.example
```

## Quick Start

1. Create virtual environment and install dependencies.
2. Copy `.env.example` to `.env`.
3. Add your Mongo URI and Gemini API key in `.env`.
4. Run API.

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Core HTTP Endpoints

### Admin

- `POST /admin/responders`
- `GET /admin/responders`
- `PUT /admin/responders/{id}`
- `DELETE /admin/responders/{id}`

### Responder

- `POST /responder/login`
- `PATCH /responder/availability`
- `GET /responder/me`

### User / Public

- `POST /api/session`
- `POST /api/sos`
- `POST /api/transcribe`
- `GET /api/queue/active`

## WebSocket Channels

- `ws://<host>/ws/chat/{session_id}`
  - user chat with AI triage
  - escalation trigger and incident creation

- `ws://<host>/ws/responder/{responder_id}?token=<jwt>`
  - responder receives incident alerts + mock call events

- `ws://<host>/ws/incident/{incident_id}/{participant}/{participant_id}`
  - chat between user and responders after escalation
  - participant: `user` or `responder`
  - responder must pass `?token=<jwt>`

## AI Output Contract

The AI triage service normalizes every response into:

```json
{
  "type": "crime|medical|fire|mental_health|other",
  "severity": 1,
  "response_bn": "Bangla text",
  "should_escalate": true
}
```

## Escalation Rules

- Severity <= 2: AI guidance only
- Severity == 3: optional escalation if `should_escalate=true`
- Severity >= 4: must escalate and dispatch responders

## Dispatch Scoring

Responder ranking score:

```text
score = (severity * 10) - distance_km
```

Sorting for active incidents queue:

1. Severity descending
2. Timestamp ascending

## Notes

- `ADMIN_API_KEY` is optional. If set, send `X-Admin-Key` header for admin routes.
- Responder login uses `DUMMY_OTP` from `.env`.
- If Gemini key is missing/unavailable, system falls back to deterministic heuristic triage while keeping Bangla response output.
- `faster-whisper` is used by default for speech-to-text and still requires ffmpeg available on host machine.
- You may optionally use `openai-whisper` as a fallback backend if preferred.
