export interface CostumeAsset {
  id: string
  url: string
  type: 'main' | 'detail' | 'background' | 'example'
  description?: string
}

export interface CostumeMetadata {
  difficulty: 'easy' | 'medium' | 'hard'
  tags: string[]
  compatibleModels: string[]
  estimatedProcessingTime: number
  season?: string
  popularityScore?: number
}

export interface CostumeColor {
  primary: string
  secondary: string
  accent: string
  palette: string[]
}

export interface TransformationPrompt {
  base: string
  variations: { style: string; prompt: string }[]
  negativePrompts?: string[]
  qualityModifiers: string[]
  detailEnhancements: string[]
}

export interface CostumeMarketing {
  displayName: string
  shortDescription: string
  socialPreview: string
  callToAction: string
  landingPageText?: string
}

export interface CostumeAffiliateLink {
  id: string
  label: string
  url: string
  source: 'Amazon' | 'AliExpress' | 'Etsy' | 'SpiritHalloween' | 'Other'
  price?: string
  availability?: 'in-stock' | 'out-of-stock' | 'pre-order'
  description?: string
}

export interface CostumeAiSettings {
  model?: string
  prompt?: string
  steps?: number
  seed?: number
  resolution?: 'auto' | '512x512' | '1024x1024'
  showExplicitContent?: boolean
  referenceUrls?: string[]
}

export interface CostumePreset {
  id: string
  name: string
  category: string
  description: string
  version: string
  assets: CostumeAsset[]
  colors: CostumeColor
  transformation: TransformationPrompt
  metadata: CostumeMetadata
  marketing: CostumeMarketing
  affiliateLinks: CostumeAffiliateLink[]
  isActive: boolean
  isPremium: boolean
  isNew: boolean
  isFeatured: boolean
  createdAt: string
  updatedAt: string
  notes?: string
  inspiration?: string
  aiSettings?: CostumeAiSettings
}

export interface CostumeCategory {
  id: string
  name: string
  description: string
  icon?: string
  sortOrder: number
  isActive: boolean
}