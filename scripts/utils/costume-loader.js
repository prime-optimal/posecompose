import { promises as fs } from 'fs';
import * as path from 'path';
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const COSTUME_JSON_PATH = path.join(PROJECT_ROOT, 'costumes.json');
const ASSETS_ROOT = path.join(PROJECT_ROOT, 'assets');
const PRIMARY_KEYWORDS = ['square', 'profile', 'front'];
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
];
const ensureLeadingSlash = (value) => (value.startsWith('/') ? value : `/${value}`);
const slugify = (value) => value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
const pickPalette = (key) => {
    const hash = key
        .split('')
        .reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return COLOR_PALETTES[hash % COLOR_PALETTES.length];
};
const sentenceCase = (value) => value
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase());
const fileExists = async (filePath) => {
    try {
        await fs.access(filePath);
        return true;
    }
    catch {
        return false;
    }
};
const toWebPath = (absolutePath) => {
    const relative = path.relative(PROJECT_ROOT, absolutePath);
    return ensureLeadingSlash(relative.split(path.sep).join('/'));
};
const toAffiliateSource = (url) => {
    if (!url)
        return 'Other';
    try {
        const host = new URL(url).hostname.toLowerCase();
        if (host.includes('amazon'))
            return 'Amazon';
        if (host.includes('aliexpress'))
            return 'AliExpress';
        if (host.includes('etsy'))
            return 'Etsy';
        if (host.includes('spirit'))
            return 'SpiritHalloween';
        return 'Other';
    }
    catch {
        return 'Other';
    }
};
const resolveReferenceImage = async (referenceImage) => {
    const entry = typeof referenceImage === 'string' ? { path: referenceImage } : referenceImage;
    const source = entry.path ?? entry.url;
    if (!source) {
        return null;
    }
    const normalizedSource = source.replace(/^\.\//, '');
    const isRemote = /^https?:\/\//i.test(normalizedSource);
    let absolutePath;
    let webPath;
    if (isRemote) {
        absolutePath = normalizedSource;
        webPath = normalizedSource;
    }
    else {
        absolutePath = path.isAbsolute(normalizedSource)
            ? normalizedSource
            : path.join(PROJECT_ROOT, normalizedSource);
        if (!absolutePath.startsWith(ASSETS_ROOT)) {
            return null;
        }
        if (!(await fileExists(absolutePath))) {
            return null;
        }
        webPath = toWebPath(absolutePath);
    }
    const filename = (() => {
        if (isRemote) {
            try {
                return path.basename(new URL(normalizedSource).pathname);
            }
            catch {
                return normalizedSource;
            }
        }
        return path.basename(absolutePath);
    })();
    const description = entry.description ?? sentenceCase(path.parse(filename).name);
    const typeHint = entry.type
        ?? (entry.example || entry.is_example ? 'example' : undefined)
        ?? (entry.main ? 'main' : undefined);
    const primaryHint = Boolean(entry.primary ?? entry.main);
    return {
        webPath,
        filename,
        description,
        typeHint,
        primaryHint,
    };
};
const gatherReferenceAssets = async (costume) => {
    const seen = new Set();
    const entries = [];
    const referenceImages = costume.reference_images ?? [];
    for (const referenceImage of referenceImages) {
        const resolved = await resolveReferenceImage(referenceImage);
        if (!resolved) {
            continue;
        }
        if (seen.has(resolved.webPath)) {
            continue;
        }
        seen.add(resolved.webPath);
        entries.push(resolved);
    }
    if (!entries.length && costume.reference_image_url) {
        const resolved = await resolveReferenceImage({ url: costume.reference_image_url, main: true });
        if (resolved) {
            entries.push(resolved);
        }
    }
    const primaryEntry = entries.find(entry => entry.typeHint === 'main' || entry.primaryHint)
        || entries.find(entry => PRIMARY_KEYWORDS.some(keyword => entry.filename.toLowerCase().includes(keyword)))
        || entries[0];
    if (costume.thumbnail_url && !entries.some(entry => entry.webPath === costume.thumbnail_url)) {
        const thumbnailEntry = await resolveReferenceImage({ url: costume.thumbnail_url, type: 'example' });
        if (thumbnailEntry && !seen.has(thumbnailEntry.webPath)) {
            entries.unshift(thumbnailEntry);
        }
    }
    return entries.map((entry, index) => {
        const derivedType = entry.typeHint || (primaryEntry && entry.webPath === primaryEntry.webPath ? 'main' : 'detail') || 'detail';
        return {
            id: `${costume.id}-asset-${index}`,
            url: entry.webPath,
            type: derivedType,
            description: entry.description,
        };
    });
};
const buildAffiliateLinks = (costume) => {
    if (!costume.affiliate_url) {
        return [];
    }
    return [
        {
            id: `${costume.id}-affiliate`,
            label: `${costume.display_name} Costume`,
            url: costume.affiliate_url,
            source: toAffiliateSource(costume.affiliate_url),
        },
    ];
};
export const loadCostumePresets = async () => {
    const rawJson = await fs.readFile(COSTUME_JSON_PATH, 'utf8');
    const legacyCostumes = JSON.parse(rawJson);
    const now = new Date().toISOString();
    const presets = [];
    for (const [index, costume] of Array.from(legacyCostumes.entries())) {
        const assets = await gatherReferenceAssets(costume);
        const palette = pickPalette(costume.id);
        const mainAsset = assets.find(asset => asset.type === 'main');
        if (!mainAsset && costume.reference_image_url) {
            assets.unshift({
                id: `${costume.id}-remote-main`,
                url: costume.reference_image_url,
                type: 'main',
                description: `${costume.display_name} reference`,
            });
        }
        const negativePrompts = costume.negative_prompt
            ? costume.negative_prompt
                .split(',')
                .map(entry => entry.trim())
                .filter(Boolean)
            : [];
        const shortDescription = `Outfit swap inspired by ${costume.display_name}`;
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
        });
    }
    return presets;
};
export const loadCostumePresetsGroupedByCategory = async () => {
    const presets = await loadCostumePresets();
    return presets.reduce((groups, preset) => {
        if (!groups[preset.category]) {
            groups[preset.category] = [];
        }
        groups[preset.category].push(preset);
        return groups;
    }, {});
};
export const primaryKeywords = PRIMARY_KEYWORDS;
