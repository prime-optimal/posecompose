# Database Schema Considerations for AI Settings

## Overview
This rule establishes best practices for database schema design when managing AI generation settings, prompts, and reference images in virtual try-on systems.

## Core Schema Principles

### 1. Separation of Concerns
**Requirement**: Separate AI settings into dedicated tables rather than storing everything in JSONB
**Implementation**:
```sql
-- AI generation settings (prompts, model config)
CREATE TABLE costume_ai_generation_enhanced (
    id UUID PRIMARY KEY,
    costume_id UUID REFERENCES costumes(id),
    model VARCHAR(50) NOT NULL DEFAULT 'seedream-v4',
    seed INTEGER,
    primary_prompt TEXT,
    fallback_prompt TEXT,
    negative_prompt TEXT,
    steps INTEGER DEFAULT 30,
    resolution VARCHAR(20) DEFAULT 'auto',
    show_explicit_content BOOLEAN DEFAULT false,
    num_outputs INTEGER DEFAULT 1,
    reference_strategy VARCHAR(20) DEFAULT 'priority-order',
    max_references INTEGER DEFAULT 5,
    primary_reference_ids TEXT[],
    quality_modifiers TEXT[],
    style_enhancements TEXT[],
    model_options JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI reference images (individual assets with metadata)
CREATE TABLE costume_ai_references (
    id UUID PRIMARY KEY,
    costume_id UUID REFERENCES costumes(id),
    url TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'costume',
    role VARCHAR(20) NOT NULL DEFAULT 'costume',
    priority INTEGER DEFAULT 0,
    description TEXT,
    is_primary BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Rationale**: Structured columns enable better querying, indexing, and management compared to JSONB.

### 2. Backward Compatibility
**Requirement**: Maintain legacy JSONB column during migration
**Implementation**:
```sql
-- Keep existing ai_settings column for backward compatibility
ALTER TABLE costumes ADD COLUMN IF NOT EXISTS ai_settings JSONB;

-- Create migration function to move data from JSONB to structured tables
CREATE OR REPLACE FUNCTION migrate_ai_settings()
RETURNS VOID AS $$
BEGIN
    -- Migrate data from ai_settings JSONB to structured tables
    FOR costume_record IN 
        SELECT id, slug, ai_settings 
        FROM costumes 
        WHERE ai_settings IS NOT NULL
    LOOP
        -- Insert into enhanced AI generation table
        INSERT INTO costume_ai_generation_enhanced (...)
        VALUES (...);
        
        -- Insert reference URLs into references table
        IF ai_settings ? 'referenceUrls' THEN
            INSERT INTO costume_ai_references (...)
            SELECT ... FROM json_array_elements_text(ai_settings->'referenceUrls');
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### 3. Indexing Strategy
**Requirement**: Create appropriate indexes for performance optimization
**Implementation**:
```sql
-- Core indexes for AI generation settings
CREATE INDEX idx_costume_ai_generation_enhanced_costume_id ON costume_ai_generation_enhanced(costume_id);
CREATE INDEX idx_costume_ai_generation_enhanced_model ON costume_ai_generation_enhanced(model);

-- Core indexes for AI reference images
CREATE INDEX idx_costume_ai_references_costume_id ON costume_ai_references(costume_id);
CREATE INDEX idx_costume_ai_references_type ON costume_ai_references(type);
CREATE INDEX idx_costume_ai_references_priority ON costume_ai_references(priority DESC);

-- Composite indexes for common query patterns
CREATE INDEX idx_costume_ai_references_costume_type_role ON costume_ai_references(costume_id, type, role);
```

## Data Type Selection

### 1. Text Fields
**Use Cases**: Prompts, descriptions, URLs
**Best Practices**:
```sql
-- Use TEXT for large content like prompts
primary_prompt TEXT,
fallback_prompt TEXT,
negative_prompt TEXT,

-- Use VARCHAR for fixed-length fields
model VARCHAR(50),
resolution VARCHAR(20),
reference_strategy VARCHAR(20)
```

### 2. Numeric Fields
**Use Cases**: Seeds, counts, priorities
**Best Practices**:
```sql
-- Use INTEGER for whole numbers
seed INTEGER,
steps INTEGER,
max_references INTEGER,
priority INTEGER,
sort_order INTEGER,

-- Use BOOLEAN for flags
show_explicit_content BOOLEAN,
is_primary BOOLEAN
```

### 3. Array Fields
**Use Cases**: Multiple reference IDs, quality modifiers
**Best Practices**:
```sql
-- Use TEXT[] for arrays of strings
primary_reference_ids TEXT[],
quality_modifiers TEXT[],
style_enhancements TEXT[]
```

### 4. JSON Fields
**Use Cases**: Flexible model options, complex configurations
**Best Practices**:
```sql
-- Use JSONB for structured but flexible data
model_options JSONB DEFAULT '{}'
```

## View Layer

### 1. Convenience View
**Requirement**: Create view for easy querying of AI settings with references
**Implementation**:
```sql
CREATE OR REPLACE VIEW costume_ai_settings_view AS
SELECT 
    c.id as costume_id,
    c.slug,
    c.name,
    gen.model,
    gen.seed,
    gen.primary_prompt,
    gen.fallback_prompt,
    gen.negative_prompt,
    gen.steps,
    gen.resolution,
    gen.show_explicit_content,
    gen.num_outputs,
    gen.reference_strategy,
    gen.max_references,
    gen.primary_reference_ids,
    gen.quality_modifiers,
    gen.style_enhancements,
    gen.model_options,
    gen.created_at as ai_created_at,
    gen.updated_at as ai_updated_at,
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', ref.id,
                'url', ref.url,
                'type', ref.type,
                'role', ref.role,
                'priority', ref.priority,
                'description', ref.description,
                'is_primary', ref.is_primary,
                'sort_order', ref.sort_order
            ) ORDER BY ref.sort_order
        ) FILTER (WHERE ref.id IS NOT NULL),
        '[]'::json
    ) as references
FROM costumes c
LEFT JOIN costume_ai_generation_enhanced gen ON c.id = gen.costume_id
LEFT JOIN costume_ai_references ref ON c.id = ref.costume_id
GROUP BY c.id, c.slug, c.name, 
         gen.model, gen.seed, gen.primary_prompt, gen.fallback_prompt, gen.negative_prompt,
         gen.steps, gen.resolution, gen.show_explicit_content, gen.num_outputs,
         gen.reference_strategy, gen.max_references, gen.primary_reference_ids,
         gen.quality_modifiers, gen.style_enhancements, gen.model_options,
         gen.created_at, gen.updated_at;
```

## Migration Strategy

### 1. Phase 1: Schema Creation
```sql
-- Create new tables
CREATE TABLE costume_ai_generation_enhanced (...);
CREATE TABLE costume_ai_references (...);

-- Create indexes
CREATE INDEX ...;

-- Create migration function
CREATE FUNCTION migrate_ai_settings() ...;
```

### 2. Phase 2: Data Migration
```sql
-- Run migration
SELECT migrate_ai_settings();

-- Verify migration
SELECT COUNT(*) FROM costume_ai_generation_enhanced;
SELECT COUNT(*) FROM costume_ai_references;
```

### 3. Phase 3: Application Updates
```typescript
// Update TypeScript interfaces
interface CostumeAIGeneration {
    model: string;
    seed: number;
    primaryPrompt: string;
    fallbackPrompt?: string;
    negativePrompt?: string;
    // ... other fields
}

// Update service layer
const aiSettings = await getCostumeAISettings(costumeId);
```

## Validation Rules

### 1. Data Validation
**Requirement**: Ensure data integrity at database level
**Implementation**:
```sql
-- Add constraints for data validation
ALTER TABLE costume_ai_generation_enhanced 
ADD CONSTRAINT chk_model CHECK (model IN ('seedream-v4', 'google:4@1', 'background-remover'));

ALTER TABLE costume_ai_generation_enhanced 
ADD CONSTRAINT chk_resolution CHECK (resolution IN ('auto', '512x512', '1024x1024', '768x768'));

ALTER TABLE costume_ai_references 
ADD CONSTRAINT chk_type CHECK (type IN ('main', 'detail', 'background', 'example'));

ALTER TABLE costume_ai_references 
ADD CONSTRAINT chk_role CHECK (role IN ('user', 'costume', 'background'));
```

### 2. Referential Integrity
**Requirement**: Maintain foreign key relationships
**Implementation**:
```sql
-- Add foreign key constraints
ALTER TABLE costume_ai_generation_enhanced 
ADD CONSTRAINT fk_costume_ai_generation_enhanced_costume 
FOREIGN KEY (costume_id) REFERENCES costumes(id) ON DELETE CASCADE;

ALTER TABLE costume_ai_references 
ADD CONSTRAINT fk_costume_ai_references_costume 
FOREIGN KEY (costume_id) REFERENCES costumes(id) ON DELETE CASCADE;
```

## Performance Optimization

### 1. Query Optimization
**Requirement**: Optimize common query patterns
**Implementation**:
```sql
-- Use materialized views for frequently accessed data
CREATE MATERIALIZED VIEW costume_ai_settings_materialized AS
SELECT * FROM costume_ai_settings_view;

-- Refresh strategy
REFRESH MATERIALIZED VIEW costume_ai_settings_materialized;

-- Use partial indexes for common filters
CREATE INDEX idx_costume_ai_references_costume_main ON costume_ai_references(costume_id) 
WHERE type = 'main';
```

### 2. Storage Optimization
**Requirement**: Optimize storage for large datasets
**Implementation**:
```sql
-- Use table partitioning for large costume catalogs
CREATE TABLE costume_ai_generation_enhanced (
    -- same columns as before
) PARTITION BY LIST (model);

-- Create partitions for each model
CREATE TABLE costume_ai_generation_enhanced_seedream_v4 PARTITION OF costume_ai_generation_enhanced
    FOR VALUES IN ('seedream-v4');

-- Use compression for large text fields
ALTER TABLE costume_ai_generation_enhanced 
ALTER COLUMN primary_prompt SET STORAGE MAIN;
```

## Monitoring and Maintenance

### 1. Size Monitoring
**Requirement**: Monitor table sizes for performance planning
**Implementation**:
```sql
-- Monitor table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('costume_ai_generation_enhanced', 'costume_ai_references')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 2. Query Performance
**Requirement**: Monitor slow queries
**Implementation**:
```sql
-- Monitor query performance
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements 
WHERE query LIKE '%costume_ai%'
ORDER BY total_time DESC
LIMIT 10;
```

## References
- [`db/migrations/2025-10-16-enhance-ai-settings-schema.sql`](db/migrations/2025-10-16-enhance-ai-settings-schema.sql:1) - Enhanced schema migration
- [`server/api/neon-client-v2.ts`](server/api/neon-client-v2.ts:1) - Neon client with AI settings support
- [`src/types/costume-v2.ts`](src/types/costume-v2.ts:17) - AI generation type definitions