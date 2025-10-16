#!/usr/bin/env node

/**
 * Fix Daisy bodysuit references by adding missing AI references
 * to the costume_ai_references table
 */

import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

const connectionString = process.env.NEON_DATABASE_URL ?? ''

interface DBAssetRow {
  id: string
  url: string
  type: string
  description: string | null
  priority: number | null
  sort_order?: number | null
  created_at?: string | Date | null
}

async function fixDaisyReferences() {
  console.log('🔧 Fixing Daisy bodysuit references')
  console.log('==================================')
  
  if (!connectionString) {
    console.log('❌ No database connection string available')
    return
  }

  const sql = neon(connectionString)

  try {
    // Get Daisy bodysuit costume ID
    const costumeRows = await sql`
      SELECT id, name, slug
      FROM costumes
      WHERE slug = 'daisy-bodysuit'
      LIMIT 1
    `

    if (costumeRows.length === 0) {
      console.log('❌ Daisy bodysuit costume not found')
      return
    }

    const costume = costumeRows[0]
    console.log(`🎭 Found costume: ${costume.name} (${costume.id})`)

    // Get existing AI references
    const existingRefs = await sql`
      SELECT id, url, type, role, priority, sort_order
      FROM costume_ai_references
      WHERE costume_id = ${costume.id}
      ORDER BY sort_order ASC
    `

    console.log(`📸 Existing AI references: ${existingRefs.length}`)
    existingRefs.forEach((ref, index) => {
      console.log(`  ${index + 1}. ${ref.url} (${ref.type}, priority: ${ref.priority})`)
    })

    // Get costume assets that should be AI references
    const assets = await sql`
      SELECT id, url, type, description, priority, sort_order
      FROM costume_assets
      WHERE costume_id = ${costume.id}
      ORDER BY priority DESC, sort_order ASC
    ` as DBAssetRow[]

    console.log(`\n📁 Costume assets: ${assets.length}`)
    assets.forEach((asset, index) => {
      console.log(`  ${index + 1}. ${asset.url} (${asset.type}, priority: ${asset.priority})`)
    })

    // Identify assets that should be AI references but aren't
    const existingUrls = new Set(existingRefs.map(ref => ref.url))
    const missingAssets = assets.filter(asset => !existingUrls.has(asset.url))

    console.log(`\n🔍 Missing AI references: ${missingAssets.length}`)
    missingAssets.forEach((asset, index) => {
      console.log(`  ${index + 1}. ${asset.url} (${asset.type}, priority: ${asset.priority})`)
    })

    if (missingAssets.length === 0) {
      console.log('✅ All assets are already AI references')
      return
    }

    // Add missing AI references
    console.log(`\n➕ Adding ${missingAssets.length} missing AI references...`)
    
    for (const asset of missingAssets) {
      const nextSortOrder = existingRefs.length + missingAssets.indexOf(asset) + 1
      
      await sql`
        INSERT INTO costume_ai_references (
          costume_id, 
          url, 
          type, 
          role, 
          priority, 
          description, 
          sort_order
        ) VALUES (
          ${costume.id}, 
          ${asset.url}, 
          ${asset.type}, 
          'costume', 
          ${asset.priority || 0}, 
          ${asset.description}, 
          ${nextSortOrder}
        )
      `
      
      console.log(`  ✅ Added: ${asset.url}`)
    }

    // Verify the fix
    const updatedRefs = await sql`
      SELECT id, url, type, role, priority, sort_order
      FROM costume_ai_references
      WHERE costume_id = ${costume.id}
      ORDER BY sort_order ASC
    `

    console.log(`\n✅ Updated AI references: ${updatedRefs.length}`)
    updatedRefs.forEach((ref, index) => {
      console.log(`  ${index + 1}. ${ref.url} (${ref.type}, priority: ${ref.priority}, sort_order: ${ref.sort_order})`)
    })

    console.log('\n🎉 Daisy bodysuit references fixed successfully!')

  } catch (error) {
    console.error('❌ Fix failed:', error)
    console.error('Stack:', error instanceof Error ? error.stack : String(error))
  }
}

async function main() {
  console.log('🔑 Database URL Present:', !!connectionString)
  await fixDaisyReferences()
}

main()