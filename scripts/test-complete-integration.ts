import { promises as fs } from 'fs'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import { AIGenerationService } from '../src/lib/ai/ai-generation-service'
import type { CostumePresetV2, CostumeAIGeneration } from '../src/types/costume-v2'

// Test configuration
const TEST_COSTUMES = ['rosalina', 'bowsette', 'daisy-bodysuit']
const TEST_SELFIE_PATH = '/Users/ryan/working/posecompose/test-input/11.jpeg'

interface TestResults {
  extractionResults: any[]
  databaseResults: any[]
  serviceResults: any[]
  comparisonResults: any[]
  summary: {
    totalTests: number
    passedTests: number
    failedTests: number
    issues: string[]
  }
}

/**
 * Create a test costume with AI generation settings
 */
function createTestCostumeWithSettings(id: string, settings: any): CostumePresetV2 {
  return {
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1).replace('-', ' '),
    category: 'test',
    description: `Test costume for ${id}`,
    version: '1.0.0',
    assets: settings.costumeUrls.map((url: string, index: number) => ({
      id: `${id}-asset-${index}`,
      url,
      type: 'detail' as const,
      description: `${id} reference image ${index + 1}`,
    })),
    colors: {
      primary: '#FF69B4',
      secondary: '#FFE066',
      accent: '#6C5CE7',
      palette: ['#FF69B4', '#FFE066', '#6C5CE7'],
    },
    aiGeneration: {
      model: settings.model,
      seed: settings.seed,
      primaryPrompt: settings.primaryPrompt,
      negativePrompt: settings.negativePrompt,
      steps: settings.steps,
      resolution: settings.resolution,
      showExplicitContent: settings.showExplicitContent,
      numOutputs: settings.numOutputs,
      referenceStrategy: settings.referenceStrategy,
      maxReferences: settings.maxReferences,
      primaryReferenceIds: settings.primaryReferenceIds,
      qualityModifiers: settings.qualityModifiers,
      styleEnhancements: settings.styleEnhancements,
      modelOptions: settings.modelOptions,
    },
    transformation: {
      base: settings.primaryPrompt,
      variations: [],
      negativePrompts: settings.negativePrompt ? [settings.negativePrompt] : [],
      qualityModifiers: settings.qualityModifiers,
      detailEnhancements: settings.styleEnhancements,
    },
    metadata: {
      difficulty: 'medium' as const,
      tags: ['test'],
      compatibleModels: [settings.model],
      estimatedProcessingTime: 45,
      season: 'evergreen',
      popularityScore: 7,
    },
    marketing: {
      displayName: settings.id.charAt(0).toUpperCase() + settings.id.slice(1).replace('-', ' '),
      shortDescription: `Test costume for ${settings.id}`,
      socialPreview: `Test transformation for ${settings.id}`,
      callToAction: `Generate ${settings.id} look`,
    },
    affiliateLinks: [],
    isActive: true,
    isPremium: false,
    isNew: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Test extraction of settings from scripts
 */
async function testExtraction(): Promise<any[]> {
  console.log('\n🧪 Testing extraction of costume settings from scripts...')
  
  const results: any[] = []
  
  try {
    // Load the extracted settings from JSON
    const extractedSettings = JSON.parse(await fs.readFile('./extracted-costume-settings.json', 'utf-8'))
    
    for (const costumeId of TEST_COSTUMES) {
      const settings = extractedSettings.find((s: any) => s.id === costumeId)
      
      if (!settings) {
        results.push({
          costumeId,
          status: 'failed',
          error: 'Settings not found in extracted data',
        })
        continue
      }
      
      // Validate extracted settings
      const validations = [
        { field: 'model', expected: 'seedream-v4', actual: settings.model },
        { field: 'seed', expected: 'number', actual: typeof settings.seed },
        { field: 'primaryPrompt', expected: 'string', actual: typeof settings.primaryPrompt },
        { field: 'costumeUrls', expected: 'array', actual: Array.isArray(settings.costumeUrls) },
        { field: 'primaryReferenceIds', expected: 'array', actual: Array.isArray(settings.primaryReferenceIds) },
      ]
      
      const failedValidations = validations.filter(v => {
        if (v.field === 'model') return v.actual !== v.expected
        if (v.field === 'seed') return v.actual !== v.expected
        return v.actual !== v.expected
      })
      
      results.push({
        costumeId,
        status: failedValidations.length === 0 ? 'passed' : 'failed',
        validations,
        failedValidations,
        settings,
      })
    }
  } catch (error) {
    results.push({
      status: 'failed',
      error: `Failed to load extracted settings: ${error}`,
    })
  }
  
  return results
}

/**
 * Test database schema and queries
 */
async function testDatabase(): Promise<any[]> {
  console.log('\n🗄️ Testing database schema and queries...')
  
  const results: any[] = []
  
  try {
    // Check if NEON_DATABASE_URL is available
    const dbUrl = process.env.NEON_DATABASE_URL
    if (!dbUrl) {
      results.push({
        status: 'skipped',
        error: 'NEON_DATABASE_URL not available',
      })
      return results
    }
    
    const sql = neon(dbUrl)
    
    // Test if costume_ai_generation table exists
    try {
      await sql`SELECT 1 FROM costume_ai_generation LIMIT 1`
      results.push({
        test: 'table_exists',
        status: 'passed',
        message: 'costume_ai_generation table exists',
      })
    } catch (error) {
      results.push({
        test: 'table_exists',
        status: 'failed',
        error: `costume_ai_generation table does not exist: ${error}`,
      })
      return results
    }
    
    // Test if we can query AI generation settings
    for (const costumeId of TEST_COSTUMES) {
      try {
        const rows = await sql`
          SELECT * FROM costume_ai_generation WHERE costume_id = ${costumeId}
        `
        
        if (rows.length === 0) {
          results.push({
            test: 'query_settings',
            costumeId,
            status: 'failed',
            error: 'No AI generation settings found in database',
          })
        } else {
          const settings = rows[0]
          results.push({
            test: 'query_settings',
            costumeId,
            status: 'passed',
            settings: {
              model: settings.model,
              seed: settings.seed,
              hasPrompt: !!settings.primary_prompt,
              hasNegativePrompt: !!settings.negative_prompt,
              steps: settings.steps,
              resolution: settings.resolution,
              showExplicitContent: settings.show_explicit_content,
            },
          })
        }
      } catch (error) {
        results.push({
          test: 'query_settings',
          costumeId,
          status: 'failed',
          error: `Failed to query settings: ${error}`,
        })
      }
    }
  } catch (error) {
    results.push({
      status: 'failed',
      error: `Database test failed: ${error}`,
    })
  }
  
  return results
}

/**
 * Test AI generation service
 */
async function testAIGenerationService(): Promise<any[]> {
  console.log('\n🤖 Testing AI generation service...')
  
  const results: any[] = []
  
  try {
    // Load the extracted settings
    const extractedSettings = JSON.parse(await fs.readFile('./extracted-costume-settings.json', 'utf-8'))
    
    // Load test selfie
    let selfieBase64: string | null = null
    try {
      const selfieBuffer = await fs.readFile(TEST_SELFIE_PATH)
      selfieBase64 = selfieBuffer.toString('base64')
    } catch (error) {
      console.warn(`Could not load test selfie: ${error}`)
    }
    
    for (const costumeId of TEST_COSTUMES) {
      const settings = extractedSettings.find((s: any) => s.id === costumeId)
      
      if (!settings) {
        results.push({
          test: 'service_build_request',
          costumeId,
          status: 'failed',
          error: 'Settings not found in extracted data',
        })
        continue
      }
      
      // Create test costume with settings
      const testCostume = createTestCostumeWithSettings(costumeId, settings)
      
      try {
        // Test building AI generation request
        const request = AIGenerationService.buildRequest({
          costume: testCostume,
          selfieBase64,
          selfieMimeType: 'image/jpeg',
          model: 'seedream-v4',
          includeFallback: false,
        })
        
        // Validate the generated request
        const validations = [
          { field: 'model', expected: settings.model, actual: request.model },
          { field: 'prompt', expected: settings.primaryPrompt, actual: request.prompt },
          { field: 'hasReferences', expected: true, actual: request.references.length > 0 },
          { field: 'hasSeed', expected: true, actual: !!request.options?.seed },
          { field: 'seed', expected: settings.seed, actual: request.options?.seed },
        ]
        
        const failedValidations = validations.filter(v => v.actual !== v.expected)
        
        results.push({
          test: 'service_build_request',
          costumeId,
          status: failedValidations.length === 0 ? 'passed' : 'failed',
          validations,
          failedValidations,
          request: {
            model: request.model,
            promptLength: request.prompt.length,
            referenceCount: request.references.length,
            hasSeed: !!request.options?.seed,
            seed: request.options?.seed,
          },
        })
      } catch (error) {
        results.push({
          test: 'service_build_request',
          costumeId,
          status: 'failed',
          error: `Failed to build request: ${error}`,
        })
      }
    }
  } catch (error) {
    results.push({
      status: 'failed',
      error: `AI generation service test failed: ${error}`,
    })
  }
  
  return results
}

/**
 * Test comparison between script and database settings
 */
async function testComparison(): Promise<any[]> {
  console.log('\n🔍 Comparing script and database settings...')
  
  const results: any[] = []
  
  try {
    // Load the extracted settings
    const extractedSettings = JSON.parse(await fs.readFile('./extracted-costume-settings.json', 'utf-8'))
    
    // Check if NEON_DATABASE_URL is available
    const dbUrl = process.env.NEON_DATABASE_URL
    if (!dbUrl) {
      results.push({
        status: 'skipped',
        error: 'NEON_DATABASE_URL not available for comparison',
      })
      return results
    }
    
    const sql = neon(dbUrl)
    
    for (const costumeId of TEST_COSTUMES) {
      const scriptSettings = extractedSettings.find((s: any) => s.id === costumeId)
      
      if (!scriptSettings) {
        results.push({
          costumeId,
          status: 'failed',
          error: 'Script settings not found',
        })
        continue
      }
      
      try {
        // Get database settings
        const dbRows = await sql`
          SELECT * FROM costume_ai_generation WHERE costume_id = ${costumeId}
        `
        
        if (dbRows.length === 0) {
          results.push({
            costumeId,
            status: 'failed',
            error: 'Database settings not found',
          })
          continue
        }
        
        const dbSettings = dbRows[0]
        
        // Compare key settings
        const comparisons = [
          { field: 'model', script: scriptSettings.model, db: dbSettings.model },
          { field: 'seed', script: scriptSettings.seed, db: dbSettings.seed },
          { field: 'steps', script: scriptSettings.steps, db: dbSettings.steps },
          { field: 'resolution', script: scriptSettings.resolution, db: dbSettings.resolution },
          { field: 'showExplicitContent', script: scriptSettings.showExplicitContent, db: dbSettings.show_explicit_content },
        ]
        
        const mismatches = comparisons.filter(c => c.script !== c.db)
        
        results.push({
          costumeId,
          status: mismatches.length === 0 ? 'passed' : 'failed',
          comparisons,
          mismatches,
          scriptSettings: {
            model: scriptSettings.model,
            seed: scriptSettings.seed,
            steps: scriptSettings.steps,
            resolution: scriptSettings.resolution,
            showExplicitContent: scriptSettings.showExplicitContent,
          },
          dbSettings: {
            model: dbSettings.model,
            seed: dbSettings.seed,
            steps: dbSettings.steps,
            resolution: dbSettings.resolution,
            showExplicitContent: dbSettings.show_explicit_content,
          },
        })
      } catch (error) {
        results.push({
          costumeId,
          status: 'failed',
          error: `Failed to compare settings: ${error}`,
        })
      }
    }
  } catch (error) {
    results.push({
      status: 'failed',
      error: `Comparison test failed: ${error}`,
    })
  }
  
  return results
}

/**
 * Generate test report
 */
function generateTestReport(results: TestResults): void {
  console.log('\n📊 TEST REPORT')
  console.log('='.repeat(50))
  
  console.log(`\n📈 Summary:`)
  console.log(`  Total tests: ${results.summary.totalTests}`)
  console.log(`  Passed: ${results.summary.passedTests}`)
  console.log(`  Failed: ${results.summary.failedTests}`)
  console.log(`  Success rate: ${((results.summary.passedTests / results.summary.totalTests) * 100).toFixed(1)}%`)
  
  if (results.summary.issues.length > 0) {
    console.log(`\n⚠️ Issues:`)
    results.summary.issues.forEach(issue => console.log(`  - ${issue}`))
  }
  
  // Extraction results
  console.log(`\n🔍 Extraction Tests:`)
  results.extractionResults.forEach(result => {
    const icon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️'
    console.log(`  ${icon} ${result.costumeId || 'Extraction'}: ${result.status}`)
    if (result.error) console.log(`    Error: ${result.error}`)
    if (result.failedValidations && result.failedValidations.length > 0) {
      console.log(`    Failed validations: ${result.failedValidations.map(v => v.field).join(', ')}`)
    }
  })
  
  // Database results
  console.log(`\n🗄️ Database Tests:`)
  results.databaseResults.forEach(result => {
    const icon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️'
    console.log(`  ${icon} ${result.test}${result.costumeId ? ` (${result.costumeId})` : ''}: ${result.status}`)
    if (result.error) console.log(`    Error: ${result.error}`)
    if (result.settings) {
      console.log(`    Settings: model=${result.settings.model}, seed=${result.settings.seed}, hasPrompt=${result.settings.hasPrompt}`)
    }
  })
  
  // Service results
  console.log(`\n🤖 AI Service Tests:`)
  results.serviceResults.forEach(result => {
    const icon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️'
    console.log(`  ${icon} ${result.test}${result.costumeId ? ` (${result.costumeId})` : ''}: ${result.status}`)
    if (result.error) console.log(`    Error: ${result.error}`)
    if (result.request) {
      console.log(`    Request: model=${result.request.model}, promptLength=${result.request.promptLength}, references=${result.request.referenceCount}, seed=${result.request.seed}`)
    }
  })
  
  // Comparison results
  console.log(`\n🔍 Comparison Tests:`)
  results.comparisonResults.forEach(result => {
    const icon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️'
    console.log(`  ${icon} ${result.costumeId}: ${result.status}`)
    if (result.error) console.log(`    Error: ${result.error}`)
    if (result.mismatches && result.mismatches.length > 0) {
      console.log(`    Mismatches: ${result.mismatches.map(m => `${m.field} (${m.script} vs ${m.db})`).join(', ')}`)
    }
  })
  
  console.log('\n' + '='.repeat(50))
}

/**
 * Main test execution
 */
async function main() {
  console.log('🧪 RUNNING COMPLETE INTEGRATION TESTS')
  console.log('='.repeat(50))
  
  const results: TestResults = {
    extractionResults: [],
    databaseResults: [],
    serviceResults: [],
    comparisonResults: [],
    summary: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      issues: [],
    },
  }
  
  try {
    // Run all tests
    results.extractionResults = await testExtraction()
    results.databaseResults = await testDatabase()
    results.serviceResults = await testAIGenerationService()
    results.comparisonResults = await testComparison()
    
    // Calculate summary
    const allResults = [
      ...results.extractionResults,
      ...results.databaseResults,
      ...results.serviceResults,
      ...results.comparisonResults,
    ]
    
    results.summary.totalTests = allResults.length
    results.summary.passedTests = allResults.filter(r => r.status === 'passed').length
    results.summary.failedTests = allResults.filter(r => r.status === 'failed').length
    
    // Collect issues
    allResults.forEach(result => {
      if (result.status === 'failed' && result.error) {
        results.summary.issues.push(`${result.costumeId || result.test}: ${result.error}`)
      }
    })
    
    // Generate report
    generateTestReport(results)
    
    // Save detailed results
    await fs.writeFile('./test-results.json', JSON.stringify(results, null, 2))
    console.log(`\n💾 Detailed results saved to: ./test-results.json`)
    
    // Exit with appropriate code
    if (results.summary.failedTests > 0) {
      console.log(`\n❌ ${results.summary.failedTests} tests failed. Check the report above for details.`)
      process.exitCode = 1
    } else {
      console.log(`\n🎉 All tests passed! The integration is working correctly.`)
    }
  } catch (error) {
    console.error('\n❌ Test execution failed:', error)
    process.exitCode = 1
  }
}

// Run the tests
main()