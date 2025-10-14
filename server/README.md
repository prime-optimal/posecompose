# Server API

This directory contains the Bun-based API server that serves costume data from Neon PostgreSQL with local JSON fallback.

## Installation

```bash
bun install
```

## Running the API Server

**IMPORTANT**: The API server must be run from the **root directory** to properly load environment variables from `.env`.

```bash
# From root directory (CORRECT)
bun run server/api/index.ts

# Or use the npm script from root:
bun run serve:api
```

**❌ Incorrect way (will fall back to local JSON data):**
```bash
# From server directory (WRONG - won't load .env properly)
cd server && bun run api/index.ts
```

## Environment Variables

The API server requires these environment variables in the root `.env` file:

- `NEON_DATABASE_URL`: PostgreSQL connection string for Neon database
- `NEON_DATABASE_URL_READONLY`: Optional read-only connection string
- `API_ALLOW_ORIGIN`: CORS allowed origins (default: `*`)
- `LOG_SINK`: Log destination (default: `stdout`)

## API Endpoints

- `GET /api/costumes` - List all costumes
- `GET /api/costumes/featured` - List featured costumes
- `GET /api/costumes/:id` - Get specific costume
- `GET /api/health` - Health check

## Database Seeding

Seed the Neon database with costume data:

```bash
# From root directory
bun run scripts/seed-neon-costumes.ts
```

This project was created using `bun init` in bun v1.2.22. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
