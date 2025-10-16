import { neon } from '@neondatabase/serverless'
import { promises as fs } from 'fs'

const createSqlClient = () => {
  const url = process.env.NEON_DATABASE_URL
  if (!url) {
    throw new Error('NEON_DATABASE_URL is not set')
  }
  return neon(url)
}

const main = async () => {
  console.log('💾 Inserting AI generation settings into database...')
  
  const sql = createSqlClient()
  
  try {
    // Load the extracted settings
    const extractedSettings = JSON.parse(await fs.readFile('./extracted-costume-settings.json', 'utf-8'))
    
    console.log(`Found ${extractedSettings.length} costumes to insert`)
    
    for (const settings of extractedSettings) {
      console.log(`Inserting settings for: ${settings.id}`)
      
      const escapedPrompt = settings.primaryPrompt.replace(/'/g, "''")
      const escapedNegativePrompt = settings.negativePrompt?.replace(/'/g, "''") || ''
      
      await sql`
        INSERT INTO costume_ai_generation (
          id, costume_id, model, seed, primary_prompt, negative_prompt, 
          steps, resolution, show_explicit_content, num_outputs, 
          reference_strategy, max_references, primary_reference_ids,
          quality_modifiers, style_enhancements, model_options, updated_at
        )
        VALUES (
          ${settings.id}-ai-gen,
          ${settings.id},
          ${settings.model},
          ${settings.seed},
          ${escapedPrompt},
          ${escapedNegativePrompt ? escapedNegativePrompt : null},
          ${settings.steps},
          ${settings.resolution},
          ${settings.showExplicitContent},
          ${settings.numOutputs},
          ${settings.referenceStrategy},
          ${settings.maxReferences},
          ${settings.primaryReferenceIds},
          ${settings.qualityModifiers},
          ${settings.styleEnhancements},
          ${JSON.stringify(settings.modelOptions)}::jsonb,
          NOW()
        )
        ON CONFLICT (costume_id) DO UPDATE SET
          model = EXCLUDED.model,
          seed = EXCLUDED.seed,
          primary_prompt = EXCLUDED.primary_prompt,
          negative_prompt = EXCLUDED.negative_prompt,
          steps = EXCLUDED.steps,
          resolution = EXCLUDED.resolution,
          show_explicit_content = EXCLUDED.show_explicit_content,
          num_outputs = EXCLUDED.num_outputs,
          reference_strategy = EXCLUDED.reference_strategy,
          max_references = EXCLUDED.max_references,
          primary_reference_ids = EXCLUDED.primary_reference_ids,
          quality_modifiers = EXCLUDED.quality_modifiers,
          style_enhancements = EXCLUDED.style_enhancements,
          model_options = EXCLUDED.model_options,
          updated_at = NOW()
      `
      
      console.log(`✅ Inserted settings for: ${settings.id}`)
    }
    
    // Update asset priorities
    console.log('\n🔄 Updating asset priorities...')
    
    const assetUpdates = [
      // Rosalina assets
      { costumeId: 'rosalina', urlPattern: '%rosalina-blurred%', priority: 1 },
      { costumeId: 'rosalina', urlPattern: '%rosalina-crown%', priority: 2 },
      
      // Daisy bodysuit assets
      { costumeId: 'daisy-bodysuit', urlPattern: '%daisy-bodysuit-blurred%', priority: 1 },
      
      // Bowsette assets
      { costumeId: 'bowsette', urlPattern: '%bowsette-blurred%', priority: 1 },
      { costumeId: 'bowsette', urlPattern: '%bowsette-crown%', priority: 2 },
      { costumeId: 'bowsette', urlPattern: '%bowsette-horns%', priority: 3 },
      { costumeId: 'bowsette', urlPattern: '%bowsette-wig%', priority: 4 },
    ]
    
    for (const update of assetUpdates) {
      await sql`
        UPDATE costume_assets 
        SET priority = ${update.priority}
        WHERE costume_id = ${update.costumeId} 
        AND url LIKE ${update.urlPattern}
      `
      
      console.log(`✅ Updated priority for: ${update.costumeId} (${update.urlPattern})`)
    }
    
    console.log('\n🎉 All settings inserted successfully!')
    
  } catch (error) {
    console.error('❌ Failed to insert settings:', error)
    process.exitCode = 1
  }
}

main()