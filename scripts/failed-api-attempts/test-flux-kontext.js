#!/usr/bin/env node

/**
 * Test using flux-kontext model with kontext_max_mode for single image img2img
 */

import { NanoGptProviderV2 } from '../src/lib/ai/nano-gpt-v2.js'

console.log('🌊 Test: Flux-Kontext Model with Single Image')
console.log('===========================================')

async function testFluxKontext() {
  console.log('\n🧪 Testing flux-kontext with single base64 image')
  console.log('─'.repeat(70))
  
  const provider = new NanoGptProviderV2()
  
  if (!provider.isConfigured()) {
    console.log('❌ NanoGPT provider is not configured')
    return
  }
  
  try {
    // Read the local file and convert to base64 manually
    const fs = await import('fs')
    const path = await import('path')
    
    const imagePath = '/Users/ryan/working/posecompose/test-input/11.jpeg'
    const imageBuffer = fs.readFileSync(imagePath)
    const base64Data = imageBuffer.toString('base64')
    const dataUrl = `data:image/jpeg;base64,${base64Data}`
    
    console.log(`📁 Loaded image: ${imagePath}`)
    console.log(`📊 Image size: ${imageBuffer.length} bytes`)
    console.log(`📊 Base64 size: ${base64Data.length} characters`)
    
    // Test with flux-kontext model and kontext_max_mode
    console.log('\n📸 Test: flux-kontext with kontext_max_mode')
    const result = await provider.generateImage({
      model: 'flux-kontext',
      prompt: 'Transform this person to wear a Daisy Bodysuit Halloween costume',
      references: [
        {
          id: 'selfie',
          kind: 'base64',
          value: dataUrl,
          role: 'user'
        }
      ],
      options: {
        kontext_max_mode: true,
        width: 1024,
        height: 1024
      },
      numOutputs: 1
    })
    
    console.log(`✅ Status: ${result.status}`)
    console.log(`📊 Images Generated: ${result.images?.length || 0}`)
    
    if (result.images && result.images.length > 0 && result.images[0].base64) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const outputBase64 = result.images[0].base64.replace(/^data:image\/[a-z]+;base64,/, '')
      fs.writeFileSync(`./test-output/flux-kontext-${timestamp}.png`, outputBase64, 'base64')
      console.log(`💾 Result saved to: ./test-output/flux-kontext-${timestamp}.png`)
    }
    
    if (result.error) {
      console.log(`🚨 Error: ${result.error}`)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    console.error('Stack:', error.stack)
  }
}

async function main() {
  console.log('🔑 API Key Present:', !!process.env.VITE_NANO_GPT_API_KEY)
  await testFluxKontext()
}

main()