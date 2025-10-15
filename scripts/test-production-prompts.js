#!/usr/bin/env node

/**
 * Test script with production-ready virtual try-on prompts
 * Based on the detailed prompt structure provided
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

// Production-ready prompt strategies
const PRODUCTION_PROMPTS = [
	{
		name: 'System-Level Instruction',
		systemPrompt: `The first image provided is always the person's base portrait or full-body photo. All subsequent images are costume reference designs.
Your goal is to produce a photorealistic composite showing the same person (from the first image) wearing the costume(s) described by or shown in the later images.
Maintain the person's facial identity, body shape, and background lighting as realistically as possible. Match fabric texture, folds, and fit from the costume references. Blend shadows and perspective naturally.
If multiple costume references are provided (up to 5), integrate them into a cohesive outfit by following visible layering order and style continuity. Do not alter the person's pose, expression, or environment unless required for natural dressing alignment.
Output only the finished image of the person wearing the costume(s).`,
		
		userPrompt: `The user uploaded a personal photo (image 1). Apply the selected costume(s) from the following reference image(s) (image 2...N) to create a realistic virtual try-on result.`,
	},
	{
		name: 'Detailed Context Prompt',
		prompt: `The user uploaded image_1.jpg (their selfie). They selected multiple costume references from images 2-6. Create a realistic depiction of the same person from image_1 wearing those costume items proportionally and seamlessly. Ensure facial identity and lighting consistency are preserved.

Context:
- Costume theme: {{costume_theme}}
- Style keywords: realistic, photorealistic, detailed textures
- Environment consistency: match lighting, pose, and proportions
- If multiple costumes appear, integrate as layered outfit
- Preserve realism: correct skin tones, avoid facial distortion or color shifts
- Match tonal rendering of the person's skin and lighting to their original photo rather than the reference costume lighting`,
	},
	{
		name: 'Fantasy/Cinematic Style',
		prompt: `The first image is the user's portrait. Apply the costume elements from the subsequent reference images to create a fun, cinematic appearance while preserving the user's real facial features and realistic integration. Focus on seamless blending and maintaining the person's exact identity throughout the transformation.`,
	},
	{
		name: 'Retail/E-commerce Style',
		prompt: `Generate a clean, photorealistic composite where the user from the first image wears the selected garment(s) from the reference images, suitable for e-commerce visualization. Maintain exact facial features and realistic lighting integration. Prioritize the most distinct and detailed garment layer if conflicts occur.`,
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

async function testProductionPrompt(strategy, costume, selfieBase64) {
	console.log(`\n🧪 Testing: ${strategy.name}`)
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
			// For system/user prompt structure
			finalPrompt = `${strategy.systemPrompt}\n\n${strategy.userPrompt}`
		} else {
			// Replace template variables
			finalPrompt = (strategy.prompt || '').replace('{{costume_theme}}', costume.name || costume.category || 'fantasy costume')
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
			const filename = `production-${strategy.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.jpg`
			
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
	console.log('🎭 Production-Ready Virtual Try-On Prompt Testing')
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
		console.log(`📝 Description: ${costume.description?.substring(0, 100)}...`)

		// Get selfie as base64
		console.log(`\n📸 Fetching selfie from: ${SAMPLE_SELFIE_URL}`)
		const selfieBase64 = await fetchImageAsBase64(SAMPLE_SELFIE_URL)

		if (!selfieBase64) {
			console.error('❌ Failed to fetch selfie image')
			process.exit(1)
		}

		console.log(`✅ Selfie loaded (${selfieBase64.length} characters)`)

		// Test each production prompt strategy
		const results = []
		for (const strategy of PRODUCTION_PROMPTS) {
			const result = await testProductionPrompt(strategy, costume, selfieBase64)
			results.push({ strategy: strategy.name, ...result })
			
			// Wait between requests to avoid rate limiting
			await new Promise(resolve => setTimeout(resolve, 3000))
		}

		// Summary
		console.log('\n📊 Production Test Results Summary')
		console.log('='.repeat(60))
		
		results.forEach(result => {
			const status = result.success ? '✅' : '❌'
			const base64Info = result.hasBase64 ? ' (base64)' : ' (url)'
			console.log(`${status} ${result.strategy}${base64Info}: ${result.success ? result.filename : result.error}`)
		})

		const successful = results.filter(r => r.success).length
		console.log(`\n🎯 Success Rate: ${successful}/${results.length} strategies worked`)

		if (successful > 0) {
			console.log('\n🏆 Best performing strategies:')
			results
				.filter(r => r.success)
				.forEach(r => console.log(`  • ${r.strategy} -> ${r.filename}`))
				
			console.log('\n💡 Recommendation: Use the best performing strategy in production')
		} else {
			console.log('\n⚠️  All strategies failed - check API configuration and limits')
		}

	} catch (error) {
		console.error('❌ Test failed:', error)
		process.exit(1)
	}
}

main()