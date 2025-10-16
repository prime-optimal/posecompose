import {
	getAllCostumesV2,
	getCostumeByIdV2,
	getFeaturedCostumes,
} from './neon-client-v2.js'

// Load environment variables from root directory
import { config } from 'dotenv'
config({ path: '../.env' })

const ALLOW_ORIGIN = process.env.API_ALLOW_ORIGIN ?? '*'
const LOG_SINK = process.env.LOG_SINK ?? 'stdout'

type LogLevel = 'info' | 'error'

interface IngestedLogEntry {
	event: string
	level: LogLevel
	timestamp: string
	[key: string]: unknown
}

const parseAllowedOrigins = () =>
	ALLOW_ORIGIN.split(',')
		.map(origin => origin.trim())
		.filter(Boolean)

const ALLOWED_ORIGINS = parseAllowedOrigins()
const ALLOW_WILDCARD = ALLOWED_ORIGINS.includes('*')

const resolveAllowedOrigin = (requestOrigin: string | null) => {
	if (ALLOW_WILDCARD) {
		if (requestOrigin) {
			return requestOrigin
		}
		return '*'
	}

	if (!requestOrigin) {
		return ALLOWED_ORIGINS[0] ?? '*'
	}

	const normalizedOrigin = requestOrigin.toLowerCase()
	const match = ALLOWED_ORIGINS.find(origin => origin.toLowerCase() === normalizedOrigin)
	return match ?? 'null'
}

const buildCorsHeaders = (origin: string) => {
	const headers: Record<string, string> = {
		'Access-Control-Allow-Origin': origin,
		'Access-Control-Allow-Headers': 'Content-Type, Authorization, content-type',
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		Vary: 'Origin',
	}

	if (origin !== '*' && origin !== 'null') {
		headers['Access-Control-Allow-Credentials'] = 'true'
	}

	return headers
}

const withCors = (response: Response, origin: string) => {
	const headers = buildCorsHeaders(origin)
	const newResponse = new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: { ...response.headers, ...headers }
	})
	return newResponse
}

const jsonResponse = (body: unknown, status: number, origin: string) =>
	withCors(
		new Response(JSON.stringify(body, null, 2), {
			status,
			headers: {
				'Content-Type': 'application/json',
			},
		}),
		origin,
	)

const emptyResponse = (status: number, origin: string) =>
	withCors(new Response(null, { status }), origin)

const notFound = (origin: string) => jsonResponse({ error: 'Not found' }, 404, origin)


const handleApiRequest = async (url: URL, origin: string) => {
	if (url.pathname === '/api/health') {
		return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() }, 200, origin)
	}

	if (url.pathname === '/api/costumes') {
	const costumes = await getAllCostumesV2()
		return jsonResponse({ count: costumes.length, items: costumes }, 200, origin)
	}

	if (url.pathname === '/api/costumes/featured') {
		const costumes = await getAllCostumesV2()
		return jsonResponse({ count: costumes.length, items: costumes }, 200, origin)
	}

	const costumeByIdMatch = url.pathname.match(/^\/api\/costumes\/([a-z0-9-_%@.]+)/i)
	if (costumeByIdMatch && costumeByIdMatch[1]) {
		const costumeId = decodeURIComponent(costumeByIdMatch[1])
		const costume = await getCostumeByIdV2(costumeId)
		if (!costume) {
			return notFound(origin)
		}
		return jsonResponse(costume, 200, origin)
	}

	return notFound(origin)
}

const isLogLevel = (level: unknown): level is LogLevel =>
	level === 'info' || level === 'error'

const emitLog = (entry: IngestedLogEntry) => {
	const payload = {
		...entry,
		receivedAt: new Date().toISOString(),
	}

	if (LOG_SINK === 'stdout' || LOG_SINK === 'console') {
		if (entry.level === 'error') {
			console.error('[PoseCompose]', payload)
			return
		}
		console.info('[PoseCompose]', payload)
		return
	}

	console.warn('[PoseCompose] Unsupported LOG_SINK, defaulting to console', {
		sink: LOG_SINK,
	})
	console.info('[PoseCompose]', payload)
}

const handleLogIngest = async (request: Request, origin: string) => {
	let payload: unknown
	try {
		payload = await request.json()
	} catch (error) {
		return jsonResponse({ error: 'Invalid JSON payload' }, 400, origin)
	}

	if (!payload || typeof payload !== 'object') {
		return jsonResponse({ error: 'Log payload must be an object' }, 400, origin)
	}

	const record = payload as Record<string, unknown>
	const { event, level, timestamp } = record

	if (typeof event !== 'string' || !event.trim()) {
		return jsonResponse({ error: 'Log payload requires a non-empty "event"' }, 400, origin)
	}

	if (!isLogLevel(level)) {
		return jsonResponse({ error: 'Log payload must include a valid "level"' }, 400, origin)
	}

	if (typeof timestamp !== 'string' || !timestamp.trim()) {
		return jsonResponse({ error: 'Log payload must include a timestamp' }, 400, origin)
	}

	emitLog(record as IngestedLogEntry)
	return emptyResponse(204, origin)
}

const API_PORT = process.env.PORT ? Number(process.env.PORT) : 4000

// Shared request handler that works in both Node (Vercel) and Bun
async function handler(request: Request): Promise<Response> {
	const { method } = request
	
	// use absolute URL when running locally; use resolved base otherwise
	const url = new URL(
		request.url,
		process.env.VERCEL_URL
			? `https://${process.env.VERCEL_URL}`
			: 'http://localhost:4000'
	)
	
	const requestOrigin =
		typeof request.headers?.get === 'function'
			? request.headers.get('origin')
			: (request.headers as unknown as Record<string, string>)?.origin ?? (request.headers as unknown as Record<string, string>)?.Origin ?? null
  const allowedOrigin = resolveAllowedOrigin(requestOrigin)

  // CORS preflight
  if (method === 'OPTIONS') {
    const preflight = new Response(null, {
      status: 204,
      headers: { 'Access-Control-Max-Age': '600' },
    })
    return withCors(preflight, allowedOrigin)
  }

  // API routes
  if (url.pathname.startsWith('/api/')) {
    if (url.pathname === '/api/logs') {
      if (method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405, allowedOrigin)
      }
      return handleLogIngest(request, allowedOrigin)
    }

    const response = await handleApiRequest(url, allowedOrigin)
    return withCors(response, allowedOrigin)
  }

  return notFound(allowedOrigin)
}

// ----- Conditional local server using Bun -----
if (typeof (globalThis as typeof globalThis & { Bun?: { serve: (options: { port: number; fetch: (request: Request) => Promise<Response> }) => { url: { origin: string } } } }).Bun !== 'undefined' && !process.env.VERCEL) {
  console.log(`🌀  Running local Bun server on http://localhost:${API_PORT}`)
  const server = (globalThis as typeof globalThis & { Bun: { serve: (options: { port: number; fetch: (request: Request) => Promise<Response> }) => { url: { origin: string } } } }).Bun.serve({ port: API_PORT, fetch: handler })
  console.log(`Neon costume API is listening on ${server.url.origin}`)
}

// ----- Vercel / Node expects the function export -----
export default handler
