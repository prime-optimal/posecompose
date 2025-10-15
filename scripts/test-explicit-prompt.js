#!/usr/bin/env node

/**
 * Test with extremely explicit prompt about image roles
 */

import { NanoGptProviderV2 } from '../src/lib/ai/nano-gpt-v2.js'

console.log('🎯 Test: Explicit Image Role Prompt')
console.log('==================================')

async function testExplicitPrompt() {
  const provider = new NanoGptProviderV2()
  
  if (!provider.isConfigured()) {
    console.log('❌ NanoGPT provider is not configured')
    return
  }
  
  try {
    // Test with extremely explicit prompt
    console.log('\n📝 Testing with explicit image role instructions')
    const result = await provider.generateImage({
      model: 'seedream-v4',
      prompt: `IMPORTANT: You will receive 2 reference images.

IMAGE 1 (PRIMARY): The user's personal selfie - THIS IS THE PERSON'S FACE AND BODY you must keep and transform. DO NOT change their face, skin tone, or body structure.

IMAGE 2 (COSTUME REFERENCE): The Daisy Bodysuit Halloween costume - This is ONLY to show what the costume looks like.

YOUR TASK: 
1. Keep the person from IMAGE 1 exactly as they are (same face, same body, same skin tone)
2. Dress them in the costume shown in IMAGE 2
3. Create a realistic virtual try-on, not a collage
4. The person should be WEARING the costume, not standing next to it
5. Match lighting and proportions naturally

CRITICAL: The result must show the SAME PERSON from IMAGE 1 wearing the costume from IMAGE 2.`,
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
      fs.writeFileSync(`./test-output/explicit-prompt-${timestamp}.png`, base64Data, 'base64')
      console.log(`💾 Explicit prompt result saved to: ./test-output/explicit-prompt-${timestamp}.png`)
    }
    
    if (result.error) {
      console.log(`🚨 Error: ${result.error}`)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

async function main() {
  console.log('🔑 API Key Present:', !!process.env.VITE_NANO_GPT_API_KEY)
  await testExplicitPrompt()
}

main()