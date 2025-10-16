#!/usr/bin/env bun

import { neon } from '@neondatabase/serverless'

const createSqlClient = () => {
  const url = process.env.NEON_DATABASE_URL ?? process.env.NEON_DATABASE_URL_READONLY
  if (!url) {
    throw new Error('NEON_DATABASE_URL is not set')
  }
  return neon(url)
}

const createEnhancedTables = async () => {
  console.log('🔧 Creating enhanced AI settings tables...')
  
  const sql = createSqlClient()
  
  try {
    // Create enhanced AI generation table
    await sql`
      CREATE TABLE IF NOT EXISTS costume_ai_generation_enhanced (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          costume_id TEXT REFERENCES costumes(id) ON DELETE CASCADE,
          
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
          primary_reference_ids TEXT[],
          
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
      )
    `
    
    console.log('✅ Created costume_ai_generation_enhanced table')
    
    // Create AI references table
    await sql`
      CREATE TABLE IF NOT EXISTS costume_ai_references (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          costume_id TEXT REFERENCES costumes(id) ON DELETE CASCADE,
          
          -- Reference details
          url TEXT NOT NULL,
          type VARCHAR(20) NOT NULL DEFAULT 'costume',
          role VARCHAR(20) NOT NULL DEFAULT 'costume',
          priority INTEGER DEFAULT 0,
          description TEXT,
          
          -- Reference metadata
          is_primary BOOLEAN DEFAULT false,
          sort_order INTEGER DEFAULT 0,
          
          -- Timestamps
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    
    console.log('✅ Created costume_ai_references table')
    
    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_costume_ai_generation_enhanced_costume_id 
      ON costume_ai_generation_enhanced(costume_id)
    `
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_costume_ai_references_costume_id 
      ON costume_ai_references(costume_id)
    `
    
    console.log('✅ Created indexes')
    
    // Migrate data from existing ai_settings
    console.log('🔄 Migrating data from existing ai_settings...')
    
    const costumesWithSettings = await sql`
      SELECT id, slug, ai_settings 
      FROM costumes 
      WHERE ai_settings IS NOT NULL
    `
    
    console.log(`📋 Found ${costumesWithSettings.length} costumes with AI settings`)
    
    for (const costume of costumesWithSettings) {
      const aiSettings = costume.ai_settings as any
      
      // Insert into enhanced table
      await sql`
        INSERT INTO costume_ai_generation_enhanced (
          costume_id, model, seed, primary_prompt, steps, resolution, show_explicit_content
        ) VALUES (
          ${costume.id}, 
          ${aiSettings.model || 'seedream-v4'}, 
          ${aiSettings.seed}, 
          ${aiSettings.prompt}, 
          ${aiSettings.steps || 30}, 
          ${aiSettings.resolution || 'auto'}, 
          ${aiSettings.showExplicitContent || false}
        )
        ON CONFLICT (costume_id) DO UPDATE SET
          model = EXCLUDED.model,
          seed = EXCLUDED.seed,
          primary_prompt = EXCLUDED.primary_prompt,
          steps = EXCLUDED.steps,
          resolution = EXCLUDED.resolution,
          show_explicit_content = EXCLUDED.show_explicit_content,
          updated_at = NOW()
      `
      
      // Insert reference URLs
      if (aiSettings.referenceUrls && Array.isArray(aiSettings.referenceUrls)) {
        for (let i = 0; i < aiSettings.referenceUrls.length; i++) {
          await sql`
            INSERT INTO costume_ai_references (
              costume_id, url, type, role, priority, sort_order
            ) VALUES (
              ${costume.id}, 
              ${aiSettings.referenceUrls[i]}, 
              'costume', 
              'costume', 
              ${i + 1}, 
              ${i}
            )
          `
        }
      }
    }
    
    console.log('✅ Data migration completed')
    
    // Verify the migration
    const enhancedCount = await sql`
      SELECT COUNT(*) as count FROM costume_ai_generation_enhanced
    `
    
    const referencesCount = await sql`
      SELECT COUNT(*) as count FROM costume_ai_references
    `
    
    console.log(`📊 Enhanced AI settings: ${enhancedCount[0].count} records`)
    console.log(`🖼️ AI references: ${referencesCount[0].count} records`)
    
  } catch (error) {
    console.error('❌ Failed to create enhanced tables:', error)
    throw error
  }
}

createEnhancedTables().catch(error => {
  console.error('❌ Table creation failed:', error)
  process.exit(1)
})