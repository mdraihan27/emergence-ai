# Emergency Response Frontend

## What This Frontend Is For

These PWAs are built to support Dhaka 999 emergency response flow.
The user app helps people report incidents quickly, while the responder app helps teams act on real-time alerts and coordinate response.

## How It Helps

- User PWA: SOS, AI-guided support, voice-enabled help requests.
- Responder PWA: live alerts, availability control, and incident chat.
- Mobile-first PWA delivery for fast access during emergencies.

This workspace contains two separate Next.js 14 PWAs and a shared component package.

## Apps

- `user-app`: public user emergency app
- `responder-app`: responder operations app
- `shared-ui`: reusable UI components used by both apps

## Run

```bash
cd clients
npm run install:user
npm run install:responder

# Terminal 1
npm run dev:user

# Terminal 2
npm run dev:responder
```

## Environment

Each app has its own `.env.example`. Copy to `.env.local` in each app and set backend URLs.

- `NEXT_PUBLIC_BACKEND_HTTP` (example: `http://localhost:8000`)
- `NEXT_PUBLIC_BACKEND_WS` (example: `ws://localhost:8000`)
