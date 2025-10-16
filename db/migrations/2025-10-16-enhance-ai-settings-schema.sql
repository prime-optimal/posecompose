-- Enhanced AI Settings Schema Migration
-- Separates prompts and reference images into dedicated columns for better querying and management

-- First, create a new enhanced table for AI generation settings
CREATE TABLE IF NOT EXISTS costume_ai_generation_enhanced (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    costume_id UUID REFERENCES costumes(id) ON DELETE CASCADE,
    
    -- Model settings
    model VARCHAR(50) NOT NULL DEFAULT 'seedream-v4',
    seed INTEGER,
    
    -- Prompts (separate columns for better querying)
    primary_prompt TEXT,
    fallback_prompt TEXT,
    negative_prompt TEXT,
    
    -- Generation parameters
    steps INTEGER DEFAULT 30,
    resolution VARCHAR(20) DEFAULT 'auto',
    show_explicit_content BOOLEAN DEFAULT false,
    num_outputs INTEGER DEFAULT 1,
    
    -- Reference strategy
    reference_strategy VARCHAR(20) DEFAULT 'priority-order',
    max_references INTEGER DEFAULT 5,
    primary_reference_ids TEXT[], -- Array of reference IDs to prioritize
    
    -- Quality and style
    quality_modifiers TEXT[],
    style_enhancements TEXT[],
    
    -- Model-specific options
    model_options JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint per costume
    UNIQUE(costume_id)
);

-- Create a separate table for AI reference images
CREATE TABLE IF NOT EXISTS costume_ai_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    costume_id UUID REFERENCES costumes(id) ON DELETE CASCADE,
    
    -- Reference details
    url TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'costume', -- 'costume', 'example', 'background'
    role VARCHAR(20) NOT NULL DEFAULT 'costume', -- 'costume', 'user', 'example'
    priority INTEGER DEFAULT 0,
    description TEXT,
    
    -- Reference metadata
    is_primary BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_costume_ai_generation_enhanced_costume_id ON costume_ai_generation_enhanced(costume_id);
CREATE INDEX IF NOT EXISTS idx_costume_ai_generation_enhanced_model ON costume_ai_generation_enhanced(model);
CREATE INDEX IF NOT EXISTS idx_costume_ai_references_costume_id ON costume_ai_references(costume_id);
CREATE INDEX IF NOT EXISTS idx_costume_ai_references_type ON costume_ai_references(type);
CREATE INDEX IF NOT EXISTS idx_costume_ai_references_priority ON costume_ai_references(priority DESC);

-- Create a function to migrate data from the old JSONB ai_settings to the new schema
CREATE OR REPLACE FUNCTION migrate_ai_settings()
RETURNS VOID AS $$
DECLARE
    costume_record RECORD;
    ai_settings_json JSONB;
    enhanced_prompt_id UUID;
BEGIN
    -- Iterate through all costumes that have ai_settings
    FOR costume_record IN 
        SELECT id, slug, ai_settings 
        FROM costumes 
        WHERE ai_settings IS NOT NULL
    LOOP
        ai_settings_json := costume_record.ai_settings;
        
        -- Insert into enhanced AI generation table
        INSERT INTO costume_ai_generation_enhanced (
            costume_id,
            model,
            seed,
            primary_prompt,
            steps,
            resolution,
            show_explicit_content
        ) VALUES (
            costume_record.id,
            COALESCE((ai_settings_json->>'model')::VARCHAR, 'seedream-v4'),
            (ai_settings_json->>'seed')::INTEGER,
            ai_settings_json->>'prompt',
            COALESCE((ai_settings_json->>'steps')::INTEGER, 30),
            COALESCE((ai_settings_json->>'resolution')::VARCHAR, 'auto'),
            COALESCE((ai_settings_json->>'showExplicitContent')::BOOLEAN, false)
        )
        ON CONFLICT (costume_id) DO UPDATE SET
            model = EXCLUDED.model,
            seed = EXCLUDED.seed,
            primary_prompt = EXCLUDED.primary_prompt,
            steps = EXCLUDED.steps,
            resolution = EXCLUDED.resolution,
            show_explicit_content = EXCLUDED.show_explicit_content,
            updated_at = NOW();
        
        -- Insert reference URLs into the references table
        IF ai_settings_json ? 'referenceUrls' THEN
            INSERT INTO costume_ai_references (
                costume_id,
                url,
                type,
                role,
                priority,
                sort_order
            )
            SELECT 
                costume_record.id,
                value::TEXT,
                'costume',
                'costume',
                ROW_NUMBER() OVER (ORDER BY (ordinality))::INTEGER,
                ROW_NUMBER() OVER (ORDER BY (ordinality))::INTEGER - 1
            FROM json_array_elements_text(ai_settings_json->'referenceUrls') WITH ORDINALITY;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the migration function
SELECT migrate_ai_settings();

-- Create a view to easily query AI settings with references
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

-- Add a comment explaining the migration
COMMENT ON TABLE costume_ai_generation_enhanced IS 'Enhanced AI generation settings with separated prompt columns';
COMMENT ON TABLE costume_ai_references IS 'Individual AI reference images with metadata';
COMMENT ON VIEW costume_ai_settings_view IS 'Convenient view for querying AI settings with references';