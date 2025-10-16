#!/usr/bin/env bun
/**
 * Script to verify production database has the enhanced AI schema
 * Run this script to check if your production Neon database has the required tables
 */

import { neon } from '@neondatabase/serverless'

const connectionString = process.env.NEON_DATABASE_URL ?? process.env.NEON_DATABASE_URL_READONLY ?? ''

if (!connectionString) {
  console.error('❌ NEON_DATABASE_URL environment variable is required')
  process.exit(1)
}

const sql = neon(connectionString)

async function verifySchema() {
  console.log('🔍 Verifying production database schema...\n')

  try {
    // Check if enhanced tables exist
    const tablesCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('costume_ai_generation_enhanced', 'costume_ai_references')
      ORDER BY table_name
    `

    console.log('📋 Tables found:')
    if (tablesCheck.length === 0) {
      console.log('  ❌ No enhanced AI tables found')
    } else {
      tablesCheck.forEach(row => {
        console.log(`  ✅ ${row.table_name}`)
      })
    }

    // Check if basic ai_settings column exists
    const aiSettingsCheck = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'costumes' 
      AND column_name = 'ai_settings'
    `

    console.log('\n📋 AI Settings column:')
    if (aiSettingsCheck.length === 0) {
      console.log('  ❌ ai_settings column not found in costumes table')
    } else {
      console.log(`  ✅ ai_settings (${aiSettingsCheck[0].data_type})`)
    }

    // Count records in enhanced tables
    if (tablesCheck.some(t => t.table_name === 'costume_ai_generation_enhanced')) {
      const enhancedCount = await sql`SELECT COUNT(*) as count FROM costume_ai_generation_enhanced`
      console.log(`\n📊 Enhanced AI Generation records: ${enhancedCount[0].count}`)
    }

    if (tablesCheck.some(t => t.table_name === 'costume_ai_references')) {
      const referencesCount = await sql`SELECT COUNT(*) as count FROM costume_ai_references`
      console.log(`📊 AI References records: ${referencesCount[0].count}`)
    }

    // Sample a few costumes to check their AI settings
    const sampleCostumes = await sql`
      SELECT id, name, ai_settings, 
             EXISTS(SELECT 1 FROM costume_ai_generation_enhanced WHERE costume_id = costumes.id) as has_enhanced,
             EXISTS(SELECT 1 FROM costume_ai_references WHERE costume_id = costumes.id) as has_references
      FROM costumes 
      WHERE is_active = true 
      ORDER BY created_at DESC 
      LIMIT 3
    `

    console.log('\n🎭 Sample costumes:')
    sampleCostumes.forEach(costume => {
      const hasAiSettings = costume.ai_settings !== null
      const hasEnhanced = costume.has_enhanced
      const hasReferences = costume.has_references
      
      console.log(`  📝 ${costume.name}`)
      console.log(`     - ai_settings: ${hasAiSettings ? '✅' : '❌'}`)
      console.log(`     - enhanced table: ${hasEnhanced ? '✅' : '❌'}`)
      console.log(`     - references: ${hasReferences ? '✅' : '❌'}`)
    })

    // Final assessment
    console.log('\n🎯 Schema Assessment:')
    const hasAllTables = tablesCheck.length === 2
    const hasAiSettingsColumn = aiSettingsCheck.length > 0
    
    if (hasAllTables && hasAiSettingsColumn) {
      console.log('  ✅ Production database has the complete enhanced AI schema')
      console.log('  🚀 Your tuned prompts should work correctly!')
    } else if (hasAiSettingsColumn) {
      console.log('  ⚠️  Production database has basic ai_settings but missing enhanced tables')
      console.log('  💡 Run the enhanced schema migration to get full functionality')
    } else {
      console.log('  ❌ Production database is missing AI schema entirely')
      console.log('  🚨 Run both migrations: 2025-10-16-add-ai-settings.sql and 2025-10-16-enhance-ai-settings-schema.sql')
    }

  } catch (error) {
    console.error('❌ Error verifying schema:', error)
    process.exit(1)
  }
}

// Run the verification
verifySchema().catch(console.error)