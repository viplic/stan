# RoomWalk

Marketplace MVP for apartment and house listings with login-protected media upload and smooth 3D walkthrough previews.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:5174`.

## Environment

Create `.env` from `.env.example`.

- `SESSION_SECRET`: required in production. Use a long random value.
- `DATABASE_URL`: optional locally, required for persistent Vercel production data. Use a Postgres/Neon connection string.

Without `DATABASE_URL`, local development uses `data/roomwalk-db.json` and `data/uploads/`.

## Checks

```bash
npm run build
npm audit
```

## Vercel

The project includes `vercel.json` and `/api/index.js`.

Set these environment variables in Vercel:

- `SESSION_SECRET`
- `DATABASE_URL`

Then deploy the repository. The frontend is built from `dist`, and `/api/*` routes go through the Express API handler.
