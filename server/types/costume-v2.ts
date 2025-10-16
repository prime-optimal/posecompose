export interface CostumeAsset {
  id: string;
  url: string;
  type: 'main' | 'detail' | 'background' | 'example';
  description?: string;
  priority?: number; // New: for ordering references
}

export interface CostumeColor {
  primary: string;
  secondary: string;
  accent: string;
  palette: string[];
}

// Enhanced AI generation settings
export interface CostumeAIGeneration {
  // Model settings
  model: 'seedream-v4' | 'google:4@1' | 'background-remover';
  seed: number;
  
  // Prompt engineering
  primaryPrompt: string; // The detailed prompt from scripts
  fallbackPrompt?: string; // Simple fallback prompt
  negativePrompt?: string;
  
  // Generation parameters
  steps: number;
  resolution: 'auto' | '1024x1024' | '512x512' | '768x768';
  showExplicitContent: boolean;
  numOutputs: number;
  
  // Reference image configuration
  referenceStrategy: 'auto' | 'priority-order' | 'random' | 'best-match';
  maxReferences: number;
  primaryReferenceIds: string[]; // IDs of assets to prioritize
  
  // Quality and style modifiers
  qualityModifiers: string[];
  styleEnhancements: string[];
  
  // Model-specific options
  modelOptions: Record<string, unknown>;
}

export interface CostumeMetadata {
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  compatibleModels: string[];
  estimatedProcessingTime: number; // in seconds
  season?: string;
  popularityScore?: number; // 1-10
}

export interface CostumeMarketing {
  displayName: string;
  shortDescription: string;
  socialPreview: string;
  callToAction: string;
  landingPageText?: string;
}

export interface TransformationPrompt {
  base: string;
  variations: {
    style: string;
    prompt: string;
  }[];
  negativePrompts?: string[];
  qualityModifiers: string[];
  detailEnhancements: string[];
}

export interface CostumeAffiliateLink {
  id: string;
  label: string;
  url: string;
  source: 'Amazon' | 'AliExpress' | 'Etsy' | 'SpiritHalloween' | 'Other';
  price?: string;
  availability?: 'in-stock' | 'out-of-stock' | 'pre-order';
  description?: string;
}

export interface CostumePresetV2 {
  id: string;
  name: string;
  category: string;
  description: string;
  version: string;
  
  // Visual assets
  assets: CostumeAsset[];
  
  // Styling
  colors: CostumeColor;
  
  // AI generation (enhanced)
  aiGeneration: CostumeAIGeneration;
  
  // Legacy transformation (for backward compatibility)
  transformation: TransformationPrompt;
  
  // Metadata
  metadata: CostumeMetadata;
  
  // Marketing
  marketing: CostumeMarketing;
  
  // Affiliate links
  affiliateLinks: CostumeAffiliateLink[];
  
  // Status & availability
  isActive: boolean;
  isPremium: boolean;
  isNew: boolean;
  isFeatured: boolean;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  
  // Additional data
  notes?: string;
  inspiration?: string;
}

// Database schema for AI generation settings
export interface CostumeAIGenerationDB {
  id: string;
  costumeId: string;
  model: string;
  seed: number;
  primaryPrompt: string;
  fallbackPrompt?: string;
  negativePrompt?: string;
  steps: number;
  resolution: string;
  showExplicitContent: boolean;
  numOutputs: number;
  referenceStrategy: string;
  maxReferences: number;
  primaryReferenceIds: string[];
  qualityModifiers: string[];
  styleEnhancements: string[];
  modelOptions: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Database schema for enhanced costume assets
export interface CostumeAssetDB {
  id: string;
  costumeId: string;
  url: string;
  type: string;
  description?: string;
  priority: number;
  createdAt: string;
}

export interface CostumeCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
}

// Collections for organizing costumes
export interface CostumeCollection {
  id: string;
  name: string;
  description: string;
  costumeIds: string[];
  isActive: boolean;
  sortOrder: number;
}

// User interaction tracking
export interface CostumeInteraction {
  costumeId: string;
  userId?: string;
  sessionId: string;
  type: 'view' | 'select' | 'generate' | 'share' | 'favorite';
  timestamp: string;
  metadata?: Record<string, unknown>;
}