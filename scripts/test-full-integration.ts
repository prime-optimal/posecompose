#!/usr/bin/env bun

import { NanoGptProviderV2 } from '../src/lib/ai/nano-gpt-v2.ts'
import { AIGenerationService } from '../src/lib/ai/ai-generation-service.ts'
import { getAllCostumesV2 } from '../server/api/neon-client-v2.ts'

const testFullIntegration = async () => {
  console.log('🧪 Testing Full Integration: Tuned Prompts + AI Generation + Enhanced Logging')
  console.log('==========================================================================')
  
  const provider = new NanoGptProviderV2()
  
  if (!provider.isConfigured()) {
    console.log('❌ NanoGPT provider is not configured')
    return
  }
  
  try {
    // Fetch costumes from database
    const costumes = await getAllCostumesV2()
    console.log(`📋 Found ${costumes.length} costumes`)
    
    // Test with Bowsette to verify full integration
    const costume = costumes.find(c => c.id === 'bowsette')
    if (!costume) {
      console.log('❌ Bowsette costume not found')
      return
    }
    
    console.log(`\n🎭 Testing full integration with: ${costume.name}`)
    console.log('─'.repeat(70))
    
    // Read test selfie
    const fs = await import('fs')
    const selfiePath = '/Users/ryan/working/posecompose/test-input/11.jpeg'
    
    if (!fs.existsSync(selfiePath)) {
      console.log('❌ Test selfie not found at:', selfiePath)
      return
    }
    
    const selfieBuffer = fs.readFileSync(selfiePath)
    const selfieBase64 = selfieBuffer.toString('base64')
    const selfieDataUrl = `data:image/jpeg;base64,${selfieBase64}`
    
    console.log(`📁 Loaded selfie: ${selfiePath}`)
    console.log(`📊 Selfie size: ${selfieBuffer.length} bytes`)
    
    // Generate prompt ID and timestamp
    const promptId = AIGenerationService.generatePromptId(costume)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    
    // Build AI generation request using tuned prompts
    const request = {
      costume,
      selfieBase64,
      selfieMimeType: 'image/jpeg',
      model: 'seedream-v4' as const
    }
    
    const aiRequest = AIGenerationService.buildRequest(request)
    
    console.log(`🤖 Model: ${aiRequest.model}`)
    console.log(`🎲 Seed: ${aiRequest.options?.seed || 'auto'}`)
    console.log(`📝 Prompt ID: ${promptId}`)
    console.log(`📄 Prompt length: ${aiRequest.prompt.length} characters`)
    console.log(`🔗 References: ${aiRequest.references.length}`)
    
    // Log prompt details
    const promptDetails = {
      promptId,
      model: aiRequest.model,
      seed: aiRequest.options?.seed as number | undefined,
      timestamp,
      costume: costume.name,
      promptText: aiRequest.prompt,
      references: aiRequest.references.map(ref => ({
        id: ref.id,
        kind: ref.kind,
        role: ref.role
      })),
      generationSettings: aiRequest.options || {}
    }
    
    await AIGenerationService.savePromptDetails(promptDetails)
    
    // Log generation details
    const generationLog: any = {
      promptId,
      model: aiRequest.model,
      seed: aiRequest.options?.seed as number | undefined,
      timestamp: new Date().toISOString(),
      costume: costume.name,
      promptLength: aiRequest.prompt.length,
      referenceCount: aiRequest.references.length,
      status: 'generating'
    }
    
    AIGenerationService.logGenerationDetails(generationLog)
    
    // Generate the image
    console.log('\n🎨 Generating image with tuned prompt...')
    const result = await provider.generateImage(aiRequest)
    
    console.log(`✅ Status: ${result.status}`)
    console.log(`📊 Images Generated: ${result.images?.length || 0}`)
    
    if (result.images && result.images.length > 0) {
      // Save generated images with descriptive filenames
      const savedFiles = await AIGenerationService.saveGeneratedImages(
        promptId,
        aiRequest.model,
        aiRequest.options?.seed as number | undefined,
        result.images,
        timestamp
      )
      
      console.log(`💾 Saved ${savedFiles.length} images to test-output directory`)
      
      // Update generation log with success
      generationLog.status = 'success'
      generationLog.imagesGenerated = result.images.length
      AIGenerationService.logGenerationDetails(generationLog)
      
    } else {
      console.log('⚠️ No images generated')
      generationLog.status = 'no-images'
      AIGenerationService.logGenerationDetails(generationLog)
    }
    
    if (result.error) {
      console.log(`🚨 Error: ${result.error}`)
      generationLog.status = 'error'
      generationLog.error = result.error
      AIGenerationService.logGenerationDetails(generationLog)
    }
    
    // Verify tuned prompt usage
    const hasTunedPrompt = !!(costume as any).aiSettings?.prompt || !!costume.aiGeneration?.primaryPrompt
    console.log(`\n🎯 Integration Results:`)
    console.log(`✅ Tuned prompt used: ${hasTunedPrompt ? 'YES' : 'NO'}`)
    console.log(`✅ Enhanced logging: ENABLED`)
    console.log(`✅ Image saving: ${result.images?.length ? 'SUCCESS' : 'N/A'}`)
    console.log(`✅ Prompt ID tracking: ${promptId}`)
    console.log(`✅ Seed logging: ${aiRequest.options?.seed || 'auto'}`)
    
    console.log('\n📁 Generated files:')
    console.log(`💾 Prompt details: ./test-output/prompt-${promptId}.txt`)
    if (result.images && result.images.length > 0) {
      result.images.forEach((_, index) => {
        const filename = `${promptId}-${aiRequest.model}-seed-${aiRequest.options?.seed || 'auto'}-${index + 1}-${timestamp}.png`
        console.log(`🖼️ Generated image: ./test-output/${filename}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Full integration test failed:', error)
    if (error instanceof Error) {
      console.error('Stack:', error.stack)
    }
  }
}

testFullIntegration().catch(error => {
  console.error('❌ Test execution failed:', error)
  process.exit(1)
})