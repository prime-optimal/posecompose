#!/usr/bin/env node

/**
 * Test script to validate AI reference image fixes
 * Tests different prompt strategies for virtual try-on
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

// Test different prompt strategies for virtual try-on
const PROMPT_STRATEGIES = [
	{
		name: 'Virtual Try-On Direct',
		prompt: 'Virtual try-on: Put the person from the first image into the costume from the reference images. Keep the face and identity exactly the same, only change the clothing.',
	},
	{
		name: 'Outfit Swap',
		prompt: 'Outfit swap: Replace the clothing of the person in the first image with the costume shown in the references. Preserve the exact face and identity.',
	},
	{
		name: 'Costume Application',
		prompt: 'Apply the costume from the reference images to the person in the first image. The face must remain identical - same person, same features.',
	},
	{
		name: 'Digital Dressing',
		prompt: 'Digital dressing: Dress the person from the first image in the costume shown in the references. Keep facial features and identity perfectly preserved.',
	},
	{
		name: 'AI Try-On',
		prompt: 'AI virtual try-on: Transform the outfit of the person in the first image to match the costume references. Face and identity must not change.',
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

async function testPromptStrategy(strategy, costume, selfieBase64) {
	console.log(`\n🧪 Testing: ${strategy.name}`)
	console.log(`📝 Prompt: "${strategy.prompt}"`)
	console.log('─'.repeat(60))

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

		const result = await provider.generateImage({
			model: 'seedream-v4',
			prompt: strategy.prompt,
			references,
		})

		if (result.images.length > 0) {
			const imageUrl = result.images[0].url
			console.log(`✅ Success: ${imageUrl}`)
			
			// Save result with strategy name
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
			const filename = `ai-test-${strategy.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.jpg`
			
			try {
				const imageResponse = await fetch(imageUrl)
				const arrayBuffer = await imageResponse.arrayBuffer()
				const buffer = Buffer.from(arrayBuffer)
				require('fs').writeFileSync(filename, buffer)
				console.log(`💾 Saved: ${filename}`)
			} catch (saveError) {
				console.log(`⚠️  Could not save image: ${saveError.message}`)
			}
			
			return { success: true, url: imageUrl, filename }
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
	console.log('🎭 AI Reference Image Fix Testing')
	console.log('='.repeat(50))

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

		// Get selfie as base64
		console.log(`\n📸 Fetching selfie from: ${SAMPLE_SELFIE_URL}`)
		const selfieBase64 = await fetchImageAsBase64(SAMPLE_SELFIE_URL)

		if (!selfieBase64) {
			console.error('❌ Failed to fetch selfie image')
			process.exit(1)
		}

		console.log(`✅ Selfie loaded (${selfieBase64.length} characters)`)

		// Test each prompt strategy
		const results = []
		for (const strategy of PROMPT_STRATEGIES) {
			const result = await testPromptStrategy(strategy, costume, selfieBase64)
			results.push({ strategy: strategy.name, ...result })
			
			// Wait between requests to avoid rate limiting
			await new Promise(resolve => setTimeout(resolve, 2000))
		}

		// Summary
		console.log('\n📊 Test Results Summary')
		console.log('='.repeat(50))
		
		results.forEach(result => {
			const status = result.success ? '✅' : '❌'
			console.log(`${status} ${result.strategy}: ${result.success ? result.url : result.error}`)
		})

		const successful = results.filter(r => r.success).length
		console.log(`\n🎯 Success Rate: ${successful}/${results.length} strategies worked`)

		if (successful > 0) {
			console.log('\n🏆 Best performing strategies:')
			results
				.filter(r => r.success)
				.forEach(r => console.log(`  • ${r.strategy}`))
		}

	} catch (error) {
		console.error('❌ Test failed:', error)
		process.exit(1)
	}
}

main()