#!/usr/bin/env node

/**
 * Corrected API Test Based on Official NanoGPT Documentation
 * Tests the proper API structure according to the official examples
 */

import { NanoGptProvider } from '../src/lib/ai/nano-gpt.js'

console.log('🔍 Corrected API Test (Based on Official Docs)')
console.log('==================================================')

async function testSingleImage() {
  console.log('\n🧪 Testing: Single Image (Official Method)')
  console.log('─'.repeat(50))
  
  const provider = new NanoGptProvider()
  
  try {
    // Test with minimal required parameters from official docs
    const payload = {
      model: 'seedream-v4',
      prompt: 'Transform this person into a watercolor painting',
      n: 1,
      size: '1024x1024',
      imageDataUrl: 'https://f004.backblazeb2.com/file/waifu-test/uploads/11.jpeg'
    }
    
    console.log('📤 Payload:', JSON.stringify(payload, null, 2))
    
    // We need to manually build the payload since our current implementation might be wrong
    const response = await fetch('https://nano-gpt.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VITE_NANO_GPT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    
    console.log(`📊 Response Status: ${response.status}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.log(`❌ Error Response: ${errorText}`)
      return
    }
    
    const result = await response.json()
    console.log(`✅ Success! Generated ${result.data?.length || 0} images`)
    
    if (result.data && result.data.length > 0) {
      console.log(`📏 First image URL: ${result.data[0].url || 'No URL'}`)
      console.log(`📏 First image base64: ${result.data[0].b64_json ? 'Present' : 'Not present'}`)
    }
    
  } catch (error) {
    console.log(`❌ Test Failed:`, error.message)
  }
}

async function testMultipleImages() {
  console.log('\n🧪 Testing: Multiple Images (Official Method)')
  console.log('─'.repeat(50))
  
  try {
    // Test with multiple images using official method
    const payload = {
      model: 'seedream-v4',
      prompt: 'Transform this person to wear a red costume',
      n: 1,
      size: '1024x1024',
      imageDataUrls: [
        'https://f004.backblazeb2.com/file/waifu-test/uploads/11.jpeg', // Selfie
        'https://f004.backblazeb2.com/file/waifu-test/assets/costumes/daisy-bodysuit/Daisy_Bodysuit_square_profile_image.jpg' // Costume reference
      ]
    }
    
    console.log('📤 Payload:', JSON.stringify(payload, null, 2))
    
    const response = await fetch('https://nano-gpt.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VITE_NANO_GPT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    
    console.log(`📊 Response Status: ${response.status}`)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.log(`❌ Error Response: ${errorText}`)
      return
    }
    
    const result = await response.json()
    console.log(`✅ Success! Generated ${result.data?.length || 0} images`)
    
    if (result.data && result.data.length > 0) {
      console.log(`📏 First image URL: ${result.data[0].url || 'No URL'}`)
      console.log(`📏 First image base64: ${result.data[0].b64_json ? 'Present' : 'Not present'}`)
    }
    
  } catch (error) {
    console.log(`❌ Test Failed:`, error.message)
  }
}

async function testDifferentModels() {
  console.log('\n🧪 Testing: Different Models')
  console.log('─'.repeat(50))
  
  const models = ['seedream-v4', 'flux-kontext', 'gpt-4o-image']
  
  for (const model of models) {
    console.log(`\n🤖 Testing Model: ${model}`)
    
    try {
      const payload = {
        model: model,
        prompt: 'A simple test image',
        n: 1,
        size: '512x512',
        imageDataUrl: 'https://f004.backblazeb2.com/file/waifu-test/uploads/11.jpeg'
      }
      
      const response = await fetch('https://nano-gpt.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.VITE_NANO_GPT_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      
      console.log(`📊 ${model}: ${response.status}`)
      
      if (response.ok) {
        const result = await response.json()
        console.log(`✅ ${model}: ${result.data?.length || 0} images`)
      } else {
        const errorText = await response.text()
        console.log(`❌ ${model}: ${errorText.substring(0, 100)}...`)
      }
      
    } catch (error) {
      console.log(`❌ ${model}: ${error.message}`)
    }
  }
}

async function main() {
  try {
    console.log('🔑 API Key Present:', !!process.env.VITE_NANO_GPT_API_KEY)
    
    await testSingleImage()
    await testMultipleImages()
    await testDifferentModels()
    
    console.log('\n\n📊 Test Summary')
    console.log('==================================================')
    console.log('This test uses the official API structure.')
    console.log('Compare these results with our current implementation.')
    
  } catch (error) {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
  }
}

main()