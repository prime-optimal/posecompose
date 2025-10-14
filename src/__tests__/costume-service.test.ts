import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'
import { fetchCostumes } from '@/services/costume-service.js'

const buildResponse = (payload: unknown) =>
	new Response(JSON.stringify(payload), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	})

const fetchMock = mock(async () => buildResponse({ items: [] }))

const originalFetch = globalThis.fetch
const originalEnv = (import.meta as Record<string, unknown>).env

const setApiBaseUrl = (value: string | undefined) => {
	const envContainer = (import.meta as Record<string, unknown>).env
	if (envContainer && typeof envContainer === 'object') {
		if (value === undefined) {
			delete (envContainer as Record<string, string>).VITE_API_BASE_URL
			return
		}
		(envContainer as Record<string, string>).VITE_API_BASE_URL = value
		return
	}

	const nextEnv = value ? { VITE_API_BASE_URL: value } : {}
	Object.defineProperty(import.meta, 'env', {
		value: nextEnv,
		configurable: true,
	})
}

beforeAll(() => {
	globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch
})

afterAll(() => {
	globalThis.fetch = originalFetch
	if (originalEnv) {
		Object.defineProperty(import.meta, 'env', {
			value: originalEnv,
			configurable: true,
		})
	} else {
		delete (import.meta as Record<string, unknown>).env
	}
})

beforeEach(() => {
	fetchMock.mockReset()
	fetchMock.mockImplementation(async () => buildResponse({ items: [] }))
	setApiBaseUrl(undefined)
})

afterEach(() => {
	fetchMock.mockReset()
})

describe('costume-service request base URL', () => {
	it('uses relative /api path when VITE_API_BASE_URL is unset', async () => {
		await fetchCostumes()

		expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/costumes')
	})

	it('prefixes requests with VITE_API_BASE_URL without duplicating slashes', async () => {
		setApiBaseUrl('https://example.com/.netlify/functions/')

		await fetchCostumes()

		expect(fetchMock.mock.calls[0]?.[0]).toBe(
			'https://example.com/.netlify/functions/api/costumes',
		)
	})
})
