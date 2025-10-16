#!/usr/bin/env node

/**
 * Test alternative payload structures for NanoGPT API
 * Try different ways to send reference images to ensure selfie is used as primary
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

async function testAlternativePayload() {
	console.log('🧪 Testing Alternative Payload Structures')
	console.log('='.repeat(50))

	try {
		// Load costume data
		const costumes = await loadCostumePresets()
		const costume = costumes[0]

		if (!costume) {
			console.error('❌ No costumes found')
			process.exit(1)
		}

		// Get selfie as base64
		const selfieBase64 = await fetchImageAsBase64(SAMPLE_SELFIE_URL)
		if (!selfieBase64) {
			console.error('❌ Failed to fetch selfie image')
			process.exit(1)
		}

		// Build references
		const references = buildNanoGptReferences({
			costume,
			model: 'seedream-v4',
			selfieBase64,
			includeFallback: false,
		})

		console.log(`📊 Using ${references.length} references`)

		// Test different payload structures
		const payloadTests = [
			{
				name: 'Current Structure (imageDataUrl + imageDataUrls)',
				payload: {
					model: 'seedream-v4',
					prompt: 'Transform the person from the first image to wear the costume. Keep face exactly the same.',
					response_format: 'url',
					imageDataUrl: selfieBase64,
					imageDataUrls: references.slice(1).map(ref => ref.value)
				}
			},
			{
				name: 'Single Array Structure',
				payload: {
					model: 'seedream-v4',
					prompt: 'Transform the person from the first image to wear the costume. Keep face exactly the same.',
					response_format: 'url',
					imageDataUrls: references.map(ref => ref.value)
				}
			},
			{
				name: 'References Array Structure',
				payload: {
					model: 'seedream-v4',
					prompt: 'Transform the person from the first image to wear the costume. Keep face exactly the same.',
					response_format: 'url',
					references: references.map(ref => ({
						type: ref.kind,
						data: ref.value,
						weight: ref.weight || 1
					}))
				}
			},
			{
				name: 'Selfie Only (No Costume References)',
				payload: {
					model: 'seedream-v4',
					prompt: 'Transform this person to wear a Daisy costume. Keep face exactly the same.',
					response_format: 'url',
					imageDataUrl: selfieBase64
				}
			}
		]

		for (const test of payloadTests) {
			console.log(`\n🧪 Testing: ${test.name}`)
			console.log('─'.repeat(60))

			try {
				// Create a custom provider instance to test different payloads
				const provider = new NanoGptProvider({
					apiKey: process.env.VITE_NANO_GPT_API_KEY
				})

				// Manually call the API with custom payload
				const response = await fetch('https://nano-gpt.com/v1/images/generations', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${process.env.VITE_NANO_GPT_API_KEY}`,
					},
					body: JSON.stringify(test.payload),
				})

				if (!response.ok) {
					const errorText = await response.text()
					console.log(`❌ API Error: ${response.status} - ${errorText}`)
					continue
				}

				const result = await response.json()
				console.log(`✅ Success: ${result.status || 'completed'}`)
				console.log(`📊 Images: ${result.images?.length || 0}`)

				if (result.images?.length > 0) {
					const image = result.images[0]
					const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
					const filename = `test-${test.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.jpg`
					
					try {
						let imageBuffer
						if (image.base64) {
							const base64Data = image.base64.replace(/^data:image\/[a-z]+;base64,/, '')
							imageBuffer = Buffer.from(base64Data, 'base64')
						} else if (image.url) {
							const imageResponse = await fetch(image.url)
							imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
						} else {
							throw new Error('No image data')
						}
						
						require('fs').writeFileSync(filename, imageBuffer)
						console.log(`💾 Saved: ${filename}`)
					} catch (saveError) {
						console.log(`⚠️  Save failed: ${saveError.message}`)
					}
				}

			} catch (error) {
				console.log(`❌ Test failed: ${error.message}`)
			}

			// Wait between tests
			await new Promise(resolve => setTimeout(resolve, 2000))
		}

	} catch (error) {
		console.error('❌ Test failed:', error)
		process.exit(1)
	}
}

testAlternativePayload()