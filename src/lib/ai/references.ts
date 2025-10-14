import type { CostumeAsset, CostumePreset } from '@/types/costume'
import type { NanoGptModel, NanoGptReference } from './nano-gpt'
import { MODEL_REFERENCE_LIMITS } from './nano-gpt'

export const SAMPLE_SELFIE_REFERENCE_URL = 'https://f004.backblazeb2.com/file/waifu-test/uploads/11.jpeg'
export const SAMPLE_COSTUME_REFERENCE_URL = 'https://f004.backblazeb2.com/file/waifu-test/waifu-test/costumes/daisy-01.png'

interface BuildNanoGptReferencesOptions {
	costume: CostumePreset
	model: NanoGptModel
	selfieBase64?: string | null
	includeFallback?: boolean
	selfieMimeType?: string | null
}

const ensureAbsoluteUrl = (asset: CostumeAsset): string | null => {
	if (!asset.url) {
		return null
	}

	if (asset.url.startsWith('http://') || asset.url.startsWith('https://')) {
		return asset.url
	}

	if (typeof window !== 'undefined' && window.location) {
		try {
			return new URL(asset.url, window.location.origin).toString()
		} catch (error) {
			console.warn('Failed to resolve asset url', asset.url, error)
		}
	}

	return null
}

const uniqueUrls = (urls: string[]) => {
	const seen = new Set<string>()
	return urls.filter(url => {
		if (seen.has(url)) {
			return false
		}
		seen.add(url)
		return true
	})
}

export const buildNanoGptReferences = ({
	costume,
	model,
	selfieBase64,
	includeFallback = true,
	selfieMimeType,
}: BuildNanoGptReferencesOptions): NanoGptReference[] => {
	const limit = MODEL_REFERENCE_LIMITS[model]
 const isSelfieOnly = import.meta.env.VITE_DEBUG_SELFIE_ONLY === 'true'

	if (model === 'background-remover') {
		const references: NanoGptReference[] = []

		if (selfieBase64) {
			references.push({
				id: 'user-selfie',
				kind: 'base64',
				value: selfieBase64,
				role: 'user',
				weight: 1.2,
				mimeType: selfieMimeType ?? 'image/jpeg',
			})
		} else if (includeFallback) {
			references.push({
				id: 'fallback-selfie',
				kind: 'url',
				value: SAMPLE_SELFIE_REFERENCE_URL,
				role: 'user',
			})
		}

		return references.slice(0, limit)
	}

	const references: NanoGptReference[] = []

	if (selfieBase64) {
		references.push({
			id: 'user-selfie',
			kind: 'base64',
			value: selfieBase64,
			role: 'user',
			weight: 1.5,
			mimeType: selfieMimeType ?? 'image/jpeg',
		})
	}

	if (isSelfieOnly) {
		return references.slice(0, limit)
	}

	if (references.length >= limit) {
		return references.slice(0, limit)
	}

	const costumeUrls = uniqueUrls(
		costume.assets
			.filter(asset => asset.type === 'main' || asset.type === 'detail' || asset.type === 'example')
			.map(asset => ensureAbsoluteUrl(asset))
			.filter((value): value is string => Boolean(value))
	)

	costumeUrls.forEach((url, index) => {
		if (references.length < limit) {
			references.push({
				id: `costume-${index}`,
				kind: 'url',
				value: url,
				role: 'costume',
				weight: 1,
			})
		}
	})

	if (references.length < limit && includeFallback) {
		references.push({
			id: 'fallback-costume',
			kind: 'url',
			value: SAMPLE_COSTUME_REFERENCE_URL,
			role: 'costume',
		})

		if (!selfieBase64) {
			references.unshift({
				id: 'fallback-selfie',
				kind: 'url',
				value: SAMPLE_SELFIE_REFERENCE_URL,
				role: 'user',
			})
		}
	}

	return references.slice(0, limit)
}
