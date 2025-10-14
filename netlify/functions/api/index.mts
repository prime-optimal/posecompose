const FUNCTION_PREFIX = '/.netlify/functions/api'
const API_PREFIX = '/api'
const GLOBAL_HANDLER_KEY = '__posecomposeApiHandler'

type ApiHandler = (request: Request) => Promise<Response> | Response

let cachedHandler: ApiHandler | null = null

const resolveHandler = async (): Promise<ApiHandler> => {
	const override = (globalThis as Record<string, unknown>)[GLOBAL_HANDLER_KEY] as ApiHandler | undefined
	if (override) {
		return override
	}

	if (!cachedHandler) {
		const module = await import('../../../server/api/index.js')
		cachedHandler = module.default as ApiHandler
	}

	return cachedHandler
}

const normalizeRequest = (request: Request) => {
	const url = new URL(request.url)

	if (url.pathname === FUNCTION_PREFIX) {
		url.pathname = API_PREFIX
		return new Request(url, request)
	}

	if (url.pathname.startsWith(`${FUNCTION_PREFIX}/`)) {
		url.pathname = `${API_PREFIX}${url.pathname.slice(FUNCTION_PREFIX.length)}`
		return new Request(url, request)
	}

	return request
}

export default async (request: Request) => {
	const handler = await resolveHandler()
	const normalizedRequest = normalizeRequest(request)
	return handler(normalizedRequest)
}

export const config = {
	path: ['/api/*', '/.netlify/functions/api', '/.netlify/functions/api/*'],
}
