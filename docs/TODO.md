# Waifu Material TODO

## Near-Term Tasks
- [ ] Documentation consolidation and cleanup:
  - Clean up old/obsolete documentation files
  - Remove duplicate JS/TS files that mirror each other
  - Organize and consolidate the documentation structure
  - Archive or remove outdated AI generation documentation

## Phase 1 Backlog
- [x] Finalize neon/anime Tailwind design tokens.
- [x] Create costume preset schema and seed initial 6–9 entries.
- [x] Integrate costume selection UI (max 3 selections).
- [x] Implement selfie upload with optional crop/background removal.
- [x] Add email capture gate with validation + submission stub.
- [x] Surface affiliate links during generation and note disclosure copy.
- [x] Abstract AI provider layer (Gemini + OpenAI-compatible, `seedream-v4`).
- [x] Expand logging events for selections, email, generation, affiliate, social interactions.
- [x] Update README, AGENTS.md, CHANGELOG.md with new workflow.
- [ ] Configure Vercel deployment settings + document Backblaze B2 option.
- [x] Produce Mermaid system overview diagram and export to SVG/PNG (`docs/diagrams/system-overview.*`) — placeholder assets committed; regenerate with final visuals.
- [x] Produce timeline diagram for Phase 1 milestones with exported assets.
- [x] Add generation flow diagram detailing costume selection → email → render pipeline and export assets.

## Phase 1 Completed ✅
All core Phase 1 sub-phases have been completed:
- ✅ Sub-Phase 1: Branding & Theme Refresh
- ✅ Sub-Phase 2: Costume Catalog Foundations
- ✅ Sub-Phase 3: Flow Rework & UX Copy
- ✅ Sub-Phase 4: AI Provider Abstraction
- ✅ Sub-Phase 4.5: AI Settings Persistence
- ✅ Sub-Phase 5: Instrumentation & Data Hooks
- ✅ Sub-Phase 6: AI Generation Unification & Tuned Prompts

## Phase 2 Backlog
- [ ] Design admin dashboard wireframes.
- [ ] Evaluate Neon vs Supabase for catalog + analytics storage.
- [ ] Implement authentication/authorization strategy.
- [ ] Build CRUD endpoints for costumes/products.
- [ ] Add metrics visualization (email conversions, model usage, affiliate clicks).
- [ ] Create Mermaid-powered dashboard architecture diagram with exports.

## AI Generation Future Tasks
- [ ] Deploy enhanced AI settings schema to production
- [ ] Apply tuned prompts to all Halloween costumes in database
- [ ] Monitor AI generation success rates and quality metrics
- [ ] Collect user feedback on transformation quality
- [ ] Implement advanced prompt strategies (ML-based optimization)
- [ ] Add dynamic reference selection based on costume type
- [ ] Create multi-model fallback system
- [ ] Implement user preference learning for personalized prompts
- [ ] Add A/B testing framework for prompt optimization
- [ ] Develop cost optimization strategies for API usage

## Database & Schema Enhancements
- [ ] Run enhanced schema migration in production environment
- [ ] Add validation for AI reference image URLs
- [ ] Implement backup strategy for AI settings data
- [ ] Add indexing for AI generation performance optimization
- [ ] Create data migration tools for costume prompt updates

## Testing & Quality Assurance
- [ ] Add integration tests for full AI generation flow
- [ ] Implement visual regression testing for generated images
- [ ] Create performance benchmarks for AI generation times
- [ ] Add error scenario testing for API failures
- [ ] Implement load testing for concurrent generation requests

## Ideas / Parking Lot
- [ ] TikTok/Instagram filter integration exploration.
- [ ] User-submitted costume ideas voting mechanism.
- [ ] Merch store powered by print-on-demand partners.
- [ ] Mobile app development for iOS/Android
- [ ] API rate limiting and abuse prevention
- [ ] Advanced image editing features post-generation
- [ ] Social sharing integration with automatic watermarking
