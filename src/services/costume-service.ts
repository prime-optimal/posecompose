import type { CostumePreset } from '@/types/costume'
import { HALLOWEEN_COSTUMES } from '@/data/costumes'

const getApiBaseUrl = () => {
	const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ''
	if (!rawBaseUrl) {
		return ''
	}
	return rawBaseUrl.replace(/\/$/, '')
}

const request = async <T>(endpoint: string): Promise<T> => {
	const baseUrl = getApiBaseUrl()
	const url = `${baseUrl}${endpoint}`
	const response = await fetch(url)

	if (!response.ok) {
		throw new Error(`Request failed: ${response.status}`)
	}

	return response.json() as Promise<T>
}

const extractItems = (payload: unknown): CostumePreset[] | null => {
	if (!payload || typeof payload !== 'object') {
		return null
	}

	if (Array.isArray(payload)) {
		return payload as CostumePreset[]
	}

	if ('items' in payload && Array.isArray((payload as { items: unknown }).items)) {
		return (payload as { items: CostumePreset[] }).items
	}

	return null
}

export const fetchCostumes = async (): Promise<CostumePreset[]> => {
	try {
		const payload = await request<unknown>('/api/costumes')
		const items = extractItems(payload)
		if (items && items.length) {
			return items
		}
	} catch (error) {
		console.error('Failed to fetch costumes from API, using fallback data.', error)
	}

	return HALLOWEEN_COSTUMES
}

export const fetchCostume = async (id: string): Promise<CostumePreset | undefined> => {
	try {
		const payload = await request<CostumePreset>(`/api/costumes/${encodeURIComponent(id)}`)
		if (payload) {
			return payload
		}
	} catch (error) {
		console.warn(`Costume ${id} not available via API, falling back to local data.`, error)
	}

	return HALLOWEEN_COSTUMES.find(costume => costume.id === id)
}

export const fetchFeaturedCostumes = async (): Promise<CostumePreset[]> => {
	try {
		const payload = await request<unknown>('/api/costumes/featured')
		const items = extractItems(payload)
		if (items && items.length) {
			return items
		}
	} catch (error) {
		console.warn('Failed to load featured costumes from API, falling back to local data.', error)
	}

	return HALLOWEEN_COSTUMES.filter(costume => costume.isFeatured)
}
