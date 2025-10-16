#!/usr/bin/env bun

import { neon } from '@neondatabase/serverless'

const createSqlClient = () => {
  const url = process.env.NEON_DATABASE_URL
  if (!url) {
    throw new Error('NEON_DATABASE_URL is not set')
  }
  return neon(url)
}

const applyMigration = async () => {
  const sql = createSqlClient()
  
  console.log('🔧 Applying migration: Adding ai_settings column to costumes table...')
  
  try {
    await sql`ALTER TABLE costumes ADD COLUMN IF NOT EXISTS ai_settings JSONB DEFAULT NULL;`
    console.log('✅ Migration applied successfully')
  } catch (error) {
    console.error('❌ Failed to apply migration:', error)
    throw error
  }
}

applyMigration().catch(error => {
  console.error('Migration failed:', error)
  process.exit(1)
})