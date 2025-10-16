import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import type { CostumeAsset, CostumePreset } from '../types/costume.ts'
import type { CostumeAIGeneration, CostumePresetV2 } from '../types/costume-v2.ts'
import { loadCostumePresets } from '../utils/costume-loader.js'

const connectionString =
	process.env.NEON_DATABASE_URL_READONLY ?? process.env.NEON_DATABASE_URL ?? ''

let cachedSql: NeonQueryFunction<false, false> | null = null

interface DBAssetRow {
	id: string
	url: string
	type: CostumeAsset['type']
	description: string | null
	priority: number | null
	sort_order?: number | null
	created_at?: string | Date | null
}

interface DBCostumeRow {
	id: string
	name: string
	category_id: string | null
	description: string | null
	version: string | null
	metadata: CostumePreset['metadata']
	colors: CostumePreset['colors']
	transformation: CostumePreset['transformation']
	marketing: CostumePreset['marketing']
	affiliate_links: CostumePreset['affiliateLinks']
	sort_order: number | null
	is_active: boolean | null
	is_premium: boolean | null
	is_new: boolean | null
	is_featured: boolean | null
	created_at: string | Date | null
	updated_at: string | Date | null
	notes?: string | null
	inspiration?: string | null
	ai_settings?: CostumePresetV2['aiGeneration'] | null
}

interface DBAIGenerationRow {
	id: string
	costume_id: string
	model: string
	seed: number
	primary_prompt: string
	fallback_prompt?: string | null
	negative_prompt?: string | null
	steps: number
	resolution: string
	show_explicit_content: boolean
	num_outputs: number
	reference_strategy: string
	max_references: number
	primary_reference_ids: string[]
	quality_modifiers: string[]
	style_enhancements: string[]
	model_options: Record<string, unknown>
	created_at: string | Date | null
	updated_at: string | Date | null
}

interface DBEnhancedAIGenerationRow {
	id: string
	costume_id: string
	model: string
	seed?: number | null
	primary_prompt?: string | null
	fallback_prompt?: string | null
	negative_prompt?: string | null
	steps?: number | null
	resolution?: string | null
	show_explicit_content?: boolean | null
	num_outputs?: number | null
	reference_strategy?: string | null
	max_references?: number | null
	primary_reference_ids?: string[] | null
	quality_modifiers?: string[] | null
	style_enhancements?: string[] | null
	model_options?: Record<string, unknown> | null
	created_at: string | Date | null
	updated_at: string | Date | null
}

interface DBAIReferenceRow {
	id: string
	costume_id: string
	url: string
	type: string
	role: string
	priority?: number | null
	description?: string | null
	is_primary?: boolean | null
	sort_order?: number | null
	created_at: string | Date | null
	updated_at: string | Date | null
}

const getSqlClient = () => {
	if (!connectionString) {
		return null
	}

	if (!cachedSql) {
		cachedSql = neon(connectionString)
	}

	return cachedSql
}

const mapAssetRow = (row: DBAssetRow): CostumeAsset & { priority?: number } => ({
	id: row.id,
	url: row.url,
	type: row.type,
	description: row.description ?? undefined,
	// Add priority from new column, fallback to sort_order for backward compatibility
	priority: row.priority ?? row.sort_order ?? 0,
})

const decodeCategory = (value: unknown) => {
	if (typeof value !== 'string' || !value.length) {
		return 'evergreen'
	}

	return value.replace(/^cat_/, '') || 'evergreen'
}

const mapAIGenerationRow = (row: DBAIGenerationRow): CostumeAIGeneration => ({
	model: row.model as 'seedream-v4' | 'google:4@1' | 'background-remover',
	seed: row.seed,
	primaryPrompt: row.primary_prompt,
	fallbackPrompt: row.fallback_prompt ?? undefined,
	negativePrompt: row.negative_prompt ?? undefined,
	steps: row.steps,
	resolution: row.resolution as 'auto' | '1024x1024' | '512x512' | '768x768',
	showExplicitContent: row.show_explicit_content,
	numOutputs: row.num_outputs,
	referenceStrategy: row.reference_strategy as 'auto' | 'priority-order' | 'random' | 'best-match',
	maxReferences: row.max_references,
	primaryReferenceIds: row.primary_reference_ids,
	qualityModifiers: row.quality_modifiers,
	styleEnhancements: row.style_enhancements,
	modelOptions: row.model_options,
})

const mapEnhancedAIGenerationRow = (row: DBEnhancedAIGenerationRow, references: DBAIReferenceRow[]): CostumeAIGeneration => ({
	model: row.model as 'seedream-v4' | 'google:4@1' | 'background-remover',
	seed: row.seed ?? 1000,
	primaryPrompt: row.primary_prompt ?? '',
	fallbackPrompt: row.fallback_prompt ?? undefined,
	negativePrompt: row.negative_prompt ?? undefined,
	steps: row.steps ?? 30,
	resolution: (row.resolution as 'auto' | '1024x1024' | '512x512' | '768x768') ?? 'auto',
	showExplicitContent: row.show_explicit_content ?? false,
	numOutputs: row.num_outputs ?? 1,
	referenceStrategy: (row.reference_strategy as 'auto' | 'priority-order' | 'random' | 'best-match') ?? 'priority-order',
	maxReferences: row.max_references ?? 5,
	primaryReferenceIds: row.primary_reference_ids ?? [],
	qualityModifiers: row.quality_modifiers ?? [],
	styleEnhancements: row.style_enhancements ?? [],
	modelOptions: row.model_options ?? {},
})

const mapCostumeRow = (
	row: DBCostumeRow,
	assets: (CostumeAsset & { priority?: number })[],
	aiGeneration?: CostumeAIGeneration | null,
	enhancedAiGeneration?: CostumeAIGeneration | null,
	aiSettings?: any
): CostumePresetV2 => ({
	id: row.id,
	name: row.name,
	category: decodeCategory(row.category_id),
	description: row.description ?? '',
	version: row.version ?? '1.0.0',
	assets, // Keep priority for V2 consumers
	colors: row.colors,
	// Use enhanced AI generation settings first, then legacy, then ai_settings, then defaults
	aiGeneration: enhancedAiGeneration ?? aiGeneration ?? row.ai_settings ?? {
		model: 'seedream-v4',
		seed: 1000,
		primaryPrompt: row.transformation.base,
		negativePrompt: row.transformation.negativePrompts?.join(', '),
		steps: 30,
		resolution: 'auto',
		showExplicitContent: false,
		numOutputs: 1,
		referenceStrategy: 'priority-order',
		maxReferences: 5,
		primaryReferenceIds: [],
		qualityModifiers: row.transformation.qualityModifiers ?? [],
		styleEnhancements: row.transformation.detailEnhancements ?? [],
		modelOptions: {},
	},
	transformation: row.transformation,
	metadata: row.metadata,
	marketing: row.marketing,
	affiliateLinks: row.affiliate_links ?? [],
	isActive: row.is_active ?? true,
	isPremium: row.is_premium ?? false,
	isNew: row.is_new ?? false,
	isFeatured: row.is_featured ?? false,
	createdAt:
		typeof row.created_at === 'string'
			? row.created_at
			: row.created_at?.toISOString?.() ?? new Date().toISOString(),
	updatedAt:
		typeof row.updated_at === 'string'
			? row.updated_at
			: row.updated_at?.toISOString?.() ?? new Date().toISOString(),
	notes: row.notes ?? undefined,
	inspiration: row.inspiration ?? undefined,
	// Include aiSettings for backward compatibility
	...(aiSettings && { aiSettings }),
})

const fetchAssetsForCostume = async (sql: NeonQueryFunction<false, false>, costumeId: string) => {
	const rows = await sql`
		SELECT id, url, type, description, priority, sort_order
		FROM costume_assets
		WHERE costume_id = ${costumeId}
		ORDER BY priority DESC, sort_order ASC, created_at ASC
	` as DBAssetRow[]

	return rows.map(mapAssetRow)
}

const fetchAIGenerationForCostume = async (sql: NeonQueryFunction<false, false>, costumeId: string): Promise<CostumeAIGeneration | null> => {
	const rows = await sql`
		SELECT *
		FROM costume_ai_generation
		WHERE costume_id = ${costumeId}
		LIMIT 1
	` as DBAIGenerationRow[]

	const row = rows[0]
	if (!row) {
		return null
	}

	return mapAIGenerationRow(row)
}

const fetchEnhancedAIGenerationForCostume = async (sql: NeonQueryFunction<false, false>, costumeId: string): Promise<{ aiGeneration: CostumeAIGeneration | null; references: DBAIReferenceRow[] }> => {
	// Fetch enhanced AI generation settings
	const aiRows = await sql`
		SELECT *
		FROM costume_ai_generation_enhanced
		WHERE costume_id = ${costumeId}
		LIMIT 1
	` as DBEnhancedAIGenerationRow[]

	// Fetch AI references
	const referenceRows = await sql`
		SELECT *
		FROM costume_ai_references
		WHERE costume_id = ${costumeId}
		ORDER BY sort_order ASC, priority DESC
	` as DBAIReferenceRow[]

	const aiRow = aiRows[0]
	const aiGeneration = aiRow ? mapEnhancedAIGenerationRow(aiRow, referenceRows) : null

	return {
		aiGeneration,
		references: referenceRows,
	}
}

const fetchCostumesFromNeon = async (): Promise<CostumePresetV2[]> => {
	const sql = getSqlClient()
	if (!sql) {
		return []
	}

	const rows = await sql`
		SELECT *, ai_settings
		FROM costumes
		WHERE is_active = true
		ORDER BY sort_order ASC NULLS LAST, created_at DESC
	` as DBCostumeRow[]

	const costumes: CostumePresetV2[] = []
	for (const row of rows) {
		const assets = await fetchAssetsForCostume(sql, row.id)
		const aiGeneration = await fetchAIGenerationForCostume(sql, row.id)
		const { aiGeneration: enhancedAiGeneration, references } = await fetchEnhancedAIGenerationForCostume(sql, row.id)
		
		// Include aiSettings for backward compatibility
		costumes.push(mapCostumeRow(row, assets, aiGeneration, enhancedAiGeneration, row.ai_settings))
	}

	return costumes
}

const fetchCostumeFromNeon = async (id: string): Promise<CostumePresetV2 | null> => {
	const sql = getSqlClient()
	if (!sql) {
		return null
	}

	const rows = await sql`
		SELECT *, ai_settings
		FROM costumes
		WHERE id = ${id}
		LIMIT 1
	` as DBCostumeRow[]

	const row = rows[0]
	if (!row) {
		return null
	}

	const assets = await fetchAssetsForCostume(sql, row.id)
	const aiGeneration = await fetchAIGenerationForCostume(sql, row.id)
	const { aiGeneration: enhancedAiGeneration, references } = await fetchEnhancedAIGenerationForCostume(sql, row.id)
	
	return mapCostumeRow(row, assets, aiGeneration, enhancedAiGeneration, row.ai_settings)
}

// Backward compatibility functions that return the original CostumePreset type
const convertToLegacyCostume = (costumeV2: CostumePresetV2): CostumePreset => {
	const { aiGeneration, ...legacyCostume } = costumeV2
	return legacyCostume as CostumePreset
}

export const getAllCostumesV2 = async (): Promise<CostumePresetV2[]> => {
	try {
		const costumes = await fetchCostumesFromNeon()
		if (costumes.length) {
			return costumes
		}
	} catch (error) {
		console.error('Failed to fetch costumes from Neon, falling back to local fixtures:', error)
	}

	// Fallback to local presets and convert to V2 format
	const localCostumes = await loadCostumePresets()
	return localCostumes.map((costume, index) => ({
		...costume,
		aiGeneration: {
			model: costume.metadata.compatibleModels?.[0] as any || 'seedream-v4',
			seed: 1000 + index,
			primaryPrompt: costume.transformation.base,
			negativePrompt: costume.transformation.negativePrompts?.join(', '),
			steps: 30,
			resolution: 'auto',
			showExplicitContent: false,
			numOutputs: 1,
			referenceStrategy: 'priority-order' as const,
			maxReferences: 5,
			primaryReferenceIds: [],
			qualityModifiers: costume.transformation.qualityModifiers ?? [],
			styleEnhancements: costume.transformation.detailEnhancements ?? [],
			modelOptions: {},
		},
	}))
}

export const getCostumeByIdV2 = async (id: string): Promise<CostumePresetV2 | null> => {
	try {
		const costume = await fetchCostumeFromNeon(id)
		if (costume) {
			return costume
		}
	} catch (error) {
		console.error(`Failed to fetch costume ${id} from Neon:`, error)
	}

	// Fallback to local presets
	const localCostumes = await loadCostumePresets()
	const localCostume = localCostumes.find((costume: CostumePreset) => costume.id === id)
	if (!localCostume) {
		return null
	}

	const index = localCostumes.indexOf(localCostume)
	return {
		...localCostume,
		aiGeneration: {
			model: localCostume.metadata.compatibleModels?.[0] as any || 'seedream-v4',
			seed: 1000 + index,
			primaryPrompt: localCostume.transformation.base,
			negativePrompt: localCostume.transformation.negativePrompts?.join(', '),
			steps: 30,
			resolution: 'auto',
			showExplicitContent: false,
			numOutputs: 1,
			referenceStrategy: 'priority-order' as const,
			maxReferences: 5,
			primaryReferenceIds: [],
			qualityModifiers: localCostume.transformation.qualityModifiers ?? [],
			styleEnhancements: localCostume.transformation.detailEnhancements ?? [],
			modelOptions: {},
		},
	}
}

// Backward compatibility exports
export const getAllCostumes = async (): Promise<CostumePreset[]> => {
	const costumesV2 = await getAllCostumesV2()
	return costumesV2.map(convertToLegacyCostume)
}

export const getCostumeById = async (id: string): Promise<CostumePreset | null> => {
	const costumeV2 = await getCostumeByIdV2(id)
	return costumeV2 ? convertToLegacyCostume(costumeV2) : null
}

export const getFeaturedCostumes = async (): Promise<CostumePreset[]> => {
	const costumes = await getAllCostumes()
	return costumes.filter(costume => costume.isFeatured)
}

export const shutdownClient = async () => {
	if (cachedSql) {
		cachedSql = null
	}
}