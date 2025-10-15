#!/usr/bin/env node

/**
 * Test alternative payload formats for the NanoGPT API
 */

import { NanoGptProviderV2 } from '../src/lib/ai/nano-gpt-v2.js'

console.log('🔄 Test: Alternative Payload Formats')
console.log('===================================')

async function testAlternativeFormats() {
  console.log('\n🧪 Testing different payload structures')
  console.log('─'.repeat(70))
  
  const provider = new NanoGptProviderV2()
  
  if (!provider.isConfigured()) {
    console.log('❌ NanoGPT provider is not configured')
    return
  }
  
  try {
    // Test 1: Try swapping the order - costume as primary, selfie as secondary
    console.log('\n📸 Test 1: Costume as primary, selfie as secondary')
    const result1 = await provider.generateImage({
      model: 'seedream-v4',
      prompt: `The user uploaded a personal photo (image 2). 
Apply the selected costume(s) from the following reference image(s) (image 1) 
to create a realistic virtual try-on result.

Context:
- Costume theme: Daisy Bodysuit Halloween costume
- Style keywords: realistic, detailed, high-quality, professional photography
- Environment consistency: match lighting, pose, and proportions
- If multiple costumes appear, integrate as layered outfit (e.g., base suit + accessories + headgear)
- Preserve realism: correct skin tones, avoid facial distortion or color shifts`,
      references: [
        {
          id: 'costume',
          kind: 'url',
          value: 'https://f004.backblazeb2.com/file/waifu-test/costumes/daisy-bodysuit/daisy-bodysuit-front.jpg',
          role: 'costume'
        },
        {
          id: 'selfie',
          kind: 'file',
          value: '/Users/ryan/working/posecompose/test-input/11.jpeg',
          role: 'user'
        }
      ],
      numOutputs: 1
    })
    
    console.log(`✅ Status: ${result1.status}`)
    console.log(`📊 Images Generated: ${result1.images?.length || 0}`)
    
    if (result1.images && result1.images.length > 0 && result1.images[0].base64) {
      const fs = await import('fs')
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const base64Data = result1.images[0].base64.replace(/^data:image\/[a-z]+;base64,/, '')
      fs.writeFileSync(`./test-output/alt-format-1-costume-primary-${timestamp}.png`, base64Data, 'base64')
      console.log(`💾 Result saved to: ./test-output/alt-format-1-costume-primary-${timestamp}.png`)
    }
    
    // Test 2: Try with only the selfie as base64 and no secondary images
    console.log('\n📸 Test 2: Selfie only (base64)')
    const result2 = await provider.generateImage({
      model: 'seedream-v4',
      prompt: 'Transform this person to wear a Daisy Bodysuit Halloween costume',
      references: [
        {
          id: 'selfie',
          kind: 'file',
          value: '/Users/ryan/working/posecompose/test-input/11.jpeg',
          role: 'user'
        }
      ],
      numOutputs: 1
    })
    
    console.log(`✅ Status: ${result2.status}`)
    console.log(`📊 Images Generated: ${result2.images?.length || 0}`)
    
    if (result2.images && result2.images.length > 0 && result2.images[0].base64) {
      const fs = await import('fs')
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const base64Data = result2.images[0].base64.replace(/^data:image\/[a-z]+;base64,/, '')
      fs.writeFileSync(`./test-output/alt-format-2-selfie-only-${timestamp}.png`, base64Data, 'base64')
      console.log(`💾 Result saved to: ./test-output/alt-format-2-selfie-only-${timestamp}.png`)
    }
    
    // Test 3: Try using a different model (google:4@1)
    console.log('\n📸 Test 3: Using google:4@1 model')
    const result3 = await provider.generateImage({
      model: 'google:4@1',
      prompt: 'Transform this person to wear a Daisy Bodysuit Halloween costume',
      references: [
        {
          id: 'selfie',
          kind: 'file',
          value: '/Users/ryan/working/posecompose/test-input/11.jpeg',
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
    
    console.log(`✅ Status: ${result3.status}`)
    console.log(`📊 Images Generated: ${result3.images?.length || 0}`)
    
    if (result3.images && result3.images.length > 0 && result3.images[0].base64) {
      const fs = await import('fs')
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const base64Data = result3.images[0].base64.replace(/^data:image\/[a-z]+;base64,/, '')
      fs.writeFileSync(`./test-output/alt-format-3-google-model-${timestamp}.png`, base64Data, 'base64')
      console.log(`💾 Result saved to: ./test-output/alt-format-3-google-model-${timestamp}.png`)
    }
    
    console.log('\n🎯 Comparison Results:')
    console.log('======================')
    console.log('Check the generated images to see which format works!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

async function main() {
  console.log('🔑 API Key Present:', !!process.env.VITE_NANO_GPT_API_KEY)
  await testAlternativeFormats()
}

main()