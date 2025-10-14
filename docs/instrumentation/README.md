# Instrumentation Guide

Central reference for Waifu Material's logging, costume asset defaults, and AI generation plumbing. Keep this file updated as providers, prompts, or asset heuristics evolve.

## Costume Asset Defaults

- Loader: `scripts/utils/costume-loader.ts`
- Primary asset is chosen by keyword match on the filename (`square`, `profile`, `front`).
- If no keyword hits exist, the loader uses the first entry in `reference_images` as the default.
- Remote fallbacks (`reference_image_url`, `thumbnail_url`) are appended when present.
- When `thumbnail_url` is provided it is automatically added as an `example` asset, ensuring the UI uses it as the showcased thumbnail without duplicating entries in `reference_images`.
- Seed script (`scripts/seed-neon-costumes.ts`) clears and repopulates `costume_assets`, so changes in `costumes.json` propagate after `bun run seed:costumes`.
- Frontend thumbnails (e.g., costume selection grid) prefer assets marked as `example`, falling back to `main` when no example exists.
- `reference_images` supports either plain string paths or objects with `path`/`url`, optional `type` (`main`, `example`, `detail`, `background`), and metadata. Example:

```json
{
  "reference_images": [
    { "path": "assets/costumes/daisy-bodysuit/daisy-bodysuit-front.jpg", "type": "main" },
    { "path": "assets/costumes/daisy-bodysuit/daisy-bodysuit-layout.jpg", "type": "example" },
    "assets/costumes/daisy-bodysuit/daisy-bodysuit-back.jpg"
  ]
}
```

### Changing the Default Image

1. Place the desired asset in `assets/costumes/<costume-id>/` and reference it from `costumes.json`.
2. Either move it to the top of `reference_images` or rename it to include a primary keyword.
3. Run `bun run seed:costumes` to sync Neon. For manual DB edits, ensure only the preferred row keeps `type = 'main'`.

## Prompt & Reference Updates

- Prompts: edit `prompt`, `negative_prompt`, or `transformation` fields in `costumes.json`.
- Reference assets follow the same update workflow as above; each entry becomes a row in Neon with `type` inferred from loader heuristics.
- Frontend fetches via `src/services/costume-service.ts`, falling back to local fixtures when the API is unreachable.
- To explicitly set gallery behavior, use object-style `reference_images` entries with `type: "example"` for preferred thumbnails or `type: "main"` for the default reference.

## Recommended Costume Update Workflow

1. Make all costume metadata and asset changes in the repo (`costumes.json`, `assets/costumes/**`).
2. Use typed `reference_images` objects when you need to pin `main`/`example` roles without relying on filename heuristics.
3. Run `bun run seed:costumes` to sync Neon. Manual Neon edits will be overwritten unless you pass the `--preserve-assets` flag (see below).
4. Verify locally with `bun run serve:api` + frontend reload, then commit the updated sources.

`bun run seed:costumes -- --preserve-assets` skips asset rewrites and retains whatever is already stored in Neon—useful for quick experiments, but check changes back into source before the next full sync.

## Generation Endpoint Routing

- Selfie upload completes (`CostumeTransformationFlow`) → `GenerationLounge` instantiates `NanoGptProvider`.
- Provider endpoint order of precedence:
  1. `VITE_NANO_GPT_BASE_URL` (normalized to `/v1/images/generations`).
  2. Default `https://nano-gpt.com/v1/images/generations`.
- Model selected from `VITE_DEFAULT_MODEL`; defaults to `seedream-v4`. Background remover requests omit catalog references.
- Fallback costume references are disabled unless the model is `background-remover` and no selfie is provided, so the sample Daisy asset is no longer appended during standard generations.

## Prompt Logging

- `GenerationLounge` emits `generation_prompt_composed` with:
  - Costume metadata and chosen model.
  - Final positive prompt plus concatenated negative prompt string.
  - `referenceSummary` for each reference (role, transport kind, MIME type, weight, URL when applicable).
  - Flags indicating whether the user selfie was included and whether it was base64 vs URL.
- `NanoGptProvider` logs `nano_gpt_payload_ready`, surfacing the byte length of the primary `imageDataUrl` and the number of secondary references to verify the selfie payload is set before dispatch.
- Raw base64 selfies are never stored; logs only reflect metadata.
- Configure `VITE_LOG_ENDPOINT` to capture logs server-side. Browser consoles always mirror entries for local debugging.
- Local log endpoints must include CORS headers (`Access-Control-Allow-Origin` matching the Vite dev URL, plus `POST, OPTIONS` and `Content-Type`) when handling preflight requests; otherwise the browser drops telemetry before it leaves the page.
- Set `VITE_DEBUG_SELFIE_ONLY=true` to send only the user selfie during debugging—handy when verifying model behavior without costume references.

## Related Commands

- `bun run seed:costumes` – rebuilds Neon tables with latest costume metadata and assets.
- `bun run serve:api` – serves `/api/costumes` via the Bun API with Neon + local fallback.
- `bunx tsc --noEmit && bun run lint` – validation required before committing instrumentation changes.

Keep future instrumentation and provider updates documented here to streamline iteration.
