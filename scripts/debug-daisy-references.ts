#!/usr/bin/env node

/**
 * Debug script to examine Daisy bodysuit reference configuration
 * and compare with working costumes like Bowsette and Rosalina
 */

import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

const connectionString = process.env.NEON_DATABASE_URL_READONLY ?? process.env.NEON_DATABASE_URL ?? ''

interface DBCostumeRow {
  id: string
  name: string
  slug: string
  category_id: string | null
  description: string | null
  version: string | null
  ai_settings?: any
  created_at: string | Date | null
}

interface DBEnhancedAIGenerationRow {
  id: string
  costume_id: string
  model: string
  seed?: number | null
  primary_prompt?: string | null
  fallback_prompt?: string | null
  negative_prompt?: string | null
  steps?: number | null
  resolution?: string | null
  show_explicit_content?: boolean | null
  num_outputs?: number | null
  reference_strategy?: string | null
  max_references?: number | null
  primary_reference_ids?: string[] | null
  quality_modifiers?: string[] | null
  style_enhancements?: string[] | null
  model_options?: Record<string, unknown> | null
  created_at: string | Date | null
  updated_at: string | Date | null
}

interface DBAIReferenceRow {
  id: string
  costume_id: string
  url: string
  type: string
  role: string
  priority?: number | null
  description?: string | null
  is_primary?: boolean | null
  sort_order?: number | null
  created_at: string | Date | null
  updated_at: string | Date | null
}

interface DBAssetRow {
  id: string
  url: string
  type: string
  description: string | null
  priority: number | null
  sort_order?: number | null
  created_at?: string | Date | null
}

async function debugDaisyReferences() {
  console.log('🔍 Debugging Daisy bodysuit reference configuration')
  console.log('==================================================')
  
  if (!connectionString) {
    console.log('❌ No database connection string available')
    return
  }

  const sql = neon(connectionString)

  try {
    // Get specific costumes to compare
    const costumesToCheck = ['daisy-bodysuit', 'bowsette', 'rosalina']
    
    for (const costumeSlug of costumesToCheck) {
      console.log(`\n📋 Checking costume: ${costumeSlug}`)
      console.log('─'.repeat(50))
      
      // Get costume basic info
      const costumeRows = await sql`
        SELECT id, name, slug, ai_settings
        FROM costumes
        WHERE slug = ${costumeSlug}
        LIMIT 1
      ` as DBCostumeRow[]
      
      if (costumeRows.length === 0) {
        console.log(`❌ Costume ${costumeSlug} not found`)
        continue
      }
      
      const costume = costumeRows[0]
      console.log(`🎭 Costume ID: ${costume.id}`)
      console.log(`📝 Name: ${costume.name}`)
      console.log(`🔗 Slug: ${costume.slug}`)
      
      // Get enhanced AI generation settings
      const aiRows = await sql`
        SELECT *
        FROM costume_ai_generation_enhanced
        WHERE costume_id = ${costume.id}
        LIMIT 1
      ` as DBEnhancedAIGenerationRow[]
      
      if (aiRows.length > 0) {
        const aiSettings = aiRows[0]
        console.log(`\n🤖 AI Generation Settings:`)
        console.log(`  Model: ${aiSettings.model}`)
        console.log(`  Seed: ${aiSettings.seed}`)
        console.log(`  Reference Strategy: ${aiSettings.reference_strategy}`)
        console.log(`  Max References: ${aiSettings.max_references}`)
        console.log(`  Primary Reference IDs: ${JSON.stringify(aiSettings.primary_reference_ids)}`)
        console.log(`  Steps: ${aiSettings.steps}`)
        console.log(`  Resolution: ${aiSettings.resolution}`)
        console.log(`  Show Explicit Content: ${aiSettings.show_explicit_content}`)
        console.log(`  Num Outputs: ${aiSettings.num_outputs}`)
      } else {
        console.log(`\n⚠️ No enhanced AI generation settings found`)
      }
      
      // Get AI references
      const referenceRows = await sql`
        SELECT *
        FROM costume_ai_references
        WHERE costume_id = ${costume.id}
        ORDER BY sort_order ASC, priority DESC
      ` as DBAIReferenceRow[]
      
      console.log(`\n🖼️ AI References (${referenceRows.length}):`)
      referenceRows.forEach((ref, index) => {
        console.log(`  ${index + 1}. ID: ${ref.id}`)
        console.log(`     URL: ${ref.url.split('/').pop()}`)
        console.log(`     Type: ${ref.type}`)
        console.log(`     Role: ${ref.role}`)
        console.log(`     Priority: ${ref.priority}`)
        console.log(`     Is Primary: ${ref.is_primary}`)
        console.log(`     Sort Order: ${ref.sort_order}`)
        console.log(`     Description: ${ref.description || 'None'}`)
        console.log('')
      })
      
      // Get costume assets
      const assetRows = await sql`
        SELECT id, url, type, description, priority, sort_order
        FROM costume_assets
        WHERE costume_id = ${costume.id}
        ORDER BY priority DESC, sort_order ASC, created_at ASC
      ` as DBAssetRow[]
      
      console.log(`\n📁 Costume Assets (${assetRows.length}):`)
      assetRows.forEach((asset, index) => {
        console.log(`  ${index + 1}. ID: ${asset.id}`)
        console.log(`     URL: ${asset.url.split('/').pop()}`)
        console.log(`     Type: ${asset.type}`)
        console.log(`     Priority: ${asset.priority}`)
        console.log(`     Sort Order: ${asset.sort_order}`)
        console.log(`     Description: ${asset.description || 'None'}`)
        console.log('')
      })
      
      // Legacy ai_settings check
      if (costume.ai_settings) {
        console.log(`\n🔧 Legacy AI Settings:`)
        console.log(`  Model: ${costume.ai_settings.model}`)
        console.log(`  Seed: ${costume.ai_settings.seed}`)
        console.log(`  Reference URLs: ${JSON.stringify(costume.ai_settings.referenceUrls || [])}`)
        console.log(`  Steps: ${costume.ai_settings.steps}`)
        console.log(`  Resolution: ${costume.ai_settings.resolution}`)
        console.log(`  Show Explicit Content: ${costume.ai_settings.showExplicitContent}`)
      }
    }
    
    // Test reference building logic
    console.log('\n🧪 Testing Reference Building Logic')
    console.log('─'.repeat(50))
    
    // Import the AI generation service to test reference building
    const { AIGenerationService } = await import('../src/lib/ai/ai-generation-service.ts')
    
    for (const costumeSlug of costumesToCheck) {
      console.log(`\n📋 Testing reference building for: ${costumeSlug}`)
      
      // Get costume with all data
      const costumeRows = await sql`
        SELECT *, ai_settings
        FROM costumes
        WHERE slug = ${costumeSlug}
        LIMIT 1
      ` as any[]
      
      if (costumeRows.length === 0) continue
      
      const costumeRow = costumeRows[0]
      const assets = await sql`
        SELECT id, url, type, description, priority, sort_order
        FROM costume_assets
        WHERE costume_id = ${costumeRow.id}
        ORDER BY priority DESC, sort_order ASC, created_at ASC
      ` as DBAssetRow[]
      
      const enhancedAiRows = await sql`
        SELECT *
        FROM costume_ai_generation_enhanced
        WHERE costume_id = ${costumeRow.id}
        LIMIT 1
      ` as DBEnhancedAIGenerationRow[]
      
      const enhancedAiGeneration = enhancedAiRows[0]
      
      // Build costume object similar to how the service does it
      const costumeV2 = {
        id: costumeRow.id,
        name: costumeRow.name,
        category: costumeRow.category_id?.replace(/^cat_/, '') || 'evergreen',
        description: costumeRow.description || '',
        version: costumeRow.version || '1.0.0',
        assets: assets.map(asset => ({
          id: asset.id,
          url: asset.url,
          type: asset.type as any,
          description: asset.description || undefined,
          priority: asset.priority ?? asset.sort_order ?? 0,
        })),
        colors: costumeRow.colors || {},
        aiGeneration: (enhancedAiGeneration ? {
          model: enhancedAiGeneration.model as 'seedream-v4' | 'google:4@1' | 'background-remover',
          seed: enhancedAiGeneration.seed ?? 1000,
          primaryPrompt: enhancedAiGeneration.primary_prompt ?? '',
          fallbackPrompt: enhancedAiGeneration.fallback_prompt ?? undefined,
          negativePrompt: enhancedAiGeneration.negative_prompt ?? undefined,
          steps: enhancedAiGeneration.steps ?? 30,
          resolution: enhancedAiGeneration.resolution as 'auto' | '1024x1024' | '512x512' | '768x768' ?? 'auto',
          showExplicitContent: enhancedAiGeneration.show_explicit_content ?? false,
          numOutputs: enhancedAiGeneration.num_outputs ?? 1,
          referenceStrategy: enhancedAiGeneration.reference_strategy as 'auto' | 'priority-order' | 'random' | 'best-match' ?? 'priority-order',
          maxReferences: enhancedAiGeneration.max_references ?? 5,
          primaryReferenceIds: enhancedAiGeneration.primary_reference_ids ?? [],
          qualityModifiers: enhancedAiGeneration.quality_modifiers ?? [],
          styleEnhancements: enhancedAiGeneration.style_enhancements ?? [],
          modelOptions: enhancedAiGeneration.model_options ?? {},
        } : {
          model: 'seedream-v4',
          seed: 1000,
          primaryPrompt: '',
          steps: 30,
          resolution: 'auto',
          showExplicitContent: false,
          numOutputs: 1,
          referenceStrategy: 'priority-order' as const,
          maxReferences: 5,
          primaryReferenceIds: [],
          qualityModifiers: [],
          styleEnhancements: [],
          modelOptions: {},
        }) as any,
        transformation: costumeRow.transformation || { base: '' },
        metadata: costumeRow.metadata || {},
        marketing: costumeRow.marketing || {},
        affiliateLinks: costumeRow.affiliate_links || [],
        isActive: true,
        isPremium: false,
        isNew: false,
        isFeatured: false,
        createdAt: costumeRow.created_at?.toString() || '',
        updatedAt: costumeRow.updated_at?.toString() || '',
        aiSettings: costumeRow.ai_settings,
      }
      
      // Test building references with a sample selfie
      const sampleSelfie = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
      
      const debugInfo = AIGenerationService.extractDebugInfo({
        costume: costumeV2,
        selfieBase64: sampleSelfie,
      })
      
      console.log(`  Reference Strategy: ${debugInfo.referenceStrategy}`)
      console.log(`  Max References: ${debugInfo.maxReferences}`)
      console.log(`  Primary Reference IDs: ${JSON.stringify(debugInfo.primaryReferenceIds)}`)
      console.log(`  Model: ${debugInfo.model}`)
      console.log(`  Seed: ${debugInfo.seed}`)
      
      // Build the actual request to see what references would be generated
      const request = AIGenerationService.buildRequest({
        costume: costumeV2,
        selfieBase64: sampleSelfie,
      })
      
      console.log(`\n📸 Generated References (${request.references.length}):`)
      request.references.forEach((ref, index) => {
        console.log(`  ${index + 1}. ID: ${ref.id}`)
        console.log(`     Kind: ${ref.kind}`)
        console.log(`     Role: ${ref.role}`)
        console.log(`     Value: ${ref.value.substring(0, 100)}...`)
        console.log('')
      })
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
    console.error('Stack:', error.stack)
  }
}

async function main() {
  console.log('🔑 Database URL Present:', !!connectionString)
  await debugDaisyReferences()
}

main()