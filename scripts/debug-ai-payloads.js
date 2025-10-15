#!/usr/bin/env node

import { NanoGptProvider } from '../src/lib/ai/nano-gpt.ts'
import { writeFileSync } from 'fs'
import { join } from 'path'

// Load environment variables
import { readFileSync } from 'fs'
const envContent = readFileSync('.env', 'utf8')
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    process.env[key.trim()] = valueParts.join('=').trim()
  }
})

const SAMPLE_SELFIE_URL = 'https://f004.backblazeb2.com/file/waifu-test/uploads/11.jpeg'
const SAMPLE_COSTUME_URL = 'https://f004.backblazeb2.com/file/waifu-test/waifu-test/costumes/daisy-01.png'

const downloadBase64 = async (url) => {
  console.log(`📥 Downloading: ${url}`)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download asset from ${url}`)
  }
  const buffer = await response.arrayBuffer()
  return Buffer.from(buffer).toString('base64')
}

const debugPayload = (model, prompt, references) => {
  console.log(`\n🔍 DEBUG: ${model} Payload Analysis`)
  console.log('=' .repeat(50))
  console.log(`📝 Prompt: "${prompt}"`)
  console.log(`📊 References: ${references.length} items`)
  
  references.forEach((ref, index) => {
    console.log(`\n  Reference ${index + 1}:`)
    console.log(`    ID: ${ref.id}`)
    console.log(`    Kind: ${ref.kind}`)
    console.log(`    Role: ${ref.role}`)
    console.log(`    Weight: ${ref.weight || 'not set'}`)
    console.log(`    MIME Type: ${ref.mimeType || 'not set'}`)
    
    if (ref.kind === 'url') {
      console.log(`    URL: ${ref.value}`)
    } else if (ref.kind === 'base64') {
      const preview = ref.value.substring(0, 50) + '...'
      console.log(`    Base64 Preview: ${preview}`)
      console.log(`    Base64 Length: ${ref.value.length} chars`)
    }
  })

  // Simulate what NanoGptProvider.buildPayload does
  const limit = { 'background-remover': 1, 'seedream-v4': 10, 'google:4@1': 4 }[model]
  const limitedRefs = references.slice(0, limit)
  
  console.log(`\n🔄 After applying limit (${limit}): ${limitedRefs.length} references`)
  
  const primary = limitedRefs.find(ref => ref.role === 'user') ?? limitedRefs[0]
  const secondary = limitedRefs.filter(ref => ref !== primary)
  
  console.log(`\n👤 Primary Reference: ${primary.id} (${primary.role})`)
  console.log(`🎭 Secondary References: ${secondary.map(r => r.id).join(', ') || 'none'}`)
  
  // Build the actual payload
  const serializeReference = (ref) => {
    if (ref.kind === 'url') {
      return ref.value
    }
    if (ref.value.startsWith('data:image/')) {
      return ref.value
    }
    const mime = ref.mimeType || 'image/jpeg'
    return `data:${mime};base64,${ref.value}`
  }
  
  const payload = {
    model,
    prompt,
    response_format: 'url',
  }
  
  payload.imageDataUrl = serializeReference(primary)
  
  if (secondary.length) {
    payload.imageDataUrls = secondary.map(serializeReference)
  }
  
  console.log(`\n📤 Final API Payload:`)
  console.log(JSON.stringify(payload, null, 2))
  
  return payload
}

const testGenerationWithDebug = async (model, prompt, filename) => {
  console.log(`\n🎨 Testing ${model} generation with debug...`)
  
  const provider = new NanoGptProvider({
    apiKey: process.env.VITE_NANO_GPT_API_KEY
  })

  try {
    const selfieBase64 = await downloadBase64(SAMPLE_SELFIE_URL)
    
    const references = [
      {
        id: 'user-selfie',
        kind: 'base64',
        value: selfieBase64,
        role: 'user',
        mimeType: 'image/jpeg',
      },
      {
        id: 'costume-url',
        kind: 'url',
        value: SAMPLE_COSTUME_URL,
        role: 'costume',
      },
    ]
    
    // Debug the payload before sending
    const payload = debugPayload(model, prompt, references)
    
    console.log(`\n🚀 Sending request to NanoGPT...`)
    
    const response = await provider.generateImage({
      model,
      prompt,
      references,
    })

    console.log(`\n✅ Generation completed!`)
    console.log(`📊 Status: ${response.status}`)
    console.log(`🖼️ Images returned: ${response.images.length}`)
    
    if (response.images.length > 0) {
      const image = response.images[0]
      console.log(`📋 Image Details:`)
      console.log(`    ID: ${image.id}`)
      console.log(`    Has URL: ${!!image.url}`)
      console.log(`    Has Base64: ${!!image.base64}`)
      
      if (image.url) {
        console.log(`    URL: ${image.url}`)
      }
    }

    return response
  } catch (error) {
    console.error(`❌ Error with ${model}:`, error.message)
    return null
  }
}

const main = async () => {
  console.log('🔍 AI Payload Debugging Tool')
  console.log('============================')

  const tests = [
    {
      model: 'background-remover',
      prompt: 'Remove the background from the provided subject photo',
      filename: 'test-output/background-removed-debug.png'
    },
    {
      model: 'seedream-v4',
      prompt: 'High quality studio portrait with costume makeover',
      filename: 'test-output/seedream-transformation-debug.png'
    },
    {
      model: 'google:4@1',
      prompt: 'Editorial fashion photo with neon lighting',
      filename: 'test-output/google-fashion-debug.png'
    }
  ]

  for (const test of tests) {
    await testGenerationWithDebug(test.model, test.prompt, test.filename)
    console.log('\n' + '='.repeat(80))
  }

  console.log('\n🎉 Debug completed!')
  console.log('💡 Check the logs above to see exactly what was sent to each model')
}

main().catch(console.error)