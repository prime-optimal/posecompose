import { logError, logEvent } from '@/lib/logger'

export type NanoGptModel = 'seedream-v4' | 'google:4@1' | 'background-remover'

export const MODEL_REFERENCE_LIMITS: Record<NanoGptModel, number> = {
	'seedream-v4': 10,
	'google:4@1': 4,
	'background-remover': 1,
}

export type NanoGptReferenceKind = 'url' | 'base64'

export interface NanoGptReference {
	id: string
	kind: NanoGptReferenceKind
	value: string
	role: 'user' | 'costume' | 'background'
	weight?: number
	mimeType?: string
}

export interface NanoGptGenerationRequest {
	model: NanoGptModel
	prompt: string
	references: NanoGptReference[]
	negativePrompt?: string
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
	baseUrl?: string
	fetchImpl?: typeof fetch
}

const DEFAULT_ENDPOINT = 'https://nano-gpt.com/v1/images/generations'
const MAX_ATTEMPTS = 3

const normalizeEndpoint = (baseUrl?: string) => {
	if (!baseUrl) {
		return DEFAULT_ENDPOINT
	}

	const trimmed = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
	return trimmed.includes('/v1/images/generations')
		? trimmed
		: `${trimmed}/v1/images/generations`
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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
				url,
				base64,
			}
		})
		.filter((image): image is NanoGptGeneratedImage => Boolean(image))
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

export class NanoGptProvider {
	private readonly apiKey?: string
	private readonly endpoint: string
	private readonly fetchImpl: typeof fetch

	constructor(options: NanoGptProviderOptions = {}) {
		this.apiKey = options.apiKey ?? import.meta.env.VITE_NANO_GPT_API_KEY
		const configuredBase = options.baseUrl ?? import.meta.env.VITE_NANO_GPT_BASE_URL
		this.endpoint = normalizeEndpoint(configuredBase)
		this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis)
	}

	isConfigured() {
		return Boolean(this.apiKey)
	}

	async generateImage(request: NanoGptGenerationRequest): Promise<NanoGptGenerationResponse> {
		if (!this.isConfigured()) {
			throw new Error('Nano GPT provider is not configured')
		}

		const requestBody = this.buildPayload(request)
		const referenceCount = Array.isArray(request.references)
			? Math.min(request.references.length, MODEL_REFERENCE_LIMITS[request.model])
			: 0
		let lastError: unknown

		for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
			try {
				logEvent('nano_gpt_generation_started', {
					model: request.model,
					references: referenceCount,
					attempt,
				})

				const response = await this.fetchImpl(this.endpoint, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${this.apiKey}`,
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

	private buildPayload(request: NanoGptGenerationRequest) {
		const limit = MODEL_REFERENCE_LIMITS[request.model]
		const references = request.references.slice(0, limit)

		if (!references.length) {
			throw new Error('Nano GPT requires at least one reference image')
		}

		const primary =
			references.find(reference => reference.role === 'user') ?? references[0]
		const secondary = references.filter(reference => reference !== primary)

		const serializeReference = (reference: NanoGptReference) => {
			if (reference.kind === 'url') {
				return reference.value
			}

			if (reference.value.startsWith('data:image/')) {
				return reference.value
			}

			const mime = reference.mimeType || 'image/jpeg'
			return `data:${mime};base64,${reference.value}`
		}

		const payload: Record<string, unknown> = {
			model: request.model,
			prompt: request.prompt,
			response_format: 'url',
		}

		payload.imageDataUrl = serializeReference(primary)

		if (secondary.length) {
			payload.imageDataUrls = secondary.map(serializeReference)
		}

		if (request.negativePrompt) {
			payload.negative_prompt = request.negativePrompt
		}

		if (request.options) {
			Object.entries(request.options).forEach(([key, value]) => {
				payload[key] = value
			})
		}

		return payload
	}
}
