# Emergency Response Frontend

This workspace contains two separate Next.js 14 PWAs and a shared component package.

## Apps

- `user-app`: public user emergency app
- `responder-app`: responder operations app
- `shared-ui`: reusable UI components used by both apps

## Run

```bash
npm install
npm run dev:user
npm run dev:responder
```

## Environment

Each app has its own `.env.example`. Copy to `.env.local` in each app and set backend URLs.

- `NEXT_PUBLIC_BACKEND_HTTP` (example: `http://localhost:8000`)
- `NEXT_PUBLIC_BACKEND_WS` (example: `ws://localhost:8000`)
