import { writeFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

const url = process.env.NEON_DATABASE_URL;
if (!url) {
  console.error('NEON_DATABASE_URL is not set');
  process.exit(1);
}

const sql = neon(url);

// Query to get costumes with their assets - matching actual database schema
const rows = await sql`
  SELECT
    c.id,
    c.name,
    c.category_id,
    c.description,
    c.version,
    c.metadata,
    c.colors,
    c.transformation,
    c.marketing,
    c.affiliate_links,
    c.sort_order,
    c.is_active,
    c.is_premium,
    c.is_new,
    c.is_featured,
    c.created_at,
    c.updated_at,
    -- Aggregate assets as JSON array using sort_order (not priority)
    COALESCE(
      json_agg(
        json_build_object(
          'id', ca.id,
          'url', ca.url,
          'type', ca.type,
          'description', ca.description,
          'priority', ca.sort_order
        ) ORDER BY ca.sort_order ASC, ca.created_at ASC
      ) FILTER (WHERE ca.id IS NOT NULL),
      '[]'::json
    ) as assets
  FROM costumes c
  LEFT JOIN costume_assets ca ON c.id = ca.costume_id
  WHERE c.is_active = true
  GROUP BY c.id, c.name, c.category_id, c.description, c.version, c.metadata, c.colors,
           c.transformation, c.marketing, c.affiliate_links, c.sort_order, c.is_active,
           c.is_premium, c.is_new, c.is_featured, c.created_at, c.updated_at
  ORDER BY c.sort_order ASC NULLS LAST, c.created_at DESC
`;

// Transform the database rows to match CostumePresetV2 structure
const costumes = rows.map(row => ({
  id: row.id,
  name: row.name,
  category: row.category_id ? row.category_id.replace(/^cat_/, '') : 'evergreen',
  description: row.description || '',
  version: row.version || '1.0.0',
  assets: row.assets || [],
  colors: row.colors,
  // Create basic AI generation settings from transformation data
  aiGeneration: {
    model: 'seedream-v4',
    seed: 1000,
    primaryPrompt: row.transformation?.base || 'Transform into costume',
    fallbackPrompt: undefined,
    negativePrompt: row.transformation?.negativePrompts?.join(', '),
    steps: 30,
    resolution: 'auto',
    showExplicitContent: false,
    numOutputs: 1,
    referenceStrategy: 'priority-order',
    maxReferences: 5,
    primaryReferenceIds: [],
    qualityModifiers: row.transformation?.qualityModifiers || [],
    styleEnhancements: row.transformation?.detailEnhancements || [],
    modelOptions: {}
  },
  transformation: row.transformation,
  metadata: row.metadata,
  marketing: row.marketing,
  affiliateLinks: row.affiliate_links || [],
  isActive: row.is_active ?? true,
  isPremium: row.is_premium ?? false,
  isNew: row.is_new ?? false,
  isFeatured: row.is_featured ?? false,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  notes: undefined,
  inspiration: undefined
}));

await writeFile('public/costumes.json', JSON.stringify(costumes, null, 2));
console.log(`Wrote ${costumes.length} costumes to public/costumes.json`);

