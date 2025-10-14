import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import { loadCostumePresets } from './utils/costume-loader.js'

const slugify = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+/, '')
		.replace(/-+$/, '')

const sentenceCase = (value: string) =>
	value
		.replace(/[-_]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/\b\w/g, char => char.toUpperCase())

const createSqlClient = () => {
	const url = process.env.NEON_DATABASE_URL
	if (!url) {
		throw new Error('NEON_DATABASE_URL is not set. Please add it to your environment before running the seed script.')
	}

	return neon(url)
}

const ensureTables = async (sql: NeonQueryFunction<false, false>) => {
	await sql`
		CREATE TABLE IF NOT EXISTS costume_categories (
			id TEXT PRIMARY KEY,
			slug TEXT UNIQUE NOT NULL,
			name TEXT NOT NULL,
			description TEXT,
			sort_order INTEGER DEFAULT 0,
			is_active BOOLEAN DEFAULT true,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			updated_at TIMESTAMPTZ DEFAULT NOW()
		)
	`

	await sql`
		CREATE TABLE IF NOT EXISTS costumes (
			id TEXT PRIMARY KEY,
			slug TEXT UNIQUE NOT NULL,
			name TEXT NOT NULL,
			description TEXT,
			category_id TEXT REFERENCES costume_categories(id) ON DELETE SET NULL,
			version TEXT,
			metadata JSONB NOT NULL,
			colors JSONB NOT NULL,
			transformation JSONB NOT NULL,
			marketing JSONB NOT NULL,
			affiliate_links JSONB NOT NULL,
			sort_order INTEGER DEFAULT 0,
			is_active BOOLEAN DEFAULT true,
			is_premium BOOLEAN DEFAULT false,
			is_new BOOLEAN DEFAULT false,
			is_featured BOOLEAN DEFAULT false,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			updated_at TIMESTAMPTZ DEFAULT NOW()
		)
	`

	await sql`
		CREATE TABLE IF NOT EXISTS costume_assets (
			id TEXT PRIMARY KEY,
			costume_id TEXT REFERENCES costumes(id) ON DELETE CASCADE,
			url TEXT NOT NULL,
			type TEXT NOT NULL,
			description TEXT,
			sort_order INTEGER DEFAULT 0,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)
	`
}

const upsertCategories = async (
	sql: NeonQueryFunction<false, false>,
	categories: Map<string, { id: string; name: string; description?: string; count: number }>,
) => {
	for (const [slug, category] of Array.from(categories.entries())) {
		await sql`
			INSERT INTO costume_categories (id, slug, name, description, sort_order, is_active, updated_at)
			VALUES (${category.id}, ${slug}, ${category.name}, ${category.description ?? null}, ${category.count}, true, NOW())
			ON CONFLICT (id) DO UPDATE SET
				name = EXCLUDED.name,
				description = EXCLUDED.description,
				sort_order = EXCLUDED.sort_order,
				is_active = EXCLUDED.is_active,
				updated_at = NOW()
		`
	}
}

interface UpsertOptions {
	preserveAssets?: boolean
}

const upsertCostume = async (
	sql: NeonQueryFunction<false, false>,
	costume: Awaited<ReturnType<typeof loadCostumePresets>>[number],
	categoryId: string,
	options: UpsertOptions = {},
) => {
	await sql`
		INSERT INTO costumes (
			id,
			slug,
			name,
			description,
			category_id,
			version,
			metadata,
			colors,
			transformation,
			marketing,
			affiliate_links,
			sort_order,
			is_active,
			is_premium,
			is_new,
			is_featured,
			created_at,
			updated_at
		)
		VALUES (
			${costume.id},
			${costume.id},
			${costume.name},
			${costume.description},
			${categoryId},
			${costume.version},
			${JSON.stringify(costume.metadata)}::jsonb,
			${JSON.stringify(costume.colors)}::jsonb,
			${JSON.stringify(costume.transformation)}::jsonb,
			${JSON.stringify(costume.marketing)}::jsonb,
			${JSON.stringify(costume.affiliateLinks)}::jsonb,
			${costume.metadata.popularityScore ?? 0},
			${costume.isActive},
			${costume.isPremium},
			${costume.isNew},
			${costume.isFeatured},
			${costume.createdAt},
			${costume.updatedAt}
		)
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			description = EXCLUDED.description,
			category_id = EXCLUDED.category_id,
			version = EXCLUDED.version,
			metadata = EXCLUDED.metadata,
			colors = EXCLUDED.colors,
			transformation = EXCLUDED.transformation,
			marketing = EXCLUDED.marketing,
			affiliate_links = EXCLUDED.affiliate_links,
			sort_order = EXCLUDED.sort_order,
			is_active = EXCLUDED.is_active,
			is_premium = EXCLUDED.is_premium,
			is_new = EXCLUDED.is_new,
			is_featured = EXCLUDED.is_featured,
			updated_at = NOW()
	`

	if (options.preserveAssets) {
		console.log(`Skipping asset sync for costume ${costume.id} (preserve-assets enabled)`)
		return
	}

	await sql`DELETE FROM costume_assets WHERE costume_id = ${costume.id}`

	const BASE_URL = "https://f004.backblazeb2.com/file/waifu-test/"

		function normalizeAssetUrl(url: string) {
		if (url.startsWith("assets/")) {
			return url.replace(/^assets\//, BASE_URL)
		}
		return url
		}

	for (const [index, asset] of Array.from(costume.assets.entries())) {
		await sql`
			INSERT INTO costume_assets (
				id,
				costume_id,
				url,
				type,
				description,
				sort_order,
				created_at
			)
			VALUES (
				${asset.id},
				${costume.id},
				${normalizeAssetUrl(asset.url)},
				${asset.type},
				${asset.description ?? null},
				${index},
				${costume.createdAt}
			)
			ON CONFLICT (id) DO UPDATE SET
				url = EXCLUDED.url,
				type = EXCLUDED.type,
				description = EXCLUDED.description,
				sort_order = EXCLUDED.sort_order,
				created_at = EXCLUDED.created_at
		`
	}
}

const main = async () => {
	const sql = createSqlClient()
	const args = new Set(process.argv.slice(2))
	const preserveAssets = args.has('--preserve-assets') || process.env.PRESERVE_ASSETS === 'true'

	try {
		console.log('Seeding Neon costumes...')
		if (preserveAssets) {
			console.log('Asset preservation mode enabled; existing costume_assets rows will remain untouched.')
		}
		await ensureTables(sql)

		const presets = await loadCostumePresets()
		const categories = new Map<string, { id: string; name: string; description?: string; count: number }>()

		for (const preset of presets) {
			const slug = slugify(preset.category || 'evergreen')
			if (!categories.has(slug)) {
				categories.set(slug, {
					id: `cat_${slug || 'general'}`,
					name: sentenceCase(preset.category || 'Evergreen'),
					description: `${sentenceCase(preset.category || 'Evergreen')} themed costumes`,
					count: 0,
				})
			}
			const category = categories.get(slug)!
			category.count += 1
		}

		await upsertCategories(sql, categories)

		let assetCount = 0
		for (const preset of presets) {
			const slug = slugify(preset.category || 'evergreen')
			const category = categories.get(slug)!
			await upsertCostume(sql, preset, category.id, { preserveAssets })
			assetCount += preset.assets.length
		}

		console.log(
			`Completed Neon seed: ${presets.length} costumes, ${categories.size} categories, ${assetCount} assets`,
		)
	} catch (error) {
		console.error('Failed to seed Neon costumes:', error)
		process.exitCode = 1
	}
}

void main()
