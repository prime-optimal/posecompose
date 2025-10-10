import { describe, expect, it } from 'bun:test'
import { NanoGptProvider } from '@/lib/ai'
import {
	SAMPLE_COSTUME_REFERENCE_URL,
	SAMPLE_SELFIE_REFERENCE_URL,
} from '@/lib/ai'

const downloadBase64 = async (url: string) => {
	const response = await fetch(url)
	if (!response.ok) {
		throw new Error(`Failed to download asset from ${url}`)
	}
	const buffer = await response.arrayBuffer()
	return Buffer.from(buffer).toString('base64')
}

type EnvShape = {
	VITE_NANO_GPT_API_KEY?: string
	RUN_NANO_GPT_INTEGRATION?: string
}

const runtimeEnv = (import.meta as unknown as { env?: EnvShape }).env ?? {}
const apiKey = runtimeEnv.VITE_NANO_GPT_API_KEY ?? process.env.VITE_NANO_GPT_API_KEY
const runFlag = runtimeEnv.RUN_NANO_GPT_INTEGRATION ?? process.env.RUN_NANO_GPT_INTEGRATION

const shouldRunIntegration = Boolean(apiKey) && runFlag === 'true'

const DEFAULT_TIMEOUT = 30_000

const integration: typeof describe = (title, fn, ...rest) => {
	if (shouldRunIntegration) {
		describe(title, fn, ...rest)
	} else {
		describe.skip(title, fn, ...rest)
	}
}

const slowIt: typeof it = (name, fn, timeout = DEFAULT_TIMEOUT) => it(name, fn, timeout)

integration('NanoGptProvider integration (live)', () => {
	slowIt('generates image using background-remover with base64 selfie input', async () => {
		const provider = new NanoGptProvider({ apiKey })
		const selfieBase64 = await downloadBase64(SAMPLE_SELFIE_REFERENCE_URL)
		const response = await provider.generateImage({
			model: 'background-remover',
			prompt: 'Remove the background from the provided subject photo',
			references: [
				{
					id: 'user-selfie',
					kind: 'base64',
					value: selfieBase64,
					role: 'user',
					mimeType: 'image/jpeg',
				},
			],
		})

		expect(response.images.length).toBeGreaterThan(0)
	})

	slowIt('accepts mixed base64 and URL references for seedream-v4', async () => {
		const provider = new NanoGptProvider({ apiKey })
		const selfieBase64 = await downloadBase64(SAMPLE_SELFIE_REFERENCE_URL)

		const response = await provider.generateImage({
			model: 'seedream-v4',
			prompt: 'High quality studio portrait with costume makeover',
			references: [
				{
					id: 'user-selfie',
					kind: 'base64',
					value: selfieBase64,
					role: 'user',
				},
				{
					id: 'costume-url',
					kind: 'url',
					value: SAMPLE_COSTUME_REFERENCE_URL,
					role: 'costume',
				},
			],
		})

		expect(response.images.length).toBeGreaterThan(0)
	})

	slowIt('accepts mixed base64 and URL references for google:4@1', async () => {
		const provider = new NanoGptProvider({ apiKey })
		const selfieBase64 = await downloadBase64(SAMPLE_SELFIE_REFERENCE_URL)

		const response = await provider.generateImage({
			model: 'google:4@1',
			prompt: 'Editorial fashion photo with neon lighting',
			references: [
				{
					id: 'user-selfie',
					kind: 'base64',
					value: selfieBase64,
					role: 'user',
				},
				{
					id: 'costume-url',
					kind: 'url',
					value: SAMPLE_COSTUME_REFERENCE_URL,
					role: 'costume',
				},
			],
		})

		expect(response.images.length).toBeGreaterThan(0)
	})
})
