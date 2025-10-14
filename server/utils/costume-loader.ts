import type { CostumePreset } from '../types/costume.ts'

// If you actually want to seed from the same JSON file, adjust the path below.
// Otherwise just return an empty array or hard‑coded list.

import { promises as fs } from 'fs'
import path from 'path'

const DATA_PATH = path.join(process.cwd(), 'costumes.json')

export async function loadCostumePresets(): Promise<CostumePreset[]> {
  try {
    const data = await fs.readFile(DATA_PATH, 'utf8')
    return JSON.parse(data) as CostumePreset[]
  } catch (err) {
    console.warn('⚠️  Cannot read costumes.json in API project:', err)
    return []
  }
}

// Optional grouped helper if Neon seeding expects it
export async function loadCostumePresetsGroupedByCategory() {
  const presets = await loadCostumePresets()
  return presets.reduce<Record<string, CostumePreset[]>>((groups, preset) => {
    const cat = preset.category ?? 'evergreen'
    groups[cat] ??= []
    groups[cat].push(preset)
    return groups
  }, {})
}