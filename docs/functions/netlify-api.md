# Netlify Costume API Function

The `api` Netlify Function wraps the shared server handler in `server/api/index.ts` so the costume catalog API can deploy on Netlify without duplicating logic.

## Endpoints

- `GET /api/health` — Health check with timestamp.
- `GET /api/costumes` — Returns all active costume presets.
- `GET /api/costumes/featured` — Returns the featured costume subset.
- `GET /api/costumes/:id` — Returns a single costume by ID.
- `POST /api/logs` — Ingests JSON log entries used by the front end.

The function is reachable via both `/.netlify/functions/api` (default Netlify routing) and the cleaner `/api/*` paths configured in the function `config` export.

## Environment variables

Set these values in Netlify with **Functions** scope enabled:

- `NEON_DATABASE_URL_READONLY` (or `NEON_DATABASE_URL`) — Neon connection string for fetching costume data.
- `API_ALLOW_ORIGIN` — Comma-separated list of allowed CORS origins (defaults to `*`).
- `LOG_SINK` — Destination for log ingestion (`stdout` or `console`).

## Deployment notes

- Place the function entry point at `server/netlify/functions/api/index.mts` so Netlify’s build system discovers it automatically.
- The wrapper rewrites incoming `/.netlify/functions/api*` URLs to `/api*` before forwarding them to the shared handler.
- Run `bunx tsc --noEmit` before deploying to ensure type safety; lint scripts are not currently defined for this package.
