import { promises as fs } from 'fs'
import * as path from 'path'

interface CostumeScriptSettings {
  id: string
  model: string
  seed: number
  primaryPrompt: string
  negativePrompt?: string
  steps: number
  resolution: string
  showExplicitContent: boolean
  numOutputs: number
  referenceStrategy: string
  maxReferences: number
  primaryReferenceIds: string[]
  qualityModifiers: string[]
  styleEnhancements: string[]
  modelOptions: Record<string, unknown>
  costumeUrls: string[]
}

/**
 * Extract AI generation settings from costume script files
 */
async function extractSettingsFromScript(scriptPath: string): Promise<CostumeScriptSettings | null> {
  try {
    const content = await fs.readFile(scriptPath, 'utf-8')
    
    // Extract costume ID from filename
    const costumeId = path.basename(scriptPath, '.js').replace('00-', '')
    
    // Extract model selection
    const modelMatch = content.match(/const selectedModel = .+? \|\| '([^']+)'/)
    const model = modelMatch?.[1] || 'seedream-v4'
    
    // Extract seed from costumeSeeds mapping
    const seedMatch = content.match(new RegExp(`'${costumeId}': (\\d+)`))
    const seed = seedMatch ? parseInt(seedMatch[1]) : 1000
    
    // Extract prompt text
    const promptMatch = content.match(/const promptText = `([^`]+)`/s)
    const primaryPrompt = promptMatch ? promptMatch[1].trim() : ''
    
    // Extract negative prompt
    const negativePromptMatch = content.match(/negative_prompt: '([^']+)'/)
    const negativePrompt = negativePromptMatch?.[1]
    
    // Extract generation settings
    const stepsMatch = content.match(/steps: (\d+)/)
    const steps = stepsMatch ? parseInt(stepsMatch[1]) : 30
    
    const resolutionMatch = content.match(/resolution: "([^"]+)"/)
    const resolution = resolutionMatch?.[1] || 'auto'
    
    const explicitMatch = content.match(/showExplicitContent: (true|false)/)
    const showExplicitContent = explicitMatch?.[1] === 'true'
    
    // Extract costume URLs
    const urlMatches = content.match(/const costumeUrls = \[([^\]]+)\]/s)
    const costumeUrls: string[] = []
    
    if (urlMatches) {
      const urlsText = urlMatches[1]
      const urlRegex = /'([^']+)'/g
      let match
      while ((match = urlRegex.exec(urlsText)) !== null) {
        costumeUrls.push(match[1])
      }
    }
    
    // Extract primary reference IDs from URLs
    const primaryReferenceIds = costumeUrls.map(url => {
      const filename = url.split('/').pop() || ''
      return filename.replace(/\.(png|jpg|jpeg)$/i, '')
    })
    
    // Extract quality modifiers and style enhancements from prompt
    const qualityModifiers: string[] = []
    const styleEnhancements: string[] = []
    
    // Look for common quality and style keywords in the prompt
    const qualityKeywords = ['photorealistic', 'high detail', 'sharp focus', '8K', 'studio lighting', 'color accuracy']
    const styleKeywords = ['dramatic', 'cinematic', 'soft lighting', 'hyper-detailed', 'vibrant']
    
    qualityKeywords.forEach(keyword => {
      if (primaryPrompt.toLowerCase().includes(keyword.toLowerCase())) {
        qualityModifiers.push(keyword)
      }
    })
    
    styleKeywords.forEach(keyword => {
      if (primaryPrompt.toLowerCase().includes(keyword.toLowerCase())) {
        styleEnhancements.push(keyword)
      }
    })
    
    return {
      id: costumeId,
      model,
      seed,
      primaryPrompt,
      negativePrompt,
      steps,
      resolution,
      showExplicitContent,
      numOutputs: 1,
      referenceStrategy: 'priority-order',
      maxReferences: costumeUrls.length || 5,
      primaryReferenceIds,
      qualityModifiers,
      styleEnhancements,
      modelOptions: {},
      costumeUrls,
    }
  } catch (error) {
    console.error(`Failed to extract settings from ${scriptPath}:`, error)
    return null
  }
}

/**
 * Extract settings from all costume scripts in the scripts directory
 */
async function extractAllCostumeSettings(): Promise<CostumeScriptSettings[]> {
  const scriptsDir = __dirname // Fixed: use current directory instead of parent
  const scriptFiles = await fs.readdir(scriptsDir)
  
  const costumeScripts = scriptFiles.filter(file => 
    file.startsWith('00-') && file.endsWith('.js')
  )
  
  console.log(`Found ${costumeScripts.length} costume scripts:`, costumeScripts)
  
  const settings: CostumeScriptSettings[] = []
  
  for (const scriptFile of costumeScripts) {
    const scriptPath = path.join(scriptsDir, scriptFile)
    const scriptSettings = await extractSettingsFromScript(scriptPath)
    
    if (scriptSettings) {
      settings.push(scriptSettings)
      console.log(`✅ Extracted settings for: ${scriptSettings.id}`)
    } else {
      console.log(`❌ Failed to extract settings from: ${scriptFile}`)
    }
  }
  
  return settings
}

/**
 * Generate SQL INSERT statements for the extracted settings
 */
function generateSQLInserts(settings: CostumeScriptSettings[]): string {
  const inserts: string[] = []
  
  for (const setting of settings) {
    const escapedPrompt = setting.primaryPrompt.replace(/'/g, "''")
    const escapedNegativePrompt = setting.negativePrompt?.replace(/'/g, "''") || ''
    
    inserts.push(`
INSERT INTO costume_ai_generation (
  id, costume_id, model, seed, primary_prompt, negative_prompt, 
  steps, resolution, show_explicit_content, num_outputs, 
  reference_strategy, max_references, primary_reference_ids,
  quality_modifiers, style_enhancements, model_options, created_at, updated_at
) VALUES (
  '${setting.id}-ai-gen',
  '${setting.id}',
  '${setting.model}',
  ${setting.seed},
  '${escapedPrompt}',
  ${escapedNegativePrompt ? `'${escapedNegativePrompt}'` : 'NULL'},
  ${setting.steps},
  '${setting.resolution}',
  ${setting.showExplicitContent},
  ${setting.numOutputs},
  '${setting.referenceStrategy}',
  ${setting.maxReferences},
  ARRAY[${setting.primaryReferenceIds.map(id => `'${id}'`).join(', ')}],
  ARRAY[${setting.qualityModifiers.map(m => `'${m}'`).join(', ')}],
  ARRAY[${setting.styleEnhancements.map(m => `'${m}'`).join(', ')}],
  '{}',
  NOW(),
  NOW()
) ON CONFLICT (costume_id) DO UPDATE SET
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
  updated_at = NOW();`)
  }
  
  return inserts.join('\n')
}

/**
 * Generate TypeScript types for the extracted settings
 */
function generateTypesFile(settings: CostumeScriptSettings[]): string {
  const costumeSettings: Record<string, any> = {}
  
  for (const setting of settings) {
    costumeSettings[setting.id] = {
      model: setting.model,
      seed: setting.seed,
      primaryPrompt: setting.primaryPrompt.substring(0, 100) + '...',
      negativePrompt: setting.negativePrompt,
      steps: setting.steps,
      resolution: setting.resolution,
      showExplicitContent: setting.showExplicitContent,
      maxReferences: setting.maxReferences,
      primaryReferenceIds: setting.primaryReferenceIds,
      costumeUrls: setting.costumeUrls,
    }
  }
  
  return `// Auto-generated costume settings from scripts
// Generated on: ${new Date().toISOString()}

export const EXTRACTED_COSTUME_SETTINGS = ${JSON.stringify(costumeSettings, null, 2)} as const;

export type CostumeScriptSettings = {
  model: string;
  seed: number;
  primaryPrompt: string;
  negativePrompt?: string;
  steps: number;
  resolution: string;
  showExplicitContent: boolean;
  maxReferences: number;
  primaryReferenceIds: string[];
  costumeUrls: string[];
};
`
}

/**
 * Main execution function
 */
async function main() {
  console.log('🔍 Extracting costume settings from scripts...')
  
  try {
    const settings = await extractAllCostumeSettings()
    
    if (settings.length === 0) {
      console.log('❌ No costume settings found')
      return
    }
    
    console.log(`\n✅ Successfully extracted settings for ${settings.length} costumes:`)
    settings.forEach(setting => {
      console.log(`  - ${setting.id}: seed=${setting.seed}, model=${setting.model}, urls=${setting.costumeUrls.length}`)
    })
    
    // Generate SQL file
    const sqlContent = generateSQLInserts(settings)
    await fs.writeFile('./extracted-costume-settings.sql', sqlContent)
    console.log(`\n💾 SQL file saved to: ./extracted-costume-settings.sql`)
    
    // Generate TypeScript types file
    const typesContent = generateTypesFile(settings)
    await fs.writeFile('./src/types/extracted-costume-settings.ts', typesContent)
    console.log(`📝 TypeScript types saved to: ./src/types/extracted-costume-settings.ts`)
    
    // Generate JSON summary
    await fs.writeFile('./extracted-costume-settings.json', JSON.stringify(settings, null, 2))
    console.log(`📄 JSON summary saved to: ./extracted-costume-settings.json`)
    
    console.log('\n🎉 Extraction completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Run the SQL file to update your database')
    console.log('2. Test the new AI generation service')
    console.log('3. Update remaining costumes that don\'t have scripts yet')
    
  } catch (error) {
    console.error('❌ Extraction failed:', error)
    process.exitCode = 1
  }
}

// Run the extraction
main()