import { neon } from '@neondatabase/serverless'

const createSqlClient = () => {
  const url = process.env.NEON_DATABASE_URL
  if (!url) {
    throw new Error('NEON_DATABASE_URL is not set')
  }
  return neon(url)
}

const main = async () => {
  console.log('🔧 Creating costume_ai_generation table...')
  
  const sql = createSqlClient()
  
  try {
    // Create the table
    await sql`
      CREATE TABLE IF NOT EXISTS costume_ai_generation (
        id TEXT PRIMARY KEY,
        costume_id TEXT UNIQUE NOT NULL,
        model TEXT NOT NULL DEFAULT 'seedream-v4',
        seed INTEGER NOT NULL DEFAULT 1000,
        primary_prompt TEXT NOT NULL,
        fallback_prompt TEXT,
        negative_prompt TEXT,
        steps INTEGER NOT NULL DEFAULT 30,
        resolution TEXT NOT NULL DEFAULT 'auto',
        show_explicit_content BOOLEAN NOT NULL DEFAULT false,
        num_outputs INTEGER NOT NULL DEFAULT 1,
        reference_strategy TEXT NOT NULL DEFAULT 'priority-order',
        max_references INTEGER NOT NULL DEFAULT 5,
        primary_reference_ids TEXT[] DEFAULT '{}',
        quality_modifiers TEXT[] DEFAULT '{}',
        style_enhancements TEXT[] DEFAULT '{}',
        model_options JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    
    console.log('✅ Table created successfully')
    
    // Add priority column to costume_assets if it doesn't exist
    try {
      await sql`
        ALTER TABLE costume_assets 
        ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0
      `
      console.log('✅ Priority column added to costume_assets')
    } catch (error) {
      console.log('⚠️ Priority column may already exist:', error)
    }
    
    console.log('🎉 Database setup completed!')
    
  } catch (error) {
    console.error('❌ Failed to create table:', error)
    process.exitCode = 1
  }
}

main()