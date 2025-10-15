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

const saveBase64Image = (base64, filename) => {
  const base64Data = base64.replace(/^data:image\/[a-z]+;base64,/, '')
  writeFileSync(filename, base64Data, 'base64')
  console.log(`💾 Saved: ${filename}`)
}

const saveUrlImage = async (url, filename) => {
  const response = await fetch(url)
  const buffer = await response.arrayBuffer()
  writeFileSync(filename, Buffer.from(buffer))
  console.log(`💾 Saved: ${filename}`)
}

const testGeneration = async (model, prompt, filename) => {
  console.log(`\n🎨 Testing ${model} generation...`)
  console.log(`📝 Prompt: ${prompt}`)
  
  const provider = new NanoGptProvider({
    apiKey: process.env.VITE_NANO_GPT_API_KEY
  })

  try {
    const selfieBase64 = await downloadBase64(SAMPLE_SELFIE_URL)
    
    const response = await provider.generateImage({
      model,
      prompt,
      references: [
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
      ],
    })

    console.log(`✅ Generation completed! Status: ${response.status}`)
    console.log(`📊 Images returned: ${response.images.length}`)

    if (response.images.length > 0) {
      const image = response.images[0]
      
      if (image.base64) {
        saveBase64Image(image.base64, filename)
      } else if (image.url) {
        await saveUrlImage(image.url, filename)
      } else {
        console.log('❌ No image data found in response')
      }
    } else {
      console.log('❌ No images returned')
    }

    return response
  } catch (error) {
    console.error(`❌ Error with ${model}:`, error.message)
    return null
  }
}

const main = async () => {
  console.log('🚀 Starting AI Image Generation Test')
  console.log('=====================================')

  // Create output directory
  const { mkdir } = await import('fs/promises')
  try {
    await mkdir('test-output', { recursive: true })
  } catch (error) {
    // Directory might already exist
  }

  // Save original images for comparison
  console.log('\n📸 Saving original images for comparison...')
  await saveUrlImage(SAMPLE_SELFIE_URL, 'test-output/original-selfie.jpg')
  await saveUrlImage(SAMPLE_COSTUME_URL, 'test-output/original-costume.png')

  // Test different models
  const tests = [
    {
      model: 'background-remover',
      prompt: 'Remove the background from the provided subject photo',
      filename: 'test-output/background-removed.png'
    },
    {
      model: 'seedream-v4',
      prompt: 'High quality studio portrait with costume makeover',
      filename: 'test-output/seedream-transformation.png'
    },
    {
      model: 'google:4@1',
      prompt: 'Editorial fashion photo with neon lighting',
      filename: 'test-output/google-fashion.png'
    }
  ]

  for (const test of tests) {
    await testGeneration(test.model, test.prompt, test.filename)
  }

  console.log('\n🎉 Test completed!')
  console.log('📁 Check the test-output/ directory to see the generated images')
  console.log('\n📋 Generated files:')
  console.log('  - original-selfie.jpg (input)')
  console.log('  - original-costume.png (input)')
  console.log('  - background-removed.png (background removal)')
  console.log('  - seedream-transformation.png (costume transformation)')
  console.log('  - google-fashion.png (fashion style)')
}

main().catch(console.error)