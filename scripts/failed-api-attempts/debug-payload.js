#!/usr/bin/env node

/**
 * Debug script to inspect the exact payload being sent to the API
 */

import { NanoGptProviderV2 } from '../src/lib/ai/nano-gpt-v2.js'

console.log('🔍 Debug: API Payload Inspection')
console.log('================================')

async function debugPayload() {
  console.log('\n🧪 Testing: Inspect API Payload')
  console.log('─'.repeat(70))
  
  const provider = new NanoGptProviderV2()
  
  if (!provider.isConfigured()) {
    console.log('❌ NanoGPT provider is not configured')
    return
  }
  
  try {
    // Create a request with local file
    const request = {
      model: 'seedream-v4',
      prompt: 'Transform this person to wear this Daisy Bodysuit Halloween costume',
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
    }
    
    // Access the private buildPayload method and inspect the result
    const buildPayload = provider.constructor.prototype.buildPayload.bind(provider)
    const payload = await buildPayload(request)
    
    console.log('\n📋 Complete API Payload:')
    console.log('========================')
    
    // Log each property
    console.log(`🔧 Model: ${payload.model}`)
    console.log(`📝 Prompt: ${payload.prompt}`)
    console.log(`🔢 n: ${payload.n}`)
    
    console.log('\n🖼️  Primary Image (imageDataUrl):')
    if (payload.imageDataUrl) {
      console.log(`   Length: ${payload.imageDataUrl.length} characters`)
      console.log(`   Prefix: ${payload.imageDataUrl.substring(0, 50)}...`)
      console.log(`   Suffix: ...${payload.imageDataUrl.substring(payload.imageDataUrl.length - 50)}`)
      
      // Verify it's valid base64 data URL
      if (payload.imageDataUrl.startsWith('data:image/')) {
        console.log('   ✅ Valid data URL format')
        const parts = payload.imageDataUrl.split(',')
        if (parts.length === 2) {
          console.log(`   📊 MIME type: ${parts[0].split(':')[1].split(';')[0]}`)
          console.log(`   📊 Base64 data size: ${parts[1].length} characters`)
        }
      } else {
        console.log('   ❌ Invalid data URL format')
      }
    } else {
      console.log('   ❌ No imageDataUrl found!')
    }
    
    console.log('\n🖼️  Secondary Images (imageDataUrls):')
    if (payload.imageDataUrls && payload.imageDataUrls.length > 0) {
      payload.imageDataUrls.forEach((url, index) => {
        console.log(`   [${index + 1}] ${url}`)
      })
    } else {
      console.log('   ❌ No secondary images found!')
    }
    
    console.log('\n🔍 Additional Properties:')
    Object.keys(payload).forEach(key => {
      if (!['model', 'prompt', 'n', 'imageDataUrl', 'imageDataUrls'].includes(key)) {
        console.log(`   ${key}: ${JSON.stringify(payload[key])}`)
      }
    })
    
    // Test with a simple base64 image to see if the API accepts it
    console.log('\n🧪 Testing API call...')
    const result = await provider.generateImage(request)
    
    console.log(`\n✅ Generation Status: ${result.status}`)
    console.log(`📊 Images Generated: ${result.images?.length || 0}`)
    
    if (result.error) {
      console.log(`🚨 Error: ${result.error}`)
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
    console.error('Stack:', error.stack)
  }
}

async function main() {
  console.log('🔑 API Key Present:', !!process.env.VITE_NANO_GPT_API_KEY)
  await debugPayload()
}

main()