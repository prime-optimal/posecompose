#!/usr/bin/env node

/**
 * Test script to check if using only the selfie as reference works
 */

import { NanoGptProviderV2 } from '../src/lib/ai/nano-gpt-v2.js'

console.log('🧪 Test: Single Reference (Selfie Only)')
console.log('=======================================')

async function testSingleReference() {
  const provider = new NanoGptProviderV2()
  
  if (!provider.isConfigured()) {
    console.log('❌ NanoGPT provider is not configured')
    return
  }
  
  try {
    // Test 1: Selfie only
    console.log('\n📸 Test 1: Selfie only reference')
    const result1 = await provider.generateImage({
      model: 'seedream-v4',
      prompt: 'Transform this person to wear a Daisy Bodysuit Halloween costume',
      references: [
        {
          id: 'selfie',
          kind: 'url',
          value: 'https://f004.backblazeb2.com/file/waifu-test/uploads/11.jpeg',
          role: 'user'
        }
      ],
      numOutputs: 1
    })
    
    console.log(`✅ Status: ${result1.status}`)
    console.log(`📊 Images Generated: ${result1.images?.length || 0}`)
    
    if (result1.images && result1.images.length > 0 && result1.images[0].base64) {
      const fs = await import('fs')
      const base64Data = result1.images[0].base64.replace(/^data:image\/[a-z]+;base64,/, '')
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      fs.writeFileSync(`./test-output/selfie-only-${timestamp}.png`, base64Data, 'base64')
      console.log(`💾 Selfie-only result saved to: ./test-output/selfie-only-${timestamp}.png`)
    }
    
    // Test 2: Costume only
    console.log('\n👕 Test 2: Costume only reference')
    const result2 = await provider.generateImage({
      model: 'seedream-v4',
      prompt: 'Transform this person to wear this Daisy Bodysuit Halloween costume',
      references: [
        {
          id: 'costume',
          kind: 'url',
          value: 'https://f004.backblazeb2.com/file/waifu-test/costumes/daisy-bodysuit/daisy-bodysuit-front.jpg',
          role: 'costume'
        }
      ],
      numOutputs: 1
    })
    
    console.log(`✅ Status: ${result2.status}`)
    console.log(`📊 Images Generated: ${result2.images?.length || 0}`)
    
    if (result2.images && result2.images.length > 0 && result2.images[0].base64) {
      const fs = await import('fs')
      const base64Data = result2.images[0].base64.replace(/^data:image\/[a-z]+;base64,/, '')
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      fs.writeFileSync(`./test-output/costume-only-${timestamp}.png`, base64Data, 'base64')
      console.log(`💾 Costume-only result saved to: ./test-output/costume-only-${timestamp}.png`)
    }
    
    // Test 3: Both references (original test)
    console.log('\n👥 Test 3: Both references (selfie + costume)')
    const result3 = await provider.generateImage({
      model: 'seedream-v4',
      prompt: 'Transform this person to wear this Daisy Bodysuit Halloween costume',
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
    
    console.log(`✅ Status: ${result3.status}`)
    console.log(`📊 Images Generated: ${result3.images?.length || 0}`)
    
    if (result3.images && result3.images.length > 0 && result3.images[0].base64) {
      const fs = await import('fs')
      const base64Data = result3.images[0].base64.replace(/^data:image\/[a-z]+;base64,/, '')
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      fs.writeFileSync(`./test-output/both-references-${timestamp}.png`, base64Data, 'base64')
      console.log(`💾 Both-references result saved to: ./test-output/both-references-${timestamp}.png`)
    }
    
    console.log('\n🎯 Comparison Results:')
    console.log('======================')
    console.log('1. Selfie only: ./test-output/selfie-only-{timestamp}.png')
    console.log('2. Costume only: ./test-output/costume-only-{timestamp}.png')
    console.log('3. Both references: ./test-output/both-references-{timestamp}.png')
    console.log('')
    console.log('Compare these images to see which reference is being used!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

async function main() {
  console.log('🔑 API Key Present:', !!process.env.VITE_NANO_GPT_API_KEY)
  await testSingleReference()
}

main()