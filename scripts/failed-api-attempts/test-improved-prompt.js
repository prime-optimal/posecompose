#!/usr/bin/env node

/**
 * Test script with improved prompt for better virtual try-on results
 */

import { NanoGptProviderV2 } from '../src/lib/ai/nano-gpt-v2.js'

console.log('🎭 Test: Improved Prompt for Virtual Try-On')
console.log('=========================================')

async function testImprovedPrompt() {
  const provider = new NanoGptProviderV2()
  
  if (!provider.isConfigured()) {
    console.log('❌ NanoGPT provider is not configured')
    return
  }
  
  try {
    // Test with improved prompt
    console.log('\n📝 Testing improved prompt structure')
    const result = await provider.generateImage({
      model: 'seedream-v4',
      prompt: `The user uploaded a personal photo (image 1). 
Apply the selected costume(s) from the following reference image(s) (image 2...N) 
to create a realistic virtual try-on result.

Context:
- Costume theme: Daisy Bodysuit Halloween costume
- Style keywords: realistic, detailed, high-quality, professional photography
- Environment consistency: match lighting, pose, and proportions
- If multiple costumes appear, integrate as layered outfit (e.g., base suit + accessories + headgear)
- Preserve realism: correct skin tones, avoid facial distortion or color shifts`,
      references: [
        {
          id: 'selfie',
          kind: 'url',
          value: 'https://f004.backblazeb2.com/file/waifu-test/uploads/11.jpeg',
          role: 'user'
        },
        {
          id: 'costume',
          kind: 'url',
          value: 'https://f004.backblazeb2.com/file/waifu-test/costumes/daisy-bodysuit/daisy-bodysuit-front.jpg',
          role: 'costume'
        }
      ],
      numOutputs: 1
    })
    
    console.log(`✅ Status: ${result.status}`)
    console.log(`📊 Images Generated: ${result.images?.length || 0}`)
    
    if (result.images && result.images.length > 0 && result.images[0].base64) {
      const fs = await import('fs')
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const base64Data = result.images[0].base64.replace(/^data:image\/[a-z]+;base64,/, '')
      fs.writeFileSync(`./test-output/improved-prompt-${timestamp}.png`, base64Data, 'base64')
      console.log(`💾 Improved prompt result saved to: ./test-output/improved-prompt-${timestamp}.png`)
    }
    
    if (result.error) {
      console.log(`🚨 Error: ${result.error}`)
    }
    
    console.log('\n🎯 Comparison:')
    console.log('==============')
    console.log('1. Original result: ./test-output/both-references-{timestamp}.png')
    console.log('2. Improved prompt: ./test-output/improved-prompt-{timestamp}.png')
    console.log('')
    console.log('Compare these images to see if the improved prompt helps!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

async function main() {
  console.log('🔑 API Key Present:', !!process.env.VITE_NANO_GPT_API_KEY)
  await testImprovedPrompt()
}

main()