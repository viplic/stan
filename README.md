# stan360

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

## Pascal Studio

Open `http://localhost:5174/#/studio` to load the Pascal Editor island. The Pascal editor is lazy-loaded only for this route; the marketplace and existing PlayCanvas walkthrough remain vanilla/PlayCanvas code.

The integration uses `@pascal-app/editor`, `@pascal-app/viewer`, and `@pascal-app/core` through the Vite React plugin. `next/link` and `next/image` are provided by small local compatibility shims so the Pascal package can run inside Vite without converting the application to Next.js.

Pascal scene drafts are saved to localStorage under `stan360:pascal-scene:v1`. The Studio toolbar exports the current Pascal scene graph as JSON. If the browser cannot provide WebGL/WebGPU or the Pascal runtime fails, the route displays a clear message and mounts the existing vanilla editor fallback.
