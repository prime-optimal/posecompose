# Netlify Costume API Function

The `api` Netlify Function wraps the shared server handler in `server/api/index.ts` so the costume catalog API can deploy on Netlify without duplicating logic.

## Endpoints

- `GET /api/health` — Health check with timestamp.
- `GET /api/costumes` — Returns all active costume presets.
- `GET /api/costumes/featured` — Returns the featured costume subset.
- `GET /api/costumes/:id` — Returns a single costume by ID.
- `POST /api/logs` — Ingests JSON log entries used by the front end.

## Response Format

### Costume Object Structure

Each costume in the API response includes the following AI-related fields:

```json
{
  "id": "bowsette",
  "name": "Bowsette",
  // ... other costume fields
  "aiGeneration": {
    "model": "seedream-v4",
    "seed": 1003,
    "primaryPrompt": "Detailed prompt for AI generation...",
    "negativePrompt": "low quality, blurry, medieval armor...",
    "steps": 30,
    "resolution": "auto",
    "showExplicitContent": true,
    "numOutputs": 1,
    "referenceStrategy": "priority-order",
    "maxReferences": 7,
    "primaryReferenceIds": ["bowsette-blurred", "bowsette-crown"],
    "qualityModifiers": ["photorealistic", "sharp focus", "8K"],
    "styleEnhancements": ["dramatic", "cinematic", "soft lighting"],
    "modelOptions": {}
  },
  "aiSettings": {
    "model": "seedream-v4",
    "seed": 1003,
    "prompt": "Simplified prompt format...",
    "steps": 30,
    "resolution": "auto",
    "showExplicitContent": true,
    "referenceUrls": ["https://.../bowsette-blurred.png", ...]
  }
}
```

### AI Settings Integration

- **`aiGeneration`**: Full-featured AI generation settings with comprehensive configuration
- **`aiSettings`**: Legacy format for backward compatibility, contains essential settings
- **Tuned Costumes**: Bowsette, Daisy Bodysuit, and Rosalina have optimized AI settings
- **Fallback Behavior**: Costumes without AI settings use default generation parameters

### Reference Image Strategy

The API supports multiple reference image strategies:
- `priority-order`: Uses `primaryReferenceIds` to prioritize specific costume assets
- `best-match`: Prioritizes main and detail asset types
- `random`: Random selection of available assets
- `auto`: Default priority-based ordering

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


## Database Setup

### Applying AI Settings Migration

To add AI settings support to an existing database:

```bash
# Apply the ai_settings column migration
bun run migrate:local

# Seed tuned AI settings for specific costumes
bun run seed:ai
```

### Migration Scripts

- **`bun run migrate:local`**: Applies the `ai_settings JSONB` column to the costumes table
- **`bun run seed:ai`**: Populates AI settings for Bowsette, Daisy Bodysuit, and Rosalina with optimized prompts and parameters

## Deployment notes

- Place the function entry point at `server/netlify/functions/api/index.mts` so Netlify's build system discovers it automatically.
- The wrapper rewrites incoming `/.netlify/functions/api*` URLs to `/api*` before forwarding them to the shared handler.
- Run `bunx tsc --noEmit` before deploying to ensure type safety; lint scripts are not currently defined for this package.
- Ensure AI settings migration is applied before deploying to production environments.
