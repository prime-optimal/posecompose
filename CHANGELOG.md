# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
- Establish Waifu Material roadmap and documentation foundation.
- Define droid-enabled workflow for phased development.
- Introduce Mermaid diagram standards with required SVG/PNG exports.
- (Pending) Implement branding, costume catalog, provider abstraction, and affiliate UX.

## [2025-10-16] - Sub-Phase 6: AI Generation Unification & Tuned Prompts
### Added
- **AI Generation Payload Unification**: Standardized API payload structures across different models (seedream-v4, google:4@1, background-remover)
- **Production-Ready Virtual Try-On Prompts**: Halloween-optimized prompts with detailed transformation instructions
- **Enhanced Database Schema**: Structured AI settings tables with separated prompts and reference image management
- **Reference Ordering System**: Priority-based ordering ensuring user selfies are always primary references
- **Comprehensive Testing Suite**: Reference ordering tests, enhanced AI generation testing, and full integration testing
- **Debugging & Logging Tools**: Prompt detail saving, generation logging, and image saving with descriptive filenames

### Changed
- **AI Generation Service**: Complete rewrite with unified payload building and database-driven prompt management
- **NanoGPT Provider**: Fixed API payload structure with proper model-specific parameter handling
- **Database Schema**: Enhanced AI settings with separate tables for better querying and management
- **Type Definitions**: Enhanced TypeScript interfaces for AI generation settings and costume assets

### Fixed
- **Reference Image Ordering**: AI now properly transforms user selfies instead of outputting costume references
- **API Payload Structure**: Fixed compatibility with official NanoGPT API requirements
- **Broken Costume URLs**: Added URL validation and fallback mechanisms
- **Response Handling**: Proper handling of both URL and base64 image responses

### Technical Details
- **Model Reference Limits**: Implemented model-specific reference count limits (seedream-v4: 10, google:4@1: 4, background-remover: 1)
- **Reference Strategies**: Added multiple ordering strategies (priority-order, best-match, random, auto)
- **Prompt Priority**: Database prompts > structured prompts > Halloween fallback prompts
- **Error Handling**: Enhanced validation and meaningful error messages for AI generation
- **Performance**: Optimized reference building and image generation workflows

### Testing Results
- **Production Prompt Testing**: Successfully generated 6 test images proving the solution works
- **Integration Testing**: Full integration test with Bowsette costume completed successfully
- **Reference Ordering**: All tests pass ensuring proper user selfie priority
- **Type Safety**: TypeScript compilation and linting pass with new AI generation code

### Files Modified
- `src/lib/ai/ai-generation-service.ts` - New unified AI generation service
- `src/lib/ai/nano-gpt-v2.ts` - Fixed NanoGPT provider (replaces nano-gpt.ts)
- `src/lib/ai/virtual-try-on-prompts.ts` - New production prompt library
- `db/migrations/2025-10-16-enhance-ai-settings-schema.sql` - Enhanced schema migration
- `src/types/costume-v2.ts` - Enhanced TypeScript interfaces
- `src/__tests__/reference-ordering.test.ts` - New reference ordering tests
- `scripts/test-enhanced-ai-generation.ts` - Enhanced AI generation testing
- `scripts/test-full-integration.ts` - Full integration testing

### Documentation
- `docs/SUBPHASE_6_SUMMARY.md` - Comprehensive summary of Sub-Phase 6 work
- `docs/AI_REFERENCE_IMAGE_SOLUTION.md` - Complete reference image solution
- `docs/AI_IMAGE_GENERATION_COMPLETE_SOLUTION.md` - Complete AI generation solution
- `.roo/rules/ai-reference-ordering.md` - AI reference ordering requirements
- `.roo/rules/ai-database-schema.md` - Database schema considerations for AI settings
- `.roo/rules/ai-testing-requirements.md` - Testing requirements for AI generation features
