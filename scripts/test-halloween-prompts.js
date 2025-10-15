#!/usr/bin/env node

/**
 * Halloween-specific virtual try-on prompt testing
 * Focuses on costume transformation while preserving original photo elements
 */

import { NanoGptProvider } from '../src/lib/ai/nano-gpt.ts'
import { buildNanoGptReferences } from '../src/lib/ai/references.js'
import { loadCostumePresets } from './utils/costume-loader.js'

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

// Halloween-specific prompt strategies
const HALLOWEEN_PROMPTS = [
	{
		name: 'Halloween Costume Swap Only',
		prompt: `Halloween costume transformation: Replace ONLY the clothing/outfit of the person in the first image with the Halloween costume shown in the reference images. 

CRITICAL REQUIREMENTS:
- Keep the exact same face, hair, skin tone, and facial expression
- Preserve the original background, lighting, and environment exactly
- Maintain the same pose, body position, and proportions
- Only change the clothing to match the Halloween costume references
- Ensure seamless integration where the costume looks naturally worn
- Match fabric textures and costume details from references
- Do not alter anything except the outfit/clothing

The person should remain completely recognizable as themselves, just wearing a different Halloween costume.`,
	},
	{
		name: 'Cinematic Halloween',
		prompt: `Create a fun, cinematic Halloween appearance by applying the costume from the reference images to the person in the first image. 

Key instructions:
- Preserve the person's real facial features and identity perfectly
- Transform only the clothing to match the Halloween costume
- Add subtle Halloween atmosphere while keeping the original setting
- Ensure the costume integration looks realistic and seamless
- Maintain the same pose and expression
- Focus on making it look like the person is enjoying wearing the costume

The result should be festive and cinematic while keeping the person completely recognizable.`,
	},
	{
		name: 'Minimal Background Change',
		prompt: `Apply the Halloween costume from the reference images to the person in the first image with minimal environmental changes.

Requirements:
- Keep the exact same face, identity, and expression
- Preserve the original background as much as possible
- Only change the outfit to match the costume references
- Maintain original lighting and atmosphere
- Ensure natural-looking costume integration
- Keep the same pose and body positioning

The transformation should focus solely on the costume swap while preserving everything else from the original photo.`,
	},
	{
		name: 'System-Level Halloween',
		systemPrompt: `The first image is the user's original photo. All subsequent images are Halloween costume references.

Your task is to create a Halloween costume transformation by replacing ONLY the clothing/outfit of the person from the first image with the costume elements shown in the reference images.

ABSOLUTE REQUIREMENTS:
- Preserve the person's exact facial features, identity, and expression
- Keep the original background, environment, and lighting unchanged
- Maintain the same pose, body position, and proportions
- Only transform the clothing/outfit to match the Halloween costume
- Ensure seamless, realistic costume integration
- Match costume details, textures, and colors from references
- Do not alter any element except the clothing

Output a photorealistic image showing the same person wearing the Halloween costume while everything else remains identical to the original photo.`,

		userPrompt: `Apply the Halloween costume from the reference images to the person in the first image. Keep everything else exactly the same - only change the clothing.`,
	},
]

async function fetchImageAsBase64(url) {
	try {
		const response = await fetch(url)
		if (!response.ok) {
			throw new Error(`Failed to fetch image: ${response.status}`)
		}
		const arrayBuffer = await response.arrayBuffer()
		const base64 = Buffer.from(arrayBuffer).toString('base64')
		return `data:image/jpeg;base64,${base64}`
	} catch (error) {
		console.error(`❌ Failed to fetch image from ${url}:`, error.message)
		return null
	}
}

async function testHalloweenPrompt(strategy, costume, selfieBase64) {
	console.log(`\n🎃 Testing: ${strategy.name}`)
	console.log(`📝 Prompt: "${strategy.prompt || strategy.userPrompt}"`)
	console.log('─'.repeat(80))

	try {
		const references = buildNanoGptReferences({
			costume,
			model: 'seedream-v4',
			selfieBase64,
			includeFallback: false,
		})

		console.log(`📊 References: ${references.length}`)
		references.forEach((ref, index) => {
			console.log(`  ${index + 1}. ${ref.id} (${ref.role}) - ${ref.kind}`)
		})

		const provider = new NanoGptProvider({
			apiKey: process.env.VITE_NANO_GPT_API_KEY
		})

		// Build the final prompt
		let finalPrompt
		if (strategy.systemPrompt && strategy.userPrompt) {
			finalPrompt = `${strategy.systemPrompt}\n\n${strategy.userPrompt}`
		} else {
			finalPrompt = strategy.prompt
		}

		const result = await provider.generateImage({
			model: 'seedream-v4',
			prompt: finalPrompt,
			references,
		})

		console.log(`✅ Generation completed! Status: ${result.status}`)
		console.log(`📊 Images returned: ${result.images.length}`)

		if (result.images.length > 0) {
			const image = result.images[0]
			console.log(`🔗 Image URL: ${image.url || 'undefined'}`)
			console.log(`📦 Base64: ${image.base64 ? 'present' : 'missing'}`)
			
			// Save result with strategy name
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
			const filename = `halloween-${strategy.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.jpg`
			
			try {
				let imageBuffer
				if (image.base64) {
					const base64Data = image.base64.replace(/^data:image\/[a-z]+;base64,/, '')
					imageBuffer = Buffer.from(base64Data, 'base64')
				} else if (image.url) {
					const imageResponse = await fetch(image.url)
					imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
				} else {
					throw new Error('No image data available')
				}
				
				require('fs').writeFileSync(filename, imageBuffer)
				console.log(`💾 Saved: ${filename}`)
				
				return { success: true, url: image.url, filename, hasBase64: !!image.base64 }
			} catch (saveError) {
				console.log(`⚠️  Could not save image: ${saveError.message}`)
				return { success: false, error: saveError.message, hasBase64: !!image.base64 }
			}
		} else {
			console.log(`❌ No images generated`)
			return { success: false, error: 'No images generated' }
		}
	} catch (error) {
		console.log(`❌ Error: ${error.message}`)
		return { success: false, error: error.message }
	}
}

async function main() {
	console.log('🎃 Halloween Virtual Try-On Prompt Testing')
	console.log('='.repeat(60))

	try {
		// Load costume data
		const costumes = await loadCostumePresets()
		const costume = costumes[0] // Use first costume for testing

		if (!costume) {
			console.error('❌ No costumes found')
			process.exit(1)
		}

		console.log(`👗 Testing with costume: ${costume.name}`)
		console.log(`🎭 Category: ${costume.category}`)
		console.log(`🎃 Halloween Theme: ${costume.description?.substring(0, 100)}...`)

		// Get selfie as base64
		console.log(`\n📸 Fetching selfie from: ${SAMPLE_SELFIE_URL}`)
		const selfieBase64 = await fetchImageAsBase64(SAMPLE_SELFIE_URL)

		if (!selfieBase64) {
			console.error('❌ Failed to fetch selfie image')
			process.exit(1)
		}

		console.log(`✅ Selfie loaded (${selfieBase64.length} characters)`)

		// Test each Halloween prompt strategy
		const results = []
		for (const strategy of HALLOWEEN_PROMPTS) {
			const result = await testHalloweenPrompt(strategy, costume, selfieBase64)
			results.push({ strategy: strategy.name, ...result })
			
			// Wait between requests to avoid rate limiting
			await new Promise(resolve => setTimeout(resolve, 3000))
		}

		// Summary
		console.log('\n📊 Halloween Test Results Summary')
		console.log('='.repeat(60))
		
		results.forEach(result => {
			const status = result.success ? '✅' : '❌'
			const base64Info = result.hasBase64 ? ' (base64)' : ' (url)'
			console.log(`${status} ${result.strategy}${base64Info}: ${result.success ? result.filename : result.error}`)
		})

		const successful = results.filter(r => r.success).length
		console.log(`\n🎯 Success Rate: ${successful}/${results.length} strategies worked`)

		if (successful > 0) {
			console.log('\n🏆 Best performing Halloween strategies:')
			results
				.filter(r => r.success)
				.forEach(r => console.log(`  • ${r.strategy} -> ${r.filename}`))
				
			console.log('\n💡 Recommendation: Use the best performing strategy for Halloween costumes')
		} else {
			console.log('\n⚠️  All strategies failed - check API configuration and limits')
		}

	} catch (error) {
		console.error('❌ Test failed:', error)
		process.exit(1)
	}
}

main()