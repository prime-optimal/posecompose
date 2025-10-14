import { afterEach, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test'

type ApiModule = typeof import('../api/index.mts')

const GLOBAL_HANDLER_KEY = '__posecomposeApiHandler'

const handlerImplementation = async (request: Request) =>
	new Response(`handled:${new URL(request.url).pathname}`, { status: 200 })

const handlerMock: any = mock(handlerImplementation)

const applyHandlerImplementation = () => {
	(handlerMock as any).mockImplementation?.(handlerImplementation)
}

const setHandlerOverride = () => {
	;(handlerMock as any).mockReset?.()
	applyHandlerImplementation()
	;(globalThis as Record<string, unknown>)[GLOBAL_HANDLER_KEY] = handlerMock
}

const clearHandlerOverride = () => {
	delete (globalThis as Record<string, unknown>)[GLOBAL_HANDLER_KEY]
}

const getCalledRequest = (): Request => {
	const calls = (handlerMock as { mock: { calls: unknown[][] } }).mock?.calls ?? []
	const firstCall = calls[0]?.[0]
	if (!(firstCall instanceof Request)) {
		throw new Error('Expected handler to receive a Request')
	}
	return firstCall
}

process.env.VERCEL = process.env.VERCEL ?? '1'

const moduleLoaders: Array<{ label: string; loader: () => Promise<ApiModule> }> = [
	{
		label: 'server/netlify/functions/api',
		loader: () => import('../api/index.mts'),
	},
	{
		label: 'netlify/functions/api',
		loader: () => import('../../../../netlify/functions/api/index.mts'),
	},
]

for (const { label, loader } of moduleLoaders) {
	describe(`${label} handler`, () => {
		let apiModule: any

		beforeAll(async () => {
			apiModule = await loader()
		})

		beforeEach(() => {
			setHandlerOverride()
		})

		afterEach(() => {
			clearHandlerOverride()
		})

		it('normalizes root Netlify function path to /api', async () => {
			const request = new Request('https://example.com/.netlify/functions/api')
			const response = await apiModule.default(request)

			expect(response.status).toBe(200)
			const calledRequest = getCalledRequest()
			expect(calledRequest).toBeInstanceOf(Request)
			expect(new URL(calledRequest.url).pathname).toBe('/api')
		})

		it('normalizes nested Netlify function paths while preserving query', async () => {
			const request = new Request(
				'https://example.com/.netlify/functions/api/costumes/featured?limit=4',
			)
			await apiModule.default(request)

			const calledRequest = getCalledRequest()
			expect(new URL(calledRequest.url).pathname).toBe('/api/costumes/featured')
			expect(new URL(calledRequest.url).search).toBe('?limit=4')
		})

		it('passes through already normalized /api requests unchanged', async () => {
			const request = new Request('https://example.com/api/costumes')
			await apiModule.default(request)

			const calledRequest = getCalledRequest()
			expect(calledRequest).toBe(request)
		})

		it('exposes Netlify routing config for friendly paths', () => {
			expect(apiModule.config.path).toEqual([
				'/api/*',
				'/.netlify/functions/api',
				'/.netlify/functions/api/*',
			])
		})
	})
}
