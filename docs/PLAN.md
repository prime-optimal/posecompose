# Waifu Material – Phase Plan

## Phase 1: Halloween Launch (Current)

### Objective
Rebrand the existing experience into Waifu Material and deliver a polished Halloween-focused virtual costume try-on MVP with multi-provider AI support and affiliate monetization hooks. Every major system/component should be documented with Mermaid diagrams saved both inline (Markdown) and as exported SVG/PNG assets in `docs/diagrams/`.

### Sub-Phases
1. **Branding & Theme Refresh**  _(ui-theme-droid)_ ✅ **COMPLETED**
   - Update Tailwind tokens and component styles to neon/anime aesthetic. ✅
   - Replace hero messaging, typography, and meta assets. ✅

2. **Costume Catalog Foundations**  _(catalog-curator-droid)_ ✅ **COMPLETED**
   - Define costume schema (`CostumePreset`). ✅
   - Import 6–9 launch costumes with reference images and prompts. ✅
   - Document migration path to Neon/Supabase. ✅

3. **Flow Rework & UX Copy**  _(affiliates-comms-droid)_ ✅ **COMPLETED**
   - Reframe screens: costume selection → selfie upload → email capture → generation lounge → results/share. ✅
   - Implement disclosure copy, affiliate link presentation, and social CTAs. ✅

4. **AI Provider Abstraction**  _(ai-pipeline-droid)_ ✅ **COMPLETED**
   - Support Gemini proxy + OpenAI-compatible providers (incl. `seedream-v4`). ✅
   - Handle multiple costume reference images per request. ✅
   - Provide mockable interfaces for tests. ✅

5. **Instrumentation & Data Hooks**  _(affiliates-comms-droid + ai-pipeline-droid)_
   - Extend logging events (selection, email, generation, affiliate clicks, social shares).
   - Stub email submission endpoint integration.

6. **Documentation & Ops**  _(ops-docs-droid)_
   - Keep README, AGENTS.md, CHANGELOG.md, docs/TODO.md synchronized.
   - Capture deployment notes for Vercel and optional Backblaze B2 CDN.
   - Maintain Mermaid diagrams (systems, timelines, complex flows) and ensure matching SVG/PNG exports live in `docs/diagrams/`.
## Diagram Standards

- Mermaid diagrams must accompany complex features, architecture views, and delivery timelines.
- Store source `.mmd` (or Markdown snippets) under `docs/diagrams/` and regenerate SVG/PNG exports via Mermaid CLI (`npx @mermaid-js/mermaid-cli -i <file>.mmd -o <file>.svg --png`).
- Reference both the inline Mermaid code and the exported assets within docs so readers without Mermaid support still see visuals.

### Exit Criteria
- All sub-phases completed with passing lint/tests.
- Documentation updated to reflect feature set and processes.
- Summary + challenge log recorded, changes committed, PR opened.

## Phase 2: Operations Dashboard

### Objective
Deliver admin tooling to manage costumes/products, view analytics, and tune theming without redeploys.

### Highlights
- Implement dashboard UI (likely Next.js or Vite) with auth.
- Migrate catalog and analytics to Neon/Supabase.
- Integrate email delivery service and reporting.
- Extend affiliate product management and tracking.

## Phase 3+: Seasonal & Monetization Expansions
- Pivot costume catalog/themes to winter holidays and beyond.
- Introduce premium upsells, community features, or creator monetization.
- Automate CI/CD with gated preview deployments and QA bots.

## Phase 7: Community Contributions (Post-Launch)
- Give back to PoseCompose with security enhancements, testing infrastructure, and documentation
- Share AI provider patterns and optimizations developed during Waifu Material
- Build positive relationship with original maintainer and open-source community

- Pivot costume catalog/themes to winter holidays and beyond.
- Introduce premium upsells, community features, or creator monetization.
- Automate CI/CD with gated preview deployments and QA bots.

## Phase 7: Community Contributions (Post-Launch)

### Objective
Give back to the PoseCompose open-source community by contributing improvements that benefit both the original project and broader ecosystem, while establishing Waifu Material as a positive community participant.

### Contribution Areas

#### Immediate Contributions
1. **Security Enhancements** _(all teams)_
   - Implement Content Security Policy (CSP) with proper security headers
   - Add Nginx rate limiting for `/api/` endpoints to mitigate abuse
   - Systematic security hardening and audit recommendations
   - Document security best practices for AI-powered applications

2. **Testing Infrastructure** _(ai-pipeline-droid + ops-docs-droid)_
   - Create comprehensive unit test suite for core PoseCompose functionality
   - Add integration tests for Gemini API proxy and image processing workflows
   - Implement error handling and edge case coverage
   - Set up test-driven development patterns for future features

3. **Documentation Improvements** _(ops-docs-droid)_
   - Enhanced setup guides with troubleshooting sections
   - Better API documentation and examples
   - GitHub Actions workflow for automated CI/CD (as listed in Mert's roadmap)
   - Comprehensive deployment and maintenance documentation

#### Value-Back Contributions
4. **Multi-Provider Patterns** _(ai-pipeline-droid)_
   - Share our AI provider abstraction layer for PoseCompose extensibility
   - Contribute OpenAI-compatible provider support patterns
   - Provide mockable interfaces testing frameworks
   - Document multiple model integration best practices

5. **UX Enhancements** _(affiliates-comms-droid)_
   - Share improved user flow patterns we've developed
   - Contribute error handling and loading state improvements  
   - Enhanced accessibility patterns for image-based applications
   - Mobile-optimized interaction patterns

6. **Performance Optimizations** _(all teams)_
   - Client-side image downscaling implementations
   - Asset optimization and caching strategies
   - Upload latency reduction techniques
   - Bundle size optimization patterns

### Contribution Process

#### Ethical Guidelines
- **Respect Original Vision**: Enhance without fundamentally changing PoseCompose's core purpose
- **Collaborative Approach**: Work with Mert (@setrf) to ensure contributions align with his roadmap
- **Transparent Attribution**: Clearly document Waifu Material's derivative relationship
- **Community First**: Prioritize contributions that benefit broader user base

#### Technical Standards
- **Quality Standards**: Maintain same code quality and documentation as Waifu Material
- **Testing Requirements**: Include comprehensive tests for all contributed features
- **Security Review**: Ensure all contributions follow security best practices
- **Backward Compatibility**: Maintain compatibility with existing PoseCompose deployments

#### Coordination Protocol
1. **Initial Outreach**: Contact Mert to discuss contribution plans and alignment
2. **Documentation**: Create clear issue descriptions and implementation proposals
3. **Iterative Development**: Work in coordination with Mert's feedback and timeline
4. **Quality Assurance**: Ensure all contributions meet PoseCompose's standards
5. **Community Recognition**: Respect Mert's project ownership and credit properly

### Expected Timeline
- **Phase 7A** (Week 1-2): Security enhancements and testing infrastructure
- **Phase 7B** (Week 3-4): Documentation improvements and CI/CD workflow  
- **Phase 7C** (Week 5-6): Advanced shared features and optimizations
- **Phase 7D** (Week 7-8): Community engagement and knowledge sharing

### Success Metrics
- **Code Contributions**: Successfully merged improvements to PoseCompose
- **Community Impact**: Positive adoption and user feedback on contributed features
- **Relationship Building**: Strong collaborative relationship with original maintainer
- **Knowledge Sharing**: Technical best practices documented and shared with community

### Documentation & Credit
All Phase 7 contributions will be documented with:
- **Clear Attribution**: Reference original PoseCompose foundation in all communications
- **Technical Blog Posts**: Share learnings and implementation patterns
- **GitHub Best Practices**: Proper contribution etiquette and code review participation
- **Community Engagement**: Active participation in open-source discussions and support

This phase ensures Waifu Material contributes value back to the open-source ecosystem while building positive relationships with the original PoseCompose community.

## Session Workflow Reminder
1. Read this plan before starting work.
2. Select the active sub-phase and coordinate with the appropriate droid.
3. Implement changes, keeping tests and lint up-to-date.
4. Update docs and log challenges.
5. Commit, push, and open a PR summarizing the outcome.
