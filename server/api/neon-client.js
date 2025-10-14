import { neon } from '@neondatabase/serverless';
import { loadCostumePresets } from '../utils/costume-loader.js';
const connectionString = process.env.NEON_DATABASE_URL_READONLY ?? process.env.NEON_DATABASE_URL ?? '';
let cachedSql = null;
const getSqlClient = () => {
    if (!connectionString) {
        return null;
    }
    if (!cachedSql) {
        cachedSql = neon(connectionString);
    }
    return cachedSql;
};
const mapAssetRow = (row) => ({
    id: row.id,
    url: row.url,
    type: row.type,
    description: row.description ?? undefined,
});
const decodeCategory = (value) => {
    if (typeof value !== 'string' || !value.length) {
        return 'evergreen';
    }
    return value.replace(/^cat_/, '') || 'evergreen';
};
const mapCostumeRow = (row, assets) => ({
    id: row.id,
    name: row.name,
    category: decodeCategory(row.category_id),
    description: row.description ?? '',
    version: row.version ?? '1.0.0',
    assets,
    colors: row.colors,
    transformation: row.transformation,
    metadata: row.metadata,
    marketing: row.marketing,
    affiliateLinks: row.affiliate_links ?? [],
    isActive: row.is_active ?? true,
    isPremium: row.is_premium ?? false,
    isNew: row.is_new ?? false,
    isFeatured: row.is_featured ?? false,
    createdAt: typeof row.created_at === 'string'
        ? row.created_at
        : row.created_at?.toISOString?.() ?? new Date().toISOString(),
    updatedAt: typeof row.updated_at === 'string'
        ? row.updated_at
        : row.updated_at?.toISOString?.() ?? new Date().toISOString(),
    notes: row.notes ?? undefined,
    inspiration: row.inspiration ?? undefined,
});
const fetchAssetsForCostume = async (sql, costumeId) => {
    const rows = await sql `
		SELECT id, url, type, description
		FROM costume_assets
		WHERE costume_id = ${costumeId}
		ORDER BY sort_order ASC, created_at ASC
	`;
    return rows.map(mapAssetRow);
};
const fetchCostumesFromNeon = async () => {
    const sql = getSqlClient();
    if (!sql) {
        return [];
    }
    const rows = await sql `
		SELECT *
		FROM costumes
		WHERE is_active = true
		ORDER BY sort_order ASC NULLS LAST, created_at DESC
	`;
    const costumes = [];
    for (const row of rows) {
        const assets = await fetchAssetsForCostume(sql, row.id);
        costumes.push(mapCostumeRow(row, assets));
    }
    return costumes;
};
const fetchCostumeFromNeon = async (id) => {
    const sql = getSqlClient();
    if (!sql) {
        return null;
    }
    const rows = await sql `
		SELECT *
		FROM costumes
		WHERE id = ${id}
		LIMIT 1
	`;
    const row = rows[0];
    if (!row) {
        return null;
    }
    const assets = await fetchAssetsForCostume(sql, row.id);
    return mapCostumeRow(row, assets);
};
export const getAllCostumes = async () => {
    try {
        const costumes = await fetchCostumesFromNeon();
        if (costumes.length) {
            return costumes;
        }
    }
    catch (error) {
        console.error('Failed to fetch costumes from Neon, falling back to local fixtures:', error);
    }
    return loadCostumePresets();
};
export const getCostumeById = async (id) => {
    try {
        const costume = await fetchCostumeFromNeon(id);
        if (costume) {
            return costume;
        }
    }
    catch (error) {
        console.error(`Failed to fetch costume ${id} from Neon:`, error);
    }
    const localCostumes = await loadCostumePresets();
    return localCostumes.find((costume) => costume.id === id) ?? null;
};
export const getFeaturedCostumes = async () => {
    const costumes = await getAllCostumes();
    return costumes.filter(costume => costume.isFeatured);
};
export const shutdownClient = async () => {
    if (cachedSql) {
        cachedSql = null;
    }
};
