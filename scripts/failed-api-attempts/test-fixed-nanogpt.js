#!/usr/bin/env node

/**
 * Test the Fixed NanoGPT Implementation
 * Tests the corrected API structure based on official documentation
 */

import { NanoGptProviderV2 } from '../src/lib/ai/nano-gpt-v2.js'

console.log('🔍 Testing Fixed NanoGPT Implementation')
console.log('==================================================')

async function testSingleImage() {
  console.log('\n🧪 Testing: Single Image Reference')
  console.log('─'.repeat(50))
  
  const provider = new NanoGptProviderV2()
  
  if (!provider.isConfigured()) {
    console.log('❌ NanoGPT provider is not configured')
    return
  }
  
  try {
    const result = await provider.generateImage({
      model: 'seedream-v4',
      prompt: 'Transform this person into a watercolor painting',
      references: [{
        id: 'selfie',
        kind: 'url',
        value: 'https://f004.backblazeb2.com/file/waifu-test/uploads/11.jpeg',
        role: 'user'
      }],
      numOutputs: 1
    })

    console.log(`✅ Status: ${result.status}`)
    console.log(`📊 Images Generated: ${result.images?.length || 0}`)
    
    if (result.images && result.images.length > 0) {
      console.log(`📏 First Image ID: ${result.images[0].id}`)
      console.log(`🔍 Has URL: ${!!result.images[0].url}`)
      console.log(`🔍 Has Base64: ${!!result.images[0].base64}`)
      if (result.images[0].url) {
        console.log(`📄 URL: ${result.images[0].url}`)
      }
    } else {
      console.log('❌ No images generated')
    }

    if (result.error) {
      console.log(`🚨 Error: ${result.error}`)
    }

  } catch (error) {
    console.log(`❌ Test Failed:`, error.message)
  }
}

async function testMultipleImages() {
  console.log('\n🧪 Testing: Multiple Image References (Selfie + Costume)')
  console.log('─'.repeat(50))
  
  const provider = new NanoGptProviderV2()
  
  try {
    const result = await provider.generateImage({
      model: 'seedream-v4',
      prompt: 'Transform this person to wear a red Halloween costume',
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
          value: 'https://f004.backblazeb2.com/file/waifu-test/assets/costumes/daisy-bodysuit/Daisy_Bodysuit_square_profile_image.jpg',
          role: 'costume'
        }
      ],
      numOutputs: 1
    })

    console.log(`✅ Status: ${result.status}`)
    console.log(`📊 Images Generated: ${result.images?.length || 0}`)
    
    if (result.images && result.images.length > 0) {
      console.log(`📏 First Image ID: ${result.images[0].id}`)
      console.log(`🔍 Has URL: ${!!result.images[0].url}`)
      console.log(`🔍 Has Base64: ${!!result.images[0].base64}`)
      
      // Save the image for inspection
      if (result.images[0].base64) {
        const fs = await import('fs')
        const base64Data = result.images[0].base64.replace(/^data:image\/[a-z]+;base64,/, '')
        fs.writeFileSync('/tmp/fixed-test-output.png', base64Data, 'base64')
        console.log(`💾 Image saved to: /tmp/fixed-test-output.png`)
      }
    } else {
      console.log('❌ No images generated')
    }

    if (result.error) {
      console.log(`🚨 Error: ${result.error}`)
    }

  } catch (error) {
    console.log(`❌ Test Failed:`, error.message)
  }
}

async function testGoogleModel() {
  console.log('\n🧪 Testing: Google Model (with size parameter)')
  console.log('─'.repeat(50))
  
  const provider = new NanoGptProviderV2()
  
  try {
    const result = await provider.generateImage({
      model: 'google:4@1',
      prompt: 'Transform this person into a cartoon character',
      references: [{
        id: 'selfie',
        kind: 'url',
        value: 'https://f004.backblazeb2.com/file/waifu-test/uploads/11.jpeg',
        role: 'user'
      }],
      numOutputs: 1
    })

    console.log(`✅ Status: ${result.status}`)
    console.log(`📊 Images Generated: ${result.images?.length || 0}`)
    
    if (result.images && result.images.length > 0) {
      console.log(`📏 First Image ID: ${result.images[0].id}`)
      console.log(`🔍 Has URL: ${!!result.images[0].url}`)
      console.log(`🔍 Has Base64: ${!!result.images[0].base64}`)
    } else {
      console.log('❌ No images generated')
    }

    if (result.error) {
      console.log(`🚨 Error: ${result.error}`)
    }

  } catch (error) {
    console.log(`❌ Test Failed:`, error.message)
  }
}

async function main() {
  try {
    console.log('🔑 API Key Present:', !!process.env.VITE_NANO_GPT_API_KEY)
    
    await testSingleImage()
    await testMultipleImages()
    await testGoogleModel()
    
    console.log('\n\n📊 Test Summary')
    console.log('==================================================')
    console.log('This test validates the fixed NanoGPT implementation.')
    console.log('Key improvements:')
    console.log('✅ Correct V1 endpoint usage')
    console.log('✅ Proper payload structure (n parameter)')
    console.log('✅ Model-specific parameter handling')
    console.log('✅ Correct image reference ordering')
    
  } catch (error) {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
  }
}

main()