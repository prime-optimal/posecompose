import { logError, logEvent } from '@/lib/logger'

export type NanoGptModel = 'seedream-v4' | 'google:4@1' | 'background-remover'

export const MODEL_REFERENCE_LIMITS: Record<NanoGptModel, number> = {
	'seedream-v4': 10,
	'google:4@1': 4,
	'background-remover': 1,
}

export type NanoGptReferenceKind = 'url' | 'base64' | 'file'

export interface NanoGptReference {
	id: string
	kind: NanoGptReferenceKind
	value: string
	role: 'user' | 'costume' | 'background'
	mimeType?: string
}

export interface NanoGptGenerationRequest {
	model: NanoGptModel
	prompt: string
	references: NanoGptReference[]
	negativePrompt?: string
	numOutputs?: number
	options?: Record<string, unknown>
}

export interface NanoGptGeneratedImage {
	id: string
	url?: string
	base64?: string
}

export type NanoGptGenerationStatus = 'queued' | 'processing' | 'succeeded' | 'failed'

export interface NanoGptGenerationResponse {
	id: string
	status: NanoGptGenerationStatus
	images: NanoGptGeneratedImage[]
	error?: string
	meta?: Record<string, unknown>
}

interface NanoGptProviderOptions {
	apiKey?: string
	fetchImpl?: typeof fetch
}

const V1_ENDPOINT = 'https://nano-gpt.com/v1/images/generations'
const MAX_ATTEMPTS = 3

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const fetchAndConvertToBase64 = async (source: string, mimeType: string = 'image/jpeg'): Promise<string> => {
	try {
		// Check if it's a URL or a local file path
		if (source.startsWith('http://') || source.startsWith('https://')) {
			// Handle URLs
			const response = await fetch(source)
			if (!response.ok) {
				throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
			}
			const arrayBuffer = await response.arrayBuffer()
			const base64 = Buffer.from(arrayBuffer).toString('base64')
			return `data:${mimeType};base64,${base64}`
		} else {
			// Handle local file paths
			const fs = await import('fs')
			const path = await import('path')
			
			// Resolve relative paths
			const absolutePath = path.resolve(source)
			
			// Check if file exists
			if (!fs.existsSync(absolutePath)) {
				throw new Error(`File not found: ${absolutePath}`)
			}
			
			// Read file and convert to base64
			const imageBuffer = fs.readFileSync(absolutePath)
			const base64 = imageBuffer.toString('base64')
			
			// Try to detect mime type from extension
			const ext = path.extname(absolutePath).toLowerCase()
			let detectedMimeType = mimeType
			if (ext === '.png') {
				detectedMimeType = 'image/png'
			} else if (ext === '.webp') {
				detectedMimeType = 'image/webp'
			} else if (ext === '.jpg' || ext === '.jpeg') {
				detectedMimeType = 'image/jpeg'
			}
			
			return `data:${detectedMimeType};base64,${base64}`
		}
	} catch (error) {
		console.error('Error converting image to base64:', error)
		throw error
	}
}

const safeParseJson = async (response: Response) => {
	try {
		return await response.json()
	} catch (error) {
		logError('nano_gpt_response_parse_failed', error, {
			status: response.status,
		})
		return null
	}
}

const normalizeImages = (payload: unknown): NanoGptGeneratedImage[] => {
	if (!payload) {
		return []
	}

	if (!Array.isArray(payload)) {
		return []
	}

	return payload
		.map((entry, index) => {
			if (!entry || typeof entry !== 'object') {
				return null
			}

			const record = entry as Record<string, unknown>
			const id = String(record.id ?? `image-${index}`)
			const url = typeof record.url === 'string'
				? record.url
				: typeof record.image_url === 'string'
					? record.image_url
					: undefined
			const base64 = typeof record.base64 === 'string'
				? record.base64
				: typeof record.b64_json === 'string'
					? record.b64_json
					: undefined

			if (!url && !base64) {
				return null
			}

			return {
				id,
				url: url || undefined,
				base64: base64 || undefined,
			}
		})
		.filter((image): image is NanoGptGeneratedImage => {
			return image !== null
		})
}

const normalizeResponse = (data: unknown): NanoGptGenerationResponse => {
	if (!data || typeof data !== 'object') {
		return {
			id: 'unknown',
			status: 'failed',
			images: [],
			error: 'Malformed response from Nano GPT provider',
		}
	}

	const record = data as Record<string, unknown>
	const id = typeof record.id === 'string' ? record.id : 'unknown'
	const status = (record.status as NanoGptGenerationStatus) ?? 'succeeded'

	const imagesSource = Array.isArray(record.images)
		? record.images
		: Array.isArray(record.data)
			? record.data
			: []

	return {
		id,
		status,
		images: normalizeImages(imagesSource),
		error: typeof record.error === 'string' ? record.error : undefined,
		meta: typeof record.meta === 'object' ? (record.meta as Record<string, unknown>) : undefined,
	}
}

export class NanoGptProviderV2 {
	private readonly apiKey?: string
	private readonly fetchImpl: typeof fetch

	constructor(options: NanoGptProviderOptions = {}) {
		this.apiKey = options.apiKey ?? import.meta.env.VITE_NANO_GPT_API_KEY
		this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
	}

	isConfigured() {
		return Boolean(this.apiKey)
	}

	async generateImage(request: NanoGptGenerationRequest): Promise<NanoGptGenerationResponse> {
		if (!this.isConfigured()) {
			throw new Error('Nano GPT provider is not configured')
		}

		const requestBody = await this.buildPayload(request)
		const referenceCount = Array.isArray(request.references)
			? Math.min(request.references.length, MODEL_REFERENCE_LIMITS[request.model])
			: 0
		let lastError: unknown

		logEvent('nano_gpt_payload_ready', {
			model: request.model,
			endpoint: V1_ENDPOINT,
			referenceCount,
			payloadSize: JSON.stringify(requestBody).length,
		})

		for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
			try {
				logEvent('nano_gpt_generation_started', {
					model: request.model,
					references: referenceCount,
					attempt,
				})

				const response = await this.fetchImpl(V1_ENDPOINT, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${this.apiKey}`,
					},
					body: JSON.stringify(requestBody),
				})

				if (!response.ok) {
					const errorBody = await safeParseJson(response)
					const message =
						errorBody?.error?.message ||
						errorBody?.message ||
						errorBody?.error ||
						`Nano GPT request failed with status ${response.status}`
					throw new Error(message)
				}

				const payload = (await response.json()) as unknown
				const normalized = normalizeResponse(payload)

				if (normalized.status === 'failed') {
					throw new Error(normalized.error || 'Nano GPT generation failed')
				}

				logEvent('nano_gpt_generation_completed', {
					model: request.model,
					referenceCount,
					attempt,
					imageCount: normalized.images.length,
				})

				return normalized
			} catch (error) {
				lastError = error
				logError('nano_gpt_generation_error', error, {
					attempt,
					model: request.model,
				})

				if (attempt < MAX_ATTEMPTS) {
					await sleep(300 * attempt)
				}
			}
		}

		throw lastError instanceof Error ? lastError : new Error('Unknown Nano GPT error')
	}

	private async buildPayload(request: NanoGptGenerationRequest) {
		const limit = MODEL_REFERENCE_LIMITS[request.model]
		const references = request.references.slice(0, limit)

		if (!references.length) {
			throw new Error('Nano GPT requires at least one reference image')
		}

		const primary =
			references.find(reference => reference.role === 'user') ?? references[0]
		const secondary = references.filter(reference => reference !== primary)

		const serializeReference = async (reference: NanoGptReference) => {
			if (reference.kind === 'url') {
				return reference.value
			}

			if (reference.value.startsWith('data:image/')) {
				return reference.value
			}

			if (reference.kind === 'file') {
				// Convert file to base64
				return await fetchAndConvertToBase64(reference.value, reference.mimeType || 'image/jpeg')
			}

			const mime = reference.mimeType || 'image/jpeg'
			return `data:${mime};base64,${reference.value}`
		}

		// V1 endpoint structure (OpenAI compatible)
		const payload: Record<string, unknown> = {
			model: request.model,
			prompt: request.prompt,
			n: request.numOutputs || 1,
		}

		// Only add size for models that support it
		if (request.model === 'seedream-v4') {
			// seedream-v4 doesn't support size parameter, omit it
		} else if (request.model === 'google:4@1') {
			// google:4@1 only supports 1024x1024
			payload.size = '1024x1024'
		}

		// For multiple images, use only imageDataUrls array (as per Python example)
		if (references.length > 1) {
			const allImageDataUrls = await Promise.all(references.map(serializeReference))
			payload.imageDataUrls = allImageDataUrls
		} else {
			// For single image, use imageDataUrl
			if (primary.kind === 'url' || primary.kind === 'file') {
				try {
					payload.imageDataUrl = await fetchAndConvertToBase64(primary.value, primary.mimeType || 'image/jpeg')
				} catch (error) {
					console.error('Failed to convert primary image to base64, falling back to original value:', error)
					payload.imageDataUrl = await serializeReference(primary)
				}
			} else {
				payload.imageDataUrl = await serializeReference(primary)
			}
		}

		// Add optional negative prompt
		if (request.negativePrompt) {
			payload.negative_prompt = request.negativePrompt
		}

		// Add any additional options
		if (request.options) {
			Object.entries(request.options).forEach(([key, value]) => {
				payload[key] = value
			})
		}

		return payload
	}
}