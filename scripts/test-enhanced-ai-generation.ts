#!/usr/bin/env bun

import { AIGenerationService } from '../src/lib/ai/ai-generation-service.ts'
import { getAllCostumesV2 } from '../server/api/neon-client-v2.ts'

const testEnhancedAIGeneration = async () => {
  console.log('🧪 Testing Enhanced AI Generation with Tuned Prompts')
  console.log('==================================================')
  
  try {
    // Fetch costumes from database
    const costumes = await getAllCostumesV2()
    console.log(`📋 Found ${costumes.length} costumes`)
    
    // Test with Bowsette, Rosalina, and Daisy
    const testCostumes = ['bowsette', 'rosalina', 'daisy-bodysuit']
    
    for (const costumeId of testCostumes) {
      const costume = costumes.find(c => c.id === costumeId)
      if (!costume) {
        console.log(`❌ Costume ${costumeId} not found`)
        continue
      }
      
      console.log(`\n🎭 Testing costume: ${costume.name} (${costumeId})`)
      console.log('─'.repeat(50))
      
      // Generate prompt ID
      const promptId = AIGenerationService.generatePromptId(costume)
      console.log(`📝 Generated prompt ID: ${promptId}`)
      
      // Build AI generation request
      const request = {
        costume,
        selfieBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=', // Dummy selfie
        selfieMimeType: 'image/jpeg',
        model: 'seedream-v4' as const
      }
      
      const aiRequest = AIGenerationService.buildRequest(request)
      
      console.log(`🤖 Model: ${aiRequest.model}`)
      console.log(`🎲 Seed: ${aiRequest.options?.seed || 'auto'}`)
      console.log(`📄 Prompt length: ${aiRequest.prompt.length} characters`)
      console.log(`🔗 References: ${aiRequest.references.length}`)
      
      // Log prompt details
      const promptDetails = {
        promptId,
        model: aiRequest.model,
        seed: aiRequest.options?.seed as number | undefined,
        timestamp: new Date().toISOString().replace(/[:.]/g, '-'),
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
      const generationLog = {
        promptId,
        model: aiRequest.model,
        seed: aiRequest.options?.seed as number | undefined,
        timestamp: new Date().toISOString(),
        costume: costume.name,
        promptLength: aiRequest.prompt.length,
        referenceCount: aiRequest.references.length,
        status: 'request-built'
      }
      
      AIGenerationService.logGenerationDetails(generationLog)
      
      // Show first 200 characters of the prompt
      console.log(`📝 Preview: ${aiRequest.prompt.substring(0, 200)}...`)
      
      // Check if it's using tuned prompts
      const hasTunedPrompt = !!(costume as any).aiSettings?.prompt || !!costume.aiGeneration?.primaryPrompt
      console.log(`🎯 Using tuned prompt: ${hasTunedPrompt ? '✅ YES' : '❌ NO'}`)
      
      if ((costume as any).aiSettings?.prompt) {
        console.log(`💾 Database prompt found (${(costume as any).aiSettings.prompt.length} chars)`)
      }
      
      if (costume.aiGeneration?.primaryPrompt) {
        console.log(`🔧 Structured prompt found (${costume.aiGeneration.primaryPrompt.length} chars)`)
      }
    }
    
    console.log('\n✅ Enhanced AI generation test completed')
    console.log('💾 Check ./test-output/ directory for saved prompt details')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    if (error instanceof Error) {
      console.error('Stack:', error.stack)
    }
  }
}

testEnhancedAIGeneration().catch(error => {
  console.error('❌ Test execution failed:', error)
  process.exit(1)
})