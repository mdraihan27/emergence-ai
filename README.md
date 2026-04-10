# Emergency Response System

## What This App Is For

This system is designed to support emergency response operations around Dhaka 999 calls.
It provides a digital workflow for reporting incidents, triaging urgency, and notifying the nearest available responders quickly.

## How It Helps

- Gives citizens a fast SOS and AI help channel from mobile web.
- Helps responders receive real-time alerts with location and severity context.
- Reduces manual coordination delay with automated dispatch ranking.
- Improves situational awareness through live incident chat and status updates.

Full-stack emergency response platform with:

- FastAPI backend in `server/`
- User PWA (Next.js) in `clients/user-app/`
- Responder PWA (Next.js) in `clients/responder-app/`
- Shared UI package in `clients/shared-ui/`

## Project Structure

```text
emergence-ai-2/
  server/
  clients/
    user-app/
    responder-app/
    shared-ui/
```

## Prerequisites

- Python 3.11+ (3.14 tested in this workspace)
- Node.js 18+
- npm 9+
- MongoDB running locally or remotely
- ffmpeg installed (required for speech-to-text)

## 1. Backend Setup (FastAPI)

From repository root:

```powershell
cd server
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create env file:

```powershell
copy .env.example .env
```

Set required values in `server/.env`:

- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `JWT_SECRET_KEY`
- `GEMINI_API_KEY` (optional but recommended)

Run backend:

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend URLs:

- API: `http://localhost:8000`
- Docs: `http://localhost:8000/docs`

## 2. Frontend Setup (Two PWAs)

Open a new terminal from repository root:

```powershell
cd clients
npm run install:user
npm run install:responder
```

Create app env files:

```powershell
copy user-app\.env.example user-app\.env.local
copy responder-app\.env.example responder-app\.env.local
```

Check these values in both env files:

- `NEXT_PUBLIC_BACKEND_HTTP=http://localhost:8000`
- `NEXT_PUBLIC_BACKEND_WS=ws://localhost:8000`

## 3. Run Both PWAs

Use two terminals from `clients/`:

Terminal A (User PWA):

```powershell
npm run dev:user
```

Terminal B (Responder PWA):

```powershell
npm run dev:responder
```

Frontend URLs:

- User app: `http://localhost:3000`
- Responder app: `http://localhost:3001`

## 4. First Functional Test

1. Start MongoDB.
2. Start backend.
3. Start user and responder PWAs.
4. Create at least one responder using backend admin endpoint.
5. Login in responder app with:
   - Responder ID: created responder `id`
   - OTP: value of `DUMMY_OTP` in `server/.env` (default `123456`)
6. Send SOS from user app and verify responder receives alert.

## 5. Useful Commands

From `clients/`:

```powershell
npm run build:user
npm run build:responder
npm run lint:user
npm run lint:responder
```

From `server/`:

```powershell
python -m pip install --upgrade pip
uvicorn app.main:app --reload
```

## 6. Troubleshooting

- If speech transcription fails, verify ffmpeg is installed and available in PATH.
- If responder receives no alerts, confirm:
  - responder is logged in
  - responder availability is enabled
  - backend WebSocket URL is correct in frontend env
- If API calls fail from frontend, check CORS settings and backend base URL.
