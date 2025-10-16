import type { CostumePresetV2, CostumeAIGeneration } from '../../types/costume-v2'
import type { NanoGptModel, NanoGptReference, NanoGptGenerationRequest } from './nano-gpt-v2'
import { MODEL_REFERENCE_LIMITS } from './nano-gpt-v2'

export interface AIGenerationRequest {
  costume: CostumePresetV2
  selfieBase64?: string | null
  selfieMimeType?: string | null
  model?: NanoGptModel
  includeFallback?: boolean
}

export interface AIGenerationOptions {
  overridePrompt?: string
  overrideSeed?: number
  overrideModel?: NanoGptModel
  customOptions?: Record<string, unknown>
}

/**
 * Service that builds AI generation requests using costume-specific settings from the database
 */
export class AIGenerationService {
  /**
   * Build a complete AI generation request using costume-specific settings
   */
  static buildRequest(request: AIGenerationRequest, options: AIGenerationOptions = {}): NanoGptGenerationRequest {
    const { costume, selfieBase64, selfieMimeType, model, includeFallback = true } = request
    const { overridePrompt, overrideSeed, overrideModel, customOptions } = options

    // Use costume's AI generation settings or fallback to model parameter
    const aiSettings = costume.aiGeneration
    const selectedModel = overrideModel || model || aiSettings.model

    // Build references using costume-specific strategy
    const references = this.buildReferences({
      costume,
      model: selectedModel,
      selfieBase64,
      selfieMimeType,
      includeFallback,
      referenceStrategy: aiSettings.referenceStrategy,
      maxReferences: aiSettings.maxReferences,
      primaryReferenceIds: aiSettings.primaryReferenceIds,
    })

    // Build prompt using costume's detailed prompt or override
    const prompt = overridePrompt || aiSettings.primaryPrompt

    // Combine costume settings with any custom options
    const generationOptions: Record<string, unknown> = {
      ...aiSettings.modelOptions,
      ...customOptions,
      seed: overrideSeed || aiSettings.seed,
    }

    return {
      model: selectedModel,
      prompt,
      references,
      negativePrompt: aiSettings.negativePrompt,
      numOutputs: aiSettings.numOutputs,
      options: generationOptions,
    }
  }

  /**
   * Build references array using costume-specific strategy and priorities
   */
  private static buildReferences({
    costume,
    model,
    selfieBase64,
    selfieMimeType,
    includeFallback,
    referenceStrategy,
    maxReferences,
    primaryReferenceIds,
  }: {
    costume: CostumePresetV2
    model: NanoGptModel
    selfieBase64?: string | null
    selfieMimeType?: string | null
    includeFallback?: boolean
    referenceStrategy: CostumeAIGeneration['referenceStrategy']
    maxReferences: number
    primaryReferenceIds: string[]
  }): NanoGptReference[] {
    const limit = Math.min(maxReferences, MODEL_REFERENCE_LIMITS[model])
    const isSelfieOnly = import.meta.env.VITE_DEBUG_SELFIE_ONLY === 'true'

    if (model === 'background-remover') {
      return this.buildBackgroundRemoverReferences(selfieBase64, selfieMimeType, includeFallback)
    }

    const references: NanoGptReference[] = []

    // Add user selfie as primary reference
    if (selfieBase64) {
      references.push({
        id: 'user-selfie',
        kind: 'base64',
        value: selfieBase64,
        role: 'user',
        weight: 1.5,
        mimeType: selfieMimeType ?? 'image/jpeg',
      })
    }

    if (isSelfieOnly) {
      return references.slice(0, limit)
    }

    // Add costume references based on strategy
    const costumeReferences = this.buildCostumeReferences(
      costume,
      referenceStrategy,
      primaryReferenceIds,
      limit - references.length
    )

    references.push(...costumeReferences)

    // Add fallback references if needed
    if (references.length < limit && includeFallback) {
      const fallbackReferences = this.buildFallbackReferences(selfieBase64)
      references.push(...fallbackReferences)
    }

    return references.slice(0, limit)
  }

  /**
   * Build costume references based on the specified strategy
   */
  private static buildCostumeReferences(
    costume: CostumePresetV2,
    strategy: CostumeAIGeneration['referenceStrategy'],
    primaryReferenceIds: string[],
    limit: number
  ): NanoGptReference[] {
    const assets = [...costume.assets].sort((a, b) => {
      // Sort by priority if available, otherwise by type
      const aPriority = (a as any).priority || 0
      const bPriority = (b as any).priority || 0
      return bPriority - aPriority
    })

    let selectedAssets: typeof assets

    switch (strategy) {
      case 'priority-order':
        // Use assets with priority order, preferring primary reference IDs
        const primaryAssets = assets.filter(asset => 
          primaryReferenceIds.some(id => asset.url.includes(id))
        )
        const secondaryAssets = assets.filter(asset => 
          !primaryReferenceIds.some(id => asset.url.includes(id))
        )
        selectedAssets = [...primaryAssets, ...secondaryAssets]
        break

      case 'best-match':
        // Prioritize main and detail assets
        selectedAssets = assets.sort((a, b) => {
          const typeOrder = { main: 3, detail: 2, example: 1, background: 0 }
          const aScore = typeOrder[a.type] || 0
          const bScore = typeOrder[b.type] || 0
          return bScore - aScore
        })
        break

      case 'random':
        // Random selection
        selectedAssets = [...assets].sort(() => Math.random() - 0.5)
        break

      case 'auto':
      default:
        // Use default priority ordering
        selectedAssets = assets
        break
    }

    return selectedAssets.slice(0, limit).map((asset, index) => ({
      id: `costume-${index}`,
      kind: 'url' as const,
      value: this.ensureAbsoluteUrl(asset.url),
      role: 'costume' as const,
      weight: 1,
    }))
  }

  /**
   * Build references for background removal model
   */
  private static buildBackgroundRemoverReferences(
    selfieBase64?: string | null,
    selfieMimeType?: string | null,
    includeFallback = true
  ): NanoGptReference[] {
    const references: NanoGptReference[] = []

    if (selfieBase64) {
      references.push({
        id: 'user-selfie',
        kind: 'base64',
        value: selfieBase64,
        role: 'user',
        weight: 1.2,
        mimeType: selfieMimeType ?? 'image/jpeg',
      })
    } else if (includeFallback) {
      references.push({
        id: 'fallback-selfie',
        kind: 'url',
        value: 'https://f004.backblazeb2.com/file/waifu-test/uploads/11.jpeg',
        role: 'user',
      })
    }

    return references
  }

  /**
   * Build fallback references when costume assets are not available
   */
  private static buildFallbackReferences(selfieBase64?: string | null): NanoGptReference[] {
    const references: NanoGptReference[] = []

    // Add fallback costume reference
    references.push({
      id: 'fallback-costume',
      kind: 'url',
      value: 'https://f004.backblazeb2.com/file/waifu-test/waifu-test/costumes/daisy-01.png',
      role: 'costume',
    })

    // Add fallback selfie if no user selfie provided
    if (!selfieBase64) {
      references.unshift({
        id: 'fallback-selfie',
        kind: 'url',
        value: 'https://f004.backblazeb2.com/file/waifu-test/uploads/11.jpeg',
        role: 'user',
      })
    }

    return references
  }

  /**
   * Ensure URL is absolute for API requests
   */
  private static ensureAbsoluteUrl(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }

    if (typeof window !== 'undefined' && window.location) {
      try {
        return new URL(url, window.location.origin).toString()
      } catch (error) {
        console.warn('Failed to resolve asset url', url, error)
      }
    }

    return url
  }

  /**
   * Extract and log generation settings for debugging
   */
  static extractDebugInfo(request: AIGenerationRequest, options: AIGenerationOptions = {}) {
    const { costume } = request
    const aiSettings = costume.aiGeneration

    return {
      costumeId: costume.id,
      costumeName: costume.name,
      model: options.overrideModel || request.model || aiSettings.model,
      seed: options.overrideSeed || aiSettings.seed,
      promptLength: (options.overridePrompt || aiSettings.primaryPrompt).length,
      referenceStrategy: aiSettings.referenceStrategy,
      maxReferences: aiSettings.maxReferences,
      primaryReferenceIds: aiSettings.primaryReferenceIds,
      steps: aiSettings.steps,
      resolution: aiSettings.resolution,
      showExplicitContent: aiSettings.showExplicitContent,
      hasCustomPrompt: !!options.overridePrompt,
      hasCustomSeed: !!options.overrideSeed,
      hasCustomModel: !!options.overrideModel,
      customOptionsKeys: Object.keys(options.customOptions || {}),
    }
  }
}