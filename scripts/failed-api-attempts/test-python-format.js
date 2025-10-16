#!/usr/bin/env node

/**
 * Test using the exact format from the Python example
 */

import { NanoGptProviderV2 } from '../src/lib/ai/nano-gpt-v2.js'

console.log('🐍 Test: Python Format Compatibility')
console.log('===================================')

async function testPythonFormat() {
  console.log('\n🧪 Testing Python-like payload format')
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
    
    // Test 1: Use the exact format from Python example
    console.log('\n📸 Test 1: Python format with imageDataUrl only')
    const result1 = await provider.generateImage({
      model: 'seedream-v4',
      prompt: 'Transform this person to wear a Daisy Bodysuit Halloween costume',
      references: [
        {
          id: 'selfie',
          kind: 'base64',
          value: dataUrl,
          role: 'user'
        }
      ],
      numOutputs: 1
    })
    
    console.log(`✅ Status: ${result1.status}`)
    console.log(`📊 Images Generated: ${result1.images?.length || 0}`)
    
    if (result1.images && result1.images.length > 0 && result1.images[0].base64) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const outputBase64 = result1.images[0].base64.replace(/^data:image\/[a-z]+;base64,/, '')
      fs.writeFileSync(`./test-output/python-format-1-${timestamp}.png`, outputBase64, 'base64')
      console.log(`💾 Result saved to: ./test-output/python-format-1-${timestamp}.png`)
    }
    
    // Test 2: Try with both images but in different fields
    console.log('\n📸 Test 2: Both images with explicit base64 for selfie')
    const result2 = await provider.generateImage({
      model: 'seedream-v4',
      prompt: `The user uploaded a personal photo (image 1). 
Apply the selected costume(s) from the following reference image(s) (image 2) 
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
          kind: 'base64',
          value: dataUrl,
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
    
    console.log(`✅ Status: ${result2.status}`)
    console.log(`📊 Images Generated: ${result2.images?.length || 0}`)
    
    if (result2.images && result2.images.length > 0 && result2.images[0].base64) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const outputBase64 = result2.images[0].base64.replace(/^data:image\/[a-z]+;base64,/, '')
      fs.writeFileSync(`./test-output/python-format-2-${timestamp}.png`, outputBase64, 'base64')
      console.log(`💾 Result saved to: ./test-output/python-format-2-${timestamp}.png`)
    }
    
    // Test 3: Try without any role specification
    console.log('\n📸 Test 3: Without role specification')
    const result3 = await provider.generateImage({
      model: 'seedream-v4',
      prompt: 'Transform this person to wear a Daisy Bodysuit Halloween costume',
      references: [
        {
          id: 'selfie',
          kind: 'base64',
          value: dataUrl
        },
        {
          id: 'costume',
          kind: 'url',
          value: 'https://f004.backblazeb2.com/file/waifu-test/costumes/daisy-bodysuit/daisy-bodysuit-front.jpg'
        }
      ],
      numOutputs: 1
    })
    
    console.log(`✅ Status: ${result3.status}`)
    console.log(`📊 Images Generated: ${result3.images?.length || 0}`)
    
    if (result3.images && result3.images.length > 0 && result3.images[0].base64) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const outputBase64 = result3.images[0].base64.replace(/^data:image\/[a-z]+;base64,/, '')
      fs.writeFileSync(`./test-output/python-format-3-${timestamp}.png`, outputBase64, 'base64')
      console.log(`💾 Result saved to: ./test-output/python-format-3-${timestamp}.png`)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    console.error('Stack:', error.stack)
  }
}

async function main() {
  console.log('🔑 API Key Present:', !!process.env.VITE_NANO_GPT_API_KEY)
  await testPythonFormat()
}

main()