#!/usr/bin/env bun
/**
 * Script to test deployment integration and verify tuned prompts are working
 * Run this after deployment to verify the complete flow is working correctly
 */

interface CostumeData {
  id: string
  name: string
  aiSettings?: any
  aiGeneration?: any
  assets: Array<{
    id: string
    url: string
    type: string
  }>
}

interface LogEntry {
  event: string
  level: string
  timestamp: string
  costumeId?: string
  source?: string
  model?: string
  promptLength?: number
  referenceCount?: number
  [key: string]: any
}

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'https://your-site.netlify.app'

async function testAPIEndpoint(endpoint: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`)
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` }
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function testCostumeAPI(): Promise<boolean> {
  console.log('🎭 Testing Costume API...\n')

  // Test /api/costumes
  console.log('Testing /api/costumes...')
  const costumesResult = await testAPIEndpoint('/api/costumes')
  
  if (!costumesResult.success) {
    console.log(`  ❌ Failed: ${costumesResult.error}`)
    return false
  }

  const costumesData = costumesResult.data
  console.log(`  ✅ Found ${costumesData.count} costumes`)

  if (costumesData.count === 0) {
    console.log('  ⚠️  No costumes found - may indicate database connection issues')
    return false
  }

  // Check first costume for AI settings
  const firstCostume = costumesData.items[0] as CostumeData
  console.log(`\n📝 Checking AI settings for: ${firstCostume.name}`)
  
  const hasAiSettings = !!firstCostume.aiSettings
  const hasAiGeneration = !!firstCostume.aiGeneration
  const hasAssets = firstCostume.assets && firstCostume.assets.length > 0

  console.log(`  - aiSettings: ${hasAiSettings ? '✅' : '❌'}`)
  console.log(`  - aiGeneration: ${hasAiGeneration ? '✅' : '❌'}`)
  console.log(`  - assets: ${hasAssets ? `${firstCostume.assets.length} found` : '❌'}`)

  if (hasAiSettings || hasAiGeneration) {
    console.log('  ✅ Costume has AI settings - tuned prompts should work!')
  } else {
    console.log('  ❌ No AI settings found - will use fallback prompts')
  }

  // Test /api/costumes/featured
  console.log('\nTesting /api/costumes/featured...')
  const featuredResult = await testAPIEndpoint('/api/costumes/featured')
  
  if (!featuredResult.success) {
    console.log(`  ❌ Failed: ${featuredResult.error}`)
    return false
  }

  console.log(`  ✅ Found ${featuredResult.data.count} featured costumes`)

  // Test specific costume by ID
  console.log(`\nTesting /api/costumes/${firstCostume.id}...`)
  const costumeResult = await testAPIEndpoint(`/api/costumes/${firstCostume.id}`)
  
  if (!costumeResult.success) {
    console.log(`  ❌ Failed: ${costumeResult.error}`)
    return false
  }

  console.log('  ✅ Individual costume API working')

  return true
}

async function testLoggingEndpoint(): Promise<boolean> {
  console.log('\n📋 Testing Logging Endpoint...\n')

  const testLog: LogEntry = {
    event: 'deployment_test',
    level: 'info',
    timestamp: new Date().toISOString(),
    costumeId: 'test-costume',
    source: 'aiSettings',
    model: 'seedream-v4',
    promptLength: 150,
    referenceCount: 3,
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testLog),
    })

    if (response.ok) {
      console.log('  ✅ Logging endpoint working')
      return true
    } else {
      console.log(`  ❌ Logging endpoint failed: HTTP ${response.status}`)
      return false
    }
  } catch (error) {
    console.log(`  ❌ Logging endpoint error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return false
  }
}

async function testHealthEndpoint(): Promise<boolean> {
  console.log('\n🏥 Testing Health Endpoint...\n')

  const healthResult = await testAPIEndpoint('/api/health')
  
  if (!healthResult.success) {
    console.log(`  ❌ Failed: ${healthResult.error}`)
    return false
  }

  console.log(`  ✅ Health check passed: ${healthResult.data.status}`)
  console.log(`  📅 Server time: ${healthResult.data.timestamp}`)
  
  return true
}

async function runIntegrationTests(): Promise<void> {
  console.log('🚀 Starting Deployment Integration Tests\n')
  console.log(`📍 Testing API endpoint: ${API_BASE_URL}\n`)

  const results = {
    health: await testHealthEndpoint(),
    costumes: await testCostumeAPI(),
    logging: await testLoggingEndpoint(),
  }

  console.log('\n🎯 Test Results Summary:')
  console.log(`  Health Check: ${results.health ? '✅' : '❌'}`)
  console.log(`  Costume API: ${results.costumes ? '✅' : '❌'}`)
  console.log(`  Logging: ${results.logging ? '✅' : '❌'}`)

  const allPassed = Object.values(results).every(Boolean)
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! Your deployment is working correctly.')
    console.log('🔥 Tuned prompts should now be utilized in production!')
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above and fix the issues.')
    console.log('💡 Common fixes:')
    console.log('   - Verify NEON_DATABASE_URL is set in Netlify environment')
    console.log('   - Ensure enhanced schema migration has been applied')
    console.log('   - Check Netlify function logs for runtime errors')
  }

  process.exit(allPassed ? 0 : 1)
}

// Check if API_BASE_URL is provided
if (!process.env.VITE_API_BASE_URL && !API_BASE_URL.includes('your-site')) {
  console.error('❌ Please set VITE_API_BASE_URL environment variable to your deployed site URL')
  console.log('   Example: VITE_API_BASE_URL=https://your-site.netlify.app')
  process.exit(1)
}

// Run the tests
runIntegrationTests().catch(console.error)