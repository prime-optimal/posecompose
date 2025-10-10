import { promises as fs } from 'node:fs'
import path from 'node:path'
import type {
	CostumeAffiliateLink,
	CostumeAsset,
	CostumePreset,
} from '../../src/types/costume'

interface LegacyCostume {
	id: string
	display_name: string
	prompt: string
	negative_prompt?: string
	reference_image_url?: string
	thumbnail_url?: string
	affiliate_url?: string
	tags: string[]
	model_id?: string
	reference_images?: string[]
}

const PROJECT_ROOT = path.resolve(import.meta.dir, '../..')
const COSTUME_JSON_PATH = path.join(PROJECT_ROOT, 'costumes.json')
const ASSETS_ROOT = path.join(PROJECT_ROOT, 'assets')
const PRIMARY_KEYWORDS = ['square', 'profile', 'front']

const COLOR_PALETTES = [
	{
		primary: '#FF69B4',
		secondary: '#FFE066',
		accent: '#6C5CE7',
		palette: ['#FF69B4', '#FFE066', '#6C5CE7', '#A0E7E5', '#B388FF'],
	},
	{
		primary: '#6C5CE7',
		secondary: '#FFB3C6',
		accent: '#00C2A8',
		palette: ['#6C5CE7', '#FFB3C6', '#00C2A8', '#FFD166', '#F25F5C'],
	},
	{
		primary: '#FF8A80',
		secondary: '#81D4FA',
		accent: '#F48FB1',
		palette: ['#FF8A80', '#81D4FA', '#F48FB1', '#A7FF83', '#FFD54F'],
	},
	{
		primary: '#B388FF',
		secondary: '#FFAB91',
		accent: '#80DEEA',
		palette: ['#B388FF', '#FFAB91', '#80DEEA', '#C5E1A5', '#FFD180'],
	},
]

const ensureLeadingSlash = (value: string) => (value.startsWith('/') ? value : `/${value}`)

const slugify = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+/, '')
		.replace(/-+$/, '')

const pickPalette = (key: string) => {
	const hash = key
		.split('')
		.reduce((sum, char) => sum + char.charCodeAt(0), 0)
	return COLOR_PALETTES[hash % COLOR_PALETTES.length]
}

const sentenceCase = (value: string) =>
	value
		.replace(/[-_]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/\b\w/g, char => char.toUpperCase())

const fileExists = async (filePath: string) => {
	try {
		await fs.access(filePath)
		return true
	} catch {
		return false
	}
}

const toWebPath = (absolutePath: string) => {
	const relative = path.relative(PROJECT_ROOT, absolutePath)
	return ensureLeadingSlash(relative.split(path.sep).join('/'))
}

const toAffiliateSource = (url?: string): CostumeAffiliateLink['source'] => {
	if (!url) return 'Other'

	try {
		const host = new URL(url).hostname.toLowerCase()
		if (host.includes('amazon')) return 'Amazon'
		if (host.includes('aliexpress')) return 'AliExpress'
		if (host.includes('etsy')) return 'Etsy'
		if (host.includes('spirit')) return 'SpiritHalloween'
		return 'Other'
	} catch {
		return 'Other'
	}
}

const gatherReferenceAssets = async (
	costume: LegacyCostume,
): Promise<CostumeAsset[]> => {
	const seen = new Set<string>()
	const entries: { absolute: string; webPath: string; filename: string }[] = []
	const referenceImages = costume.reference_images ?? []

	for (const referenceImage of referenceImages) {
		const normalized = referenceImage.replace(/^\.\//, '')
		const absolutePath = path.isAbsolute(normalized)
			? normalized
			: path.join(PROJECT_ROOT, normalized)

		if (!absolutePath.startsWith(ASSETS_ROOT)) {
			continue
		}

		if (!(await fileExists(absolutePath))) {
			continue
		}

		const webPath = toWebPath(absolutePath)
		if (seen.has(webPath)) {
			continue
		}

		seen.add(webPath)
		entries.push({
			absolute: absolutePath,
			webPath,
			filename: path.basename(absolutePath),
		})
	}

	if (!entries.length && costume.reference_image_url) {
		entries.push({
			absolute: costume.reference_image_url,
			webPath: costume.reference_image_url,
			filename: path.basename(costume.reference_image_url),
		})
	}

	const primaryEntry =
		entries.find(entry =>
			PRIMARY_KEYWORDS.some(keyword => entry.filename.toLowerCase().includes(keyword)),
		)
		|| entries[0]

	return entries.map((entry, index) => ({
		id: `${costume.id}-asset-${index}`,
		url: entry.webPath,
		type: primaryEntry && entry.webPath === primaryEntry.webPath ? 'main' : 'detail',
		description: sentenceCase(path.parse(entry.filename).name),
	}))
}

const buildAffiliateLinks = (costume: LegacyCostume): CostumeAffiliateLink[] => {
	if (!costume.affiliate_url) {
		return []
	}

	return [
		{
			id: `${costume.id}-affiliate`,
			label: `${costume.display_name} Costume`,
			url: costume.affiliate_url,
			source: toAffiliateSource(costume.affiliate_url),
		},
	]
}

export const loadCostumePresets = async (): Promise<CostumePreset[]> => {
	const rawJson = await fs.readFile(COSTUME_JSON_PATH, 'utf8')
	const legacyCostumes: LegacyCostume[] = JSON.parse(rawJson)
	const now = new Date().toISOString()

	const presets: CostumePreset[] = []

	for (const [index, costume] of legacyCostumes.entries()) {
		const assets = await gatherReferenceAssets(costume)
		const palette = pickPalette(costume.id)

		const mainAsset = assets.find(asset => asset.type === 'main')
		if (!mainAsset && costume.reference_image_url) {
			assets.unshift({
				id: `${costume.id}-remote-main`,
				url: costume.reference_image_url,
				type: 'main',
				description: `${costume.display_name} reference`,
			})
		}

		if (costume.thumbnail_url && !assets.some(asset => asset.url === costume.thumbnail_url)) {
			assets.push({
				id: `${costume.id}-thumbnail`,
				url: costume.thumbnail_url,
				type: 'example',
				description: `${costume.display_name} thumbnail`,
			})
		}

		const negativePrompts = costume.negative_prompt
			? costume.negative_prompt
					.split(',')
					.map(entry => entry.trim())
					.filter(Boolean)
			: []

		const shortDescription = `Outfit swap inspired by ${costume.display_name}`

		presets.push({
			id: costume.id,
			name: costume.display_name,
			category: costume.tags?.[0] ?? 'evergreen',
			description: costume.prompt,
			version: '1.0.0',
			assets,
			colors: palette,
			transformation: {
				base: costume.prompt,
				variations: [
					{
						style: 'default',
						prompt: `${costume.prompt} | ${shortDescription}`,
					},
					{
						style: 'cinematic',
						prompt: `${costume.prompt} with cinematic lighting, dramatic highlights, high fidelity fabric details`,
					},
				],
				negativePrompts,
				qualityModifiers: ['studio lighting', 'high detail', 'color accuracy'],
				detailEnhancements: ['costume accuracy', 'fabric texture enhancement', 'accessory emphasis'],
			},
			metadata: {
				difficulty: 'medium',
				tags: costume.tags ?? [],
				compatibleModels: costume.model_id ? [costume.model_id] : ['seedream-v4'],
				estimatedProcessingTime: 45,
				season: 'evergreen',
				popularityScore: Math.min(10, 7 + (index % 4)),
			},
			marketing: {
				displayName: costume.display_name,
				shortDescription,
				socialPreview: `Transform into ${costume.display_name} with AI-enhanced outfit swap`,
				callToAction: `Generate the ${costume.display_name} look`,
			},
			affiliateLinks: buildAffiliateLinks(costume),
			isActive: true,
			isPremium: false,
			isNew: index < 6,
			isFeatured: index < 3,
			createdAt: now,
			updatedAt: now,
			notes: 'Imported from baseline JSON dataset',
			inspiration: costume.display_name,
		})
	}

	return presets
}

export const loadCostumePresetsGroupedByCategory = async () => {
	const presets = await loadCostumePresets()
	return presets.reduce<Record<string, CostumePreset[]>>((groups, preset) => {
		if (!groups[preset.category]) {
			groups[preset.category] = []
		}
		groups[preset.category].push(preset)
		return groups
	}, {})
}

export const primaryKeywords = PRIMARY_KEYWORDS

export type { LegacyCostume }
