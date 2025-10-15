#!/usr/bin/env node

/**
 * Test using only imageDataUrls array for multiple images with realistic prompt
 * Usage: bun scripts/test-multiple-images-array.js [model]
 * Models: seedream-v4, google:4@1, background-remover
 */

import { NanoGptProviderV2 } from '../src/lib/ai/nano-gpt-v2.ts'

// Parse CLI arguments for model selection
const args = process.argv.slice(2)
const availableModels = ['seedream-v4', 'google:4@1', 'background-remover']

// Check for help flag
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: bun scripts/test-multiple-images-array.js [model] [options]

Models:
  seedream-v4      - Default model, supports up to 10 reference images
  google:4@1       - Google model, supports up to 4 reference images, 1024x1024 only
  background-remover - Background removal model, supports 1 reference image

Examples:
  bun scripts/test-multiple-images-array.js                    # Use default seedream-v4 model
  bun scripts/test-multiple-images-array.js google:4@1         # Use Google model
  bun scripts/test-multiple-images-array.js --help             # Show this help

Features:
  - Uses costume URLs instead of base64 for efficiency
  - Supports seed parameter for consistent results
  - Generates multiple images (when supported by model)
  - Saves all generated images with descriptive filenames
`)
  process.exit(0)
}

const selectedModel = args.find(arg => availableModels.includes(arg)) || 'seedream-v4'

if (!availableModels.includes(selectedModel)) {
  console.error(`❌ Invalid model: ${args[0]}`)
  console.error(`Available models: ${availableModels.join(', ')}`)
  console.error(`Use --help for more information`)
  process.exit(1)
}

console.log('🖼️ Test: Multiple Images Array with Realistic Prompt')
console.log('==================================================')
console.log(`🤖 Using model: ${selectedModel}`)

async function testMultipleImagesArray() {
  console.log('\n🧪 Testing with realistic prompt and costume URLs (no base64)')
  console.log('─'.repeat(70))
  
  const provider = new NanoGptProviderV2()
  
  if (!provider.isConfigured()) {
    console.log('❌ NanoGPT provider is not configured')
    return
  }
  
  try {
    // Read both images and convert to base64
    const fs = await import('fs')
    const path = await import('path')
    
    const selfiePath = '/Users/ryan/working/posecompose/test-input/11.jpeg'
    const selfieBuffer = fs.readFileSync(selfiePath)
    const selfieBase64 = selfieBuffer.toString('base64')
    const selfieDataUrl = `data:image/jpeg;base64,${selfieBase64}`
    
    // Use URLs for costume images instead of base64
    const costumeUrls = [
      'https://f004.backblazeb2.com/file/waifu-test/costumes/rosalina/rosalina-blurred.png',
      'https://f004.backblazeb2.com/file/waifu-test/costumes/rosalina/rosalina-crown.jpg'
    ]
    
    const costumeReferences = []
    
    for (let i = 0; i < costumeUrls.length; i++) {
      costumeReferences.push({
        id: `costume-${i + 1}`,
        kind: 'url',
        value: costumeUrls[i],
        role: 'costume'
      })
      
      console.log(`🌐 Using costume URL ${i + 1}: ${costumeUrls[i].split('/').pop()}`)
    }
    
    console.log(`📁 Loaded selfie: ${selfiePath}`)
    console.log(`📊 Selfie size: ${selfieBuffer.length} bytes`)
    
    // Build references array with selfie as base64, costume images as URLs
    const references = [
      {
        id: 'selfie',
        kind: 'base64',
        value: selfieDataUrl,
        role: 'user'
      },
      ...costumeReferences
    ]
    
    // Define costume seed mapping
    const costumeSeeds = {
      'daisy-bodysuit': 1001,
      'daisy-skirt': 1002,
      'bowsette': 1003,
      'rosalina': 1004,
      'chun-li': 1005,
      'kitana': 1006,
      '2b': 1007
    }
    
    // Use rosalina seed for this test
    const selectedCostume = 'rosalina'
    const costumeSeed = costumeSeeds[selectedCostume]
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    
    // Create prompt identifier for tracking
    const promptId = `rosalina`
    const promptText = `The user uploaded a personal photo (image 1).
          Apply the selected costume from the following reference image to create a realistic virtual try-on result.
          Keep the users hairstyle, facial expression and skin tone.

          Context:
          A realistic, true to life Rosalina from Super Mario Kart. 
          A seductive reimagining of Rosalina, the classic gaming princess. 
          She wears a daring, form-fitting pale blue bustier that reveals 
          her midriff and a hint of cleavage. The voluminous skirt is slit high, 
          offering a playful glimpse of her legs. 
          Dramatic, wide sleeves with delicate white lace frame her alluring pose. 
          A sparkling silver, jeweled crown rests on her hair, completing this naughty 
          yet elegant tribute to the celestial princess. Photorealistic, soft lighting.

          The image should emphasize craftsmanship, fabric details, and authentic video game character costuming.

          Background: She is at a classy, masquerade ball.  Lots of people are around, but out of focus and slightly in the shadows.
          Avoid: No sunglasses, no frowns, no words on clothing.
          Style: hyper-detailed, photorealistic, cinematic lighting, sharp focus, 8K.`
          
    // Log prompt details for tracking
    console.log(`\n📸 Test: ${selectedModel} with realistic prompt, costume URLs, and seed parameter`)
    console.log(`🎲 Using seed: ${costumeSeed} for costume: ${selectedCostume}`)
    console.log(`📝 Prompt ID: ${promptId}`)
    console.log(`📄 Prompt length: ${promptText.length} characters`)
    console.log(`💾 Saving prompt details to ./test-output/prompt-${promptId}-${timestamp}.txt`)
    
    // Save prompt to file for reference
    const promptDetails = `
      Prompt ID: ${promptId}
      Model: ${selectedModel}
      Seed: ${costumeSeed}
      Timestamp: ${timestamp}
      Costume: ${selectedCostume}

      === PROMPT TEXT ===
      ${promptText}

      === REFERENCES ===
      ${references.map(ref => `- ${ref.id}: ${ref.kind} (${ref.role})`).join('\n')}

      === GENERATION SETTINGS ===
      - Model: ${selectedModel}
      - Seed: ${costumeSeed}
      - numOutputs: 1
      - resolution: auto
      - steps: 30
      `
    fs.writeFileSync(`./test-output/prompt-${promptId}-${timestamp}.txt`, promptDetails)
    
    const result = await provider.generateImage({
      model: selectedModel,
      prompt: promptText,
      numOutputs: 1,
      showExplicitContent: true,
      resolution: "auto",
      references: references,
      steps: 30,
      options: {
        seed: costumeSeed
      }
    })
    
    console.log(`✅ Status: ${result.status}`)
    console.log(`📊 Images Generated: ${result.images?.length || 0}`)
    
    if (result.images && result.images.length > 0) {
      result.images.forEach((image, index) => {
        if (image.base64) {
          const outputBase64 = image.base64.replace(/^data:image\/[a-z]+;base64,/, '')
          const filename = `./test-output/${promptId}-${selectedModel}-seed-${costumeSeed}-${index + 1}-${timestamp}.png`
          fs.writeFileSync(filename, outputBase64, 'base64')
          console.log(`💾 Image ${index + 1} saved to: ${filename}`)
          console.log(`📋 Prompt details saved to: ./test-output/prompt-${promptId}-${timestamp}.txt`)
        }
      })
    } else {
      console.log('⚠️ No images generated')
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
  await testMultipleImagesArray()
}

main()
