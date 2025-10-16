# AI Generation Integration – Costume ai_settings Rollout

## Overview

We now persist “tuned” AI overrides per costume directly on the `costumes` table via a new `ai_settings` JSONB column. This keeps prompts, seeds, model overrides, and reference URLs co-located with catalog metadata while remaining optional when Neon is unavailable.

### Goals
- Make Bowsette, Daisy Bodysuit, and Rosalina use vetted settings automatically during generation
- Provide a Bun script for keeping Neon in sync
- Surface `aiSettings` through the API, type layer, and frontend generator
- Retain graceful fallback behaviour when `ai_settings` is `NULL`

## Implementation Summary

| Area | Update |
| --- | --- |
| Database | Added migration `db/migrations/2025-10-16-add-ai-settings.sql` to append `ai_settings JSONB DEFAULT NULL` on `costumes`. |
| Seeding | New script `bun run seed:ai` upserts tuned settings (model, prompt, seed, showExplicitContent, referenceUrls). |
| API | `neon-client.ts`/`neon-client-v2.ts` select `ai_settings` and include it in responses (`CostumePreset.aiSettings`). |
| Frontend Types | `src/types/extracted-costume-settings.ts` exports `AiGenerationSettings`; `CostumePreset` exposes optional `aiSettings`. |
| Generation Flow | `AIGenerationService` merges `costume.aiSettings` with existing `aiGeneration` data and prefers `referenceUrls`, prompt, seed, etc. |
| Build Data | `scripts/fetch-costumes.mjs` writes `aiSettings` alongside catalog JSON for static fallback. |

## Verification Playbook

1. **Apply migration** (if not already run)
   ```sh
   bun run migrate:local # or run the SQL migration manually
   ```
2. **Seed tuned overrides**
   ```sh
   bun run seed:ai
   ```
3. **Run API & frontend**
   ```sh
   bun run serve:api
   bun run dev
   ```
4. **Inspect API response** – `/api/costumes` items should include `aiGeneration` plus optional `aiSettings` for tuned slugs.
5. **Generate Bowsette/Daisy/Rosalina** – Confirm logs show tuned model, seed, resolution, prompt, and reference URLs.

## Notes & Follow-ups

- `ai_settings` is optional: when `NULL`, the generator falls back to legacy `aiGeneration` defaults.
- Bowsette and Rosalina remain `showExplicitContent: true`; Daisy enforces `false`.
- Future costumes can be appended to `scripts/seed-ai-settings.ts` once validated.
- Consider porting remaining costumes from legacy `costume_ai_generation` table if still needed, then retire that table.