import handler from '../../../api/index.js'

const FUNCTION_PREFIX = '/.netlify/functions/api'
const API_PREFIX = '/api'

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
	const normalizedRequest = normalizeRequest(request)
	return handler(normalizedRequest)
}

export const config = {
	path: ['/api/*', '/.netlify/functions/api', '/.netlify/functions/api/*'],
}
