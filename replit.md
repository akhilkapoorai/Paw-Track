# PawTrack

A full-stack mobile-optimized lost pet community tracking web app. Community members report lost/found pets, log sightings on a map, and Gemini AI predicts the pet's travel path in real time.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/pawtrack run dev` — run the frontend (port varies)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — seed demo data
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + Socket.io 4
- DB: PostgreSQL + Drizzle ORM
- Auth: Firebase Admin SDK (server) + Firebase Client SDK (frontend)
- Storage: Firebase Storage (pet/sighting photos)
- AI: Gemini 2.5 Flash via Replit AI Integration (predicted travel path)
- Frontend: React + Vite + Tailwind v4 + shadcn/ui + wouter
- Maps: Leaflet / OpenStreetMap
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/db/src/schema/` — Drizzle schema (pets, users, sightings, pet-updates)
- `artifacts/api-server/src/` — Express backend
  - `routes/` — pets, sightings, updates, auth, uploads, health
  - `services/aiService.ts` — Gemini AI path prediction
  - `lib/firebaseAdmin.ts` — Firebase Admin singleton
- `artifacts/pawtrack/src/` — React frontend
  - `pages/` — home (feed), pet-detail, report (multi-step), dashboard
  - `components/` — Navbar, PetCard, PetMap (Leaflet), SightingForm, StatusBadge
  - `contexts/AuthContext.tsx` — Firebase Auth state
  - `lib/socket.ts` — Socket.io client

## Architecture decisions

- Socket.io path is `/api/socket.io` so it routes through the proxy alongside `/api` REST routes
- Firebase Admin SDK externalized from esbuild bundle (dynamic binary loading)
- `multer`, `socket.io`, `@google/genai` all externalized from esbuild — kept in local `node_modules` for runtime
- AI path generation runs `setImmediate` after sighting creation — non-blocking
- Photo uploads go to Firebase Storage; URLs are stored in DB

## Product

- **Pet Feed**: Browse lost/found pets with real-time status, species/status filters, search
- **Pet Detail**: Leaflet map with verified sighting path + Gemini AI predicted path overlay
- **Multi-step Report Form**: 5-step wizard to report a lost pet with photo upload
- **Real-time Sightings**: Community members submit sightings with GPS + photo; map updates via Socket.io
- **Owner Dashboard**: See all your reports, sighting counts, and status controls
- **AI Path**: Gemini analyzes sighting coordinates + pet behavior to predict likely location

## User preferences

- Use crypto.randomUUID() for IDs (not cuid/uuid package)
- Keep socket.io at `/api/socket.io` path for proxy compatibility

## Gotchas

- esbuild externals: `multer`, `socket.io`, `@google/genai`, `firebase-admin` must be external AND installed in `artifacts/api-server/node_modules/`
- Firebase env vars needed: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET` (server-side secrets)
- Frontend Firebase config via `VITE_FIREBASE_*` env vars
- Gemini AI: `AI_INTEGRATIONS_GEMINI_BASE_URL` and `AI_INTEGRATIONS_GEMINI_API_KEY` via Replit integration

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
