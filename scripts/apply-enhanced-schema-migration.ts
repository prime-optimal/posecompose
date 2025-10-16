#!/usr/bin/env bun

import { neon } from '@neondatabase/serverless'

const createSqlClient = () => {
  const url = process.env.NEON_DATABASE_URL ?? process.env.NEON_DATABASE_URL_READONLY
  if (!url) {
    throw new Error('NEON_DATABASE_URL is not set')
  }
  return neon(url)
}

const applyEnhancedSchemaMigration = async () => {
  console.log('🔧 Applying enhanced AI settings schema migration...')
  
  const sql = createSqlClient()
  const fs = await import('fs')
  const path = await import('path')
  
  try {
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'db/migrations/2025-10-16-enhance-ai-settings-schema.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')
    
    // Execute the migration by splitting into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    for (const statement of statements) {
      if (statement.trim()) {
        await sql.unsafe(statement)
      }
    }
    
    console.log('✅ Enhanced AI settings schema migration applied successfully')
    
    // Verify the migration by checking the new tables
    const enhancedTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('costume_ai_generation_enhanced', 'costume_ai_references')
    `
    
    console.log('📊 Created tables:', enhancedTables.map(t => t.table_name))
    
    // Check if data was migrated
    const migratedCount = await sql`
      SELECT COUNT(*) as count 
      FROM costume_ai_generation_enhanced
    `
    
    console.log(`📋 Migrated ${migratedCount[0].count} AI generation settings`)
    
    const referencesCount = await sql`
      SELECT COUNT(*) as count 
      FROM costume_ai_references
    `
    
    console.log(`🖼️ Migrated ${referencesCount[0].count} AI reference images`)
    
  } catch (error) {
    console.error('❌ Failed to apply enhanced schema migration:', error)
    throw error
  }
}

applyEnhancedSchemaMigration().catch(error => {
  console.error('❌ Migration failed:', error)
  process.exit(1)
})