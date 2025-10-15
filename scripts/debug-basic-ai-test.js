#!/usr/bin/env node

/**
 * Basic AI Model Test
 * Test if the AI model can generate any images at all
 */

import { NanoGptProvider } from '../src/lib/ai/nano-gpt.js'

console.log('🔍 Basic AI Model Test')
console.log('==================================================')

async function testBasicGeneration() {
  const provider = new NanoGptProvider()
  
  if (!provider.isConfigured()) {
    console.log('❌ NanoGPT provider is not configured')
    return
  }

  const testCases = [
    {
      name: 'Simple Text Prompt (No Images)',
      prompt: 'A simple red apple on a white background, photorealistic',
      model: 'seedream-v4',
      references: []
    },
    {
      name: 'Single Image Reference',
      prompt: 'Transform this person to wear a red hat',
      model: 'seedream-v4',
      references: [{
        id: 'selfie',
        kind: 'url',
        value: 'https://f004.backblazeb2.com/file/waifu-test/uploads/11.jpeg',
        role: 'user'
      }]
    }
  ]

  for (const testCase of testCases) {
    console.log(`\n🧪 Testing: ${testCase.name}`)
    console.log('─'.repeat(50))
    
    try {
      const result = await provider.generateImage({
        model: testCase.model,
        prompt: testCase.prompt,
        references: testCase.references
      })

      console.log(`✅ API Response: ${result.status}`)
      console.log(`📊 Image Count: ${result.images?.length || 0}`)
      console.log(`🔧 Generation ID: ${result.id}`)
      
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

      if (result.meta) {
        console.log(`📋 Metadata:`, JSON.stringify(result.meta, null, 2))
      }

    } catch (error) {
      console.log(`❌ Test Failed:`, error.message)
    }
  }
}

async function testDifferentModels() {
  console.log('\n\n🤖 Testing Different Models')
  console.log('==================================================')
  
  const provider = new NanoGptProvider()
  
  if (!provider.isConfigured()) {
    console.log('❌ NanoGPT provider is not configured')
    return
  }
  
  const models = ['seedream-v4', 'google:4@1', 'background-remover']
  
  for (const model of models) {
    console.log(`\n🧪 Testing Model: ${model}`)
    console.log('─'.repeat(50))
    
    try {
      const result = await provider.generateImage({
        model: model,
        prompt: 'A simple blue circle',
        references: [{
          id: 'test',
          kind: 'url',
          value: 'https://f004.backblazeb2.com/file/waifu-test/uploads/11.jpeg',
          role: 'user'
        }]
      })

      console.log(`✅ API Response: ${result.status}`)
      console.log(`📊 Image Count: ${result.images?.length || 0}`)
      
      if (result.images && result.images.length > 0) {
        console.log(`✅ Model ${model} can generate images`)
      } else {
        console.log(`❌ Model ${model} returned 0 images`)
      }

      if (result.error) {
        console.log(`🚨 Error: ${result.error}`)
      }

    } catch (error) {
      console.log(`❌ Model ${model} Failed:`, error.message)
    }
  }
}

async function main() {
  try {
    await testBasicGeneration()
    await testDifferentModels()
    
    console.log('\n\n📊 Test Summary')
    console.log('==================================================')
    console.log('Check the results above to identify:')
    console.log('1. Which models are working')
    console.log('2. Whether the issue is with reference images')
    console.log('3. If there are API quota or rate limit issues')
    
  } catch (error) {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
  }
}

main()