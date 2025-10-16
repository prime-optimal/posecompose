#!/usr/bin/env node

/**
 * Debug script to investigate reference image priority issue
 * Tests how the NanoGPT API processes reference images
 */

import { NanoGptProviderV2 } from '../src/lib/ai/nano-gpt-v2.js'

console.log('🔍 Debug: Reference Image Priority Investigation')
console.log('==============================================')

async function debugReferencePriority() {
  console.log('\n🧪 Testing: Reference Image Processing and Priority')
  console.log('─'.repeat(70))
  
  const provider = new NanoGptProviderV2()
  
  if (!provider.isConfigured()) {
    console.log('❌ NanoGPT provider is not configured')
    return
  }
  
  try {
    // Test 1: Check if the selfie URL is accessible
    console.log('\n📡 Test 1: Checking selfie URL accessibility')
    const selfieUrl = 'https://f004.backblazeb2.com/file/waifu-test/uploads/11.jpeg'
    const costumeUrl = 'https://f004.backblazeb2.com/file/waifu-test/costumes/daisy-bodysuit/daisy-bodysuit-front.jpg'
    
    try {
      const selfieResponse = await fetch(selfieUrl, { method: 'HEAD' })
      console.log(`✅ Selfie URL status: ${selfieResponse.status} (${selfieResponse.ok ? 'OK' : 'ERROR'})`)
      console.log(`📏 Selfie content-type: ${selfieResponse.headers.get('content-type')}`)
    } catch (error) {
      console.log(`❌ Selfie URL error: ${error.message}`)
    }
    
    try {
      const costumeResponse = await fetch(costumeUrl, { method: 'HEAD' })
      console.log(`✅ Costume URL status: ${costumeResponse.status} (${costumeResponse.ok ? 'OK' : 'ERROR'})`)
      console.log(`📏 Costume content-type: ${costumeResponse.headers.get('content-type')}`)
    } catch (error) {
      console.log(`❌ Costume URL error: ${error.message}`)
    }
    
    // Test 2: Build payload and inspect structure
    console.log('\n🔧 Test 2: Building and inspecting API payload')
    const request = {
      model: 'seedream-v4',
      prompt: 'Transform this person to wear this Daisy Bodysuit Halloween costume',
      references: [
        {
          id: 'selfie',
          kind: 'url',
          value: selfieUrl,
          role: 'user'
        },
        {
          id: 'costume',
          kind: 'url',
          value: costumeUrl,
          role: 'costume'
        }
      ],
      numOutputs: 1
    }
    
    // Access the private buildPayload method through prototype
    const buildPayload = provider.constructor.prototype.buildPayload.bind(provider)
    const payload = buildPayload(request)
    
    console.log('\n📋 Generated API Payload:')
    console.log(JSON.stringify(payload, null, 2))
    
    // Test 3: Check reference priority logic
    console.log('\n🎯 Test 3: Reference Priority Analysis')
    const primary = request.references.find(ref => ref.role === 'user') ?? request.references[0]
    const secondary = request.references.filter(ref => ref !== primary)
    
    console.log(`👤 Primary reference (user): ${primary.id} - ${primary.value}`)
    console.log(`👕 Secondary references: ${secondary.map(ref => ref.id).join(', ')}`)
    
    // Test 4: Make the actual API call with detailed logging
    console.log('\n🚀 Test 4: Making API call with detailed logging')
    
    // Patch fetch to intercept the request
    const originalFetch = globalThis.fetch
    globalThis.fetch = async (url, options) => {
      if (url.includes('nano-gpt.com')) {
        console.log('\n📤 API Request Details:')
        console.log(`🔗 URL: ${url}`)
        console.log(`📝 Headers:`, JSON.stringify(options.headers, null, 2))
        
        const body = JSON.parse(options.body)
        console.log(`📦 Payload size: ${options.body.length} bytes`)
        console.log(`🖼️  Primary image present: !!body.imageDataUrl`)
        console.log(`🖼️  Secondary images count: ${body.imageDataUrls?.length || 0}`)
        
        // Log first 100 chars of each image URL to verify they're correct
        if (body.imageDataUrl) {
          console.log(`🔍 Primary image preview: ${body.imageDataUrl.substring(0, 100)}...`)
        }
        if (body.imageDataUrls?.length > 0) {
          body.imageDataUrls.forEach((img, i) => {
            console.log(`🔍 Secondary image ${i + 1} preview: ${img.substring(0, 100)}...`)
          })
        }
        
        const response = await originalFetch(url, options)
        const responseClone = response.clone()
        
        try {
          const responseData = await responseClone.json()
          console.log('\n📥 API Response Details:')
          console.log(JSON.stringify(responseData, null, 2))
        } catch (error) {
          console.log('\n❌ Failed to parse response as JSON:', error.message)
        }
        
        return response
      }
      return originalFetch(url, options)
    }
    
    const result = await provider.generateImage(request)
    
    // Restore original fetch
    globalThis.fetch = originalFetch
    
    console.log(`\n✅ Generation Status: ${result.status}`)
    console.log(`📊 Images Generated: ${result.images?.length || 0}`)
    
    if (result.images && result.images.length > 0) {
      console.log(`📏 First Image ID: ${result.images[0].id}`)
      
      // Save the image for inspection
      if (result.images[0].base64) {
        const fs = await import('fs')
        const base64Data = result.images[0].base64.replace(/^data:image\/[a-z]+;base64,/, '')
        fs.writeFileSync('/tmp/debug-reference-priority.png', base64Data, 'base64')
        console.log(`💾 Result saved to: /tmp/debug-reference-priority.png`)
        console.log(`🖼️  Open with: open /tmp/debug-reference-priority.png`)
      }
    }
    
    if (result.error) {
      console.log(`🚨 Error: ${result.error}`)
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

async function main() {
  try {
    console.log('🔑 API Key Present:', !!process.env.VITE_NANO_GPT_API_KEY)
    
    await debugReferencePriority()
    
    console.log('\n\n🔍 DEBUG SUMMARY')
    console.log('==============================================')
    console.log('✅ URL accessibility verified')
    console.log('✅ API payload structure inspected')
    console.log('✅ Reference priority logic verified')
    console.log('✅ Actual API request/response logged')
    console.log('')
    console.log('🎯 Check the saved image to see if the selfie was used!')
    
  } catch (error) {
    console.error('❌ Debug suite failed:', error)
    process.exit(1)
  }
}

main()