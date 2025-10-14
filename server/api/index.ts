import * as path from 'path'
import { fileURLToPath } from 'url'
import {
	getAllCostumes,
	getCostumeById,
	getFeaturedCostumes,
} from './neon-client.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url!))
const PROJECT_ROOT = path.resolve(__dirname, '..')
const ASSET_ROOT = path.join(PROJECT_ROOT, 'assets')

const API_PORT = Number.parseInt(process.env.API_PORT ?? '4000', 10)
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
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
	Object.entries(headers).forEach(([key, value]) => {
		response.headers.set(key, value)
	})
	return response
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

const serveStaticAsset = async (pathname: string, origin: string) => {
	const relativePath = pathname.replace(/^\/assets\//, '')
	const normalized = path.normalize(relativePath)
	const absolutePath = path.join(ASSET_ROOT, normalized)

	if (!absolutePath.startsWith(ASSET_ROOT)) {
		return notFound(origin)
	}

	const fs = await import('fs/promises')
	try {
		await fs.access(absolutePath)
	} catch {
		return notFound(origin)
	}

	const file = await fs.readFile(absolutePath)
	const response = new Response(file as any, {
		headers: {
			'Cache-Control': 'public, max-age=604800, immutable',
		},
	})

	return withCors(response, origin)
}

const handleApiRequest = async (url: URL, origin: string) => {
	if (url.pathname === '/api/health') {
		return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() }, 200, origin)
	}

	if (url.pathname === '/api/costumes') {
		const costumes = await getAllCostumes()
		return jsonResponse({ count: costumes.length, items: costumes }, 200, origin)
	}

	if (url.pathname === '/api/costumes/featured') {
		const costumes = await getFeaturedCostumes()
		return jsonResponse({ count: costumes.length, items: costumes }, 200, origin)
	}

	const costumeByIdMatch = url.pathname.match(/^\/api\/costumes\/([a-z0-9-_%@.]+)/i)
	if (costumeByIdMatch) {
		const costumeId = decodeURIComponent(costumeByIdMatch[1])
		const costume = await getCostumeById(costumeId)
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

const server = Bun.serve({
	port: API_PORT,
	fetch: async (request: Request) => {
		const { method } = request
		const url = new URL(request.url)
		const requestOrigin = request.headers.get('origin')
		const allowedOrigin = resolveAllowedOrigin(requestOrigin)

		if (method === 'OPTIONS') {
			const preflight = new Response(null, {
				status: 204,
				headers: {
					'Access-Control-Max-Age': '600',
				},
			})
			return withCors(preflight, allowedOrigin)
		}

		if (url.pathname.startsWith('/assets/')) {
			return serveStaticAsset(url.pathname, allowedOrigin)
		}

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
	},
})

console.log(`Neon costume API listening on ${server.url.origin}`)
