import { describe, expect, it } from 'bun:test'
import { HALLOWEEN_COSTUMES } from '@/data/costumes'
import {
	buildNanoGptReferences,
	MODEL_REFERENCE_LIMITS,
	SAMPLE_COSTUME_REFERENCE_URL,
	SAMPLE_SELFIE_REFERENCE_URL,
} from '@/lib/ai'

describe('buildNanoGptReferences', () => {
	it('prioritizes the user selfie and respects model limits', () => {
		const costume = HALLOWEEN_COSTUMES[0]
	const selfie = 'dGVzdC1zZWxmaWU='
		const references = buildNanoGptReferences({
			costume,
			model: 'google:4@1',
			selfieBase64: selfie,
		})

		expect(references[0]?.id).toBe('user-selfie')
		expect(references[0]?.kind).toBe('base64')
		expect(references.length).toBeLessThanOrEqual(
			MODEL_REFERENCE_LIMITS['google:4@1'],
		)
	})

	it('falls back to sample assets when costume references are unavailable', () => {
		const baseCostume = HALLOWEEN_COSTUMES[0]
		const costume = {
			...baseCostume,
			assets: [],
		}

		const references = buildNanoGptReferences({
			costume,
			model: 'seedream-v4',
			selfieBase64: null,
		})

		expect(references.some(reference => reference.value === SAMPLE_COSTUME_REFERENCE_URL)).toBe(true)
		const userReference = references.find(reference => reference.role === 'user')
		expect(userReference?.value).toBe(SAMPLE_SELFIE_REFERENCE_URL)
	})

	it('includes costume URLs alongside base64 selfie data when provided', () => {
		const baseCostume = HALLOWEEN_COSTUMES[0]
		const costume = {
			...baseCostume,
			assets: [
				{
					...baseCostume.assets[0],
					url: 'https://example.com/costume/main.jpg',
				},
				{
					...baseCostume.assets[1],
					url: 'https://example.com/costume/detail.jpg',
				},
			],
		}

		const selfieBase64 = 'dGVzdC1zZWxmaWUtYmFzZTY0'
		const references = buildNanoGptReferences({
			costume,
			model: 'seedream-v4',
			selfieBase64,
			includeFallback: false,
		})

		const selfieReference = references.find(reference => reference.id === 'user-selfie')
		expect(selfieReference?.kind).toBe('base64')
		expect(selfieReference?.value).toBe(selfieBase64)

		const urlReferences = references.filter(reference => reference.kind === 'url')
		expect(urlReferences.length).toBeGreaterThan(0)
		expect(urlReferences.every(reference => reference.value.startsWith('https://example.com/'))).toBe(true)
		const limit = MODEL_REFERENCE_LIMITS['seedream-v4']
		expect(references.length).toBeLessThanOrEqual(limit)
	})

	it('only returns user references for the background-remover model', () => {
		const costume = HALLOWEEN_COSTUMES[0]
		const references = buildNanoGptReferences({
			costume,
			model: 'background-remover',
			selfieBase64: null,
		})

		expect(references.length).toBeLessThanOrEqual(
			MODEL_REFERENCE_LIMITS['background-remover'],
		)
		expect(references.every(reference => reference.role === 'user')).toBe(true)
	})
})
