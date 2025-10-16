#!/usr/bin/env node

/**
 * Debug script to analyze reference image ordering and API payload
 * Check if user selfie is actually being sent as primary reference
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

async function debugReferenceOrder() {
	console.log('🔍 Debugging Reference Image Order')
	console.log('='.repeat(50))

	try {
		// Load costume data
		const costumes = await loadCostumePresets()
		const costume = costumes[0]

		if (!costume) {
			console.error('❌ No costumes found')
			process.exit(1)
		}

		console.log(`👗 Testing with costume: ${costume.name}`)

		// Get selfie as base64
		console.log(`\n📸 Fetching selfie from: ${SAMPLE_SELFIE_URL}`)
		const selfieBase64 = await fetchImageAsBase64(SAMPLE_SELFIE_URL)

		if (!selfieBase64) {
			console.error('❌ Failed to fetch selfie image')
			process.exit(1)
		}

		console.log(`✅ Selfie loaded (${selfieBase64.length} characters)`)

		// Build references
		const references = buildNanoGptReferences({
			costume,
			model: 'seedream-v4',
			selfieBase64,
			includeFallback: false,
		})

		console.log(`\n📊 References Built: ${references.length}`)
		references.forEach((ref, index) => {
			console.log(`  ${index + 1}. ${ref.id} (${ref.role}) - ${ref.kind} - weight: ${ref.weight || 'not set'}`)
			if (ref.kind === 'base64') {
				console.log(`     Base64 preview: ${ref.value.substring(0, 50)}...`)
			} else {
				console.log(`     URL: ${ref.value}`)
			}
		})

		// Create provider and build payload
		const provider = new NanoGptProvider({
			apiKey: process.env.VITE_NANO_GPT_API_KEY
		})

		// Manually build payload to inspect
		const limit = 10 // seedream-v4 limit
		const limitedReferences = references.slice(0, limit)

		const primary = limitedReferences.find(reference => reference.role === 'user') ?? limitedReferences[0]
		const secondary = limitedReferences.filter(reference => reference !== primary)

		console.log(`\n🎯 Primary Reference: ${primary.id} (${primary.role})`)
		console.log(`🎭 Secondary References: ${secondary.length} items`)

		const serializeReference = (reference) => {
			if (reference.kind === 'url') {
				return reference.value
			}
			if (reference.value.startsWith('data:image/')) {
				return reference.value
			}
			const mime = reference.mimeType || 'image/jpeg'
			return `data:${mime};base64,${reference.value}`
		}

		const payload = {
			model: 'seedream-v4',
			prompt: 'Test prompt: Transform the person from the first image to wear the costume from reference images. Keep face identical.',
			response_format: 'url',
			imageDataUrl: serializeReference(primary),
			imageDataUrls: secondary.map(serializeReference)
		}

		console.log(`\n📤 API Payload Structure:`)
		console.log(`  Model: ${payload.model}`)
		console.log(`  Prompt: "${payload.prompt}"`)
		console.log(`  Primary (imageDataUrl): ${payload.imageDataUrl.substring(0, 50)}...`)
		console.log(`  Secondary (imageDataUrls): ${payload.imageDataUrls.length} items`)
		payload.imageDataUrls.forEach((url, index) => {
			console.log(`    ${index + 1}. ${url.substring(0, 50)}...`)
		})

		// Test with a simple request to see what happens
		console.log(`\n🧪 Testing API call...`)
		const result = await provider.generateImage({
			model: 'seedream-v4',
			prompt: 'Transform the person from the first image to wear the costume from reference images. Keep the face exactly the same, only change clothing.',
			references: limitedReferences,
		})

		console.log(`\n✅ API Response:`)
		console.log(`  Status: ${result.status}`)
		console.log(`  Images: ${result.images.length}`)
		if (result.images.length > 0) {
			const image = result.images[0]
			console.log(`  Has URL: ${!!image.url}`)
			console.log(`  Has Base64: ${!!image.base64}`)
			console.log(`  Base64 length: ${image.base64 ? image.base64.length : 0}`)
		}

	} catch (error) {
		console.error('❌ Debug failed:', error)
		process.exit(1)
	}
}

debugReferenceOrder()