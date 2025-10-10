import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
	getAllCostumes,
	getCostumeById,
	getFeaturedCostumes,
} from './neon-client'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')
const ASSET_ROOT = path.join(PROJECT_ROOT, 'assets')

const API_PORT = Number.parseInt(process.env.API_PORT ?? '4000', 10)
const ALLOW_ORIGIN = process.env.API_ALLOW_ORIGIN ?? '*'

const jsonResponse = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body, null, 2), {
		status,
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': ALLOW_ORIGIN,
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			'Access-Control-Allow-Methods': 'GET, OPTIONS',
		},
	})

const withCors = (response: Response) => {
	response.headers.set('Access-Control-Allow-Origin', ALLOW_ORIGIN)
	response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
	response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
	return response
}

const notFound = () => jsonResponse({ error: 'Not found' }, 404)

const serveStaticAsset = async (pathname: string) => {
	const relativePath = pathname.replace(/^\/assets\//, '')
	const normalized = path.normalize(relativePath)
	const absolutePath = path.join(ASSET_ROOT, normalized)

	if (!absolutePath.startsWith(ASSET_ROOT)) {
		return notFound()
	}

	const file = Bun.file(absolutePath)
	if (!(await file.exists())) {
		return notFound()
	}

	const response = new Response(file, {
		headers: {
			'Cache-Control': 'public, max-age=604800, immutable',
		},
	})

	return withCors(response)
}

const handleApiRequest = async (url: URL) => {
	if (url.pathname === '/api/health') {
		return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() })
	}

	if (url.pathname === '/api/costumes') {
		const costumes = await getAllCostumes()
		return jsonResponse({ count: costumes.length, items: costumes })
	}

	if (url.pathname === '/api/costumes/featured') {
		const costumes = await getFeaturedCostumes()
		return jsonResponse({ count: costumes.length, items: costumes })
	}

	const costumeByIdMatch = url.pathname.match(/^\/api\/costumes\/([a-z0-9-_%@.]+)/i)
	if (costumeByIdMatch) {
		const costumeId = decodeURIComponent(costumeByIdMatch[1])
		const costume = await getCostumeById(costumeId)
		if (!costume) {
			return notFound()
		}
		return jsonResponse(costume)
	}

	return notFound()
}

const server = Bun.serve({
	port: API_PORT,
	fetch: async request => {
		const { method } = request
		const url = new URL(request.url)

		if (method === 'OPTIONS') {
			return withCors(new Response(null, { status: 204 }))
		}

		if (url.pathname.startsWith('/assets/')) {
			return serveStaticAsset(url.pathname)
		}

		if (url.pathname.startsWith('/api/')) {
			const response = await handleApiRequest(url)
			return withCors(response)
		}

		return notFound()
	},
})

console.log(`Neon costume API listening on ${server.url.origin}`)
