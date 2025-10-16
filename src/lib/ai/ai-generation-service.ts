import type { CostumePresetV2, CostumeAIGeneration } from '../../types/costume-v2'
import type { NanoGptModel, NanoGptReference, NanoGptGenerationRequest } from './nano-gpt-v2'
import { MODEL_REFERENCE_LIMITS } from './nano-gpt-v2'
import { HALLOWEEN_COSTUME_SWAP_PROMPT } from './virtual-try-on-prompts'

// Enhanced logging and image saving utilities
interface GenerationLog {
  promptId: string
  model: NanoGptModel
  seed?: number
  timestamp: string
  costume: string
  promptLength: number
  referenceCount: number
  status: string
  imagesGenerated?: number
  error?: string
}

interface PromptDetails {
  promptId: string
  model: NanoGptModel
  seed?: number
  timestamp: string
  costume: string
  promptText: string
  references: Array<{ id: string; kind: string; role: string }>
  generationSettings: Record<string, unknown>
}

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

    // Check for tuned prompts in aiSettings (from database JSONB) if available, then use aiGeneration
    // Note: aiSettings would come from database JSONB column, aiGeneration is the structured type
    const dbAiSettings = costume.aiSettings || {}
    const structuredAiSettings: Partial<CostumeAIGeneration> = {
      ...(costume.aiGeneration as Partial<CostumeAIGeneration> | undefined ?? {}),
    }

    const selectedModel = (overrideModel || model || dbAiSettings.model || structuredAiSettings.model || 'seedream-v4') as NanoGptModel

    // Build references using costume-specific strategy
    const references = this.buildReferences({
      costume,
      model: selectedModel,
      selfieBase64,
      selfieMimeType,
      includeFallback,
      referenceStrategy: structuredAiSettings.referenceStrategy ?? 'priority-order',
      maxReferences: structuredAiSettings.maxReferences ?? MODEL_REFERENCE_LIMITS[selectedModel],
      primaryReferenceIds: structuredAiSettings.primaryReferenceIds ?? [],
    })

    // Build prompt using tuned database prompt first, then legacy prompts, then Halloween fallback
    const tunedPrompt = dbAiSettings.prompt || structuredAiSettings.primaryPrompt || structuredAiSettings.fallbackPrompt
    const prompt = overridePrompt || tunedPrompt || HALLOWEEN_COSTUME_SWAP_PROMPT({ costumeName: costume.name, costumeCategory: costume.category })

    // Combine costume settings with any custom options
    const generationOptions: Record<string, unknown> = {
      ...(structuredAiSettings as CostumeAIGeneration).modelOptions ?? {},
      ...customOptions,
      seed: overrideSeed ?? dbAiSettings.seed ?? structuredAiSettings.seed,
    }

    return {
      model: selectedModel,
      prompt,
      references,
      negativePrompt: structuredAiSettings.negativePrompt ?? undefined,
      numOutputs: structuredAiSettings.numOutputs ?? 1,
      options: generationOptions,
    }
  }

  /**
   * Generate a unique prompt ID for tracking
   */
  static generatePromptId(costume: CostumePresetV2): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    return `${costume.id}-${timestamp}`
  }

  /**
   * Save prompt details to file for debugging and tracking
   */
  static async savePromptDetails(details: PromptDetails): Promise<void> {
    try {
      // Only save in development or when explicitly enabled
      if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_PROMPT_LOGGING === 'true') {
        const fs = await import('fs')
        const path = await import('path')
        
        const promptDetails = `
Prompt ID: ${details.promptId}
Model: ${details.model}
Seed: ${details.seed || 'auto'}
Timestamp: ${details.timestamp}
Costume: ${details.costume}

=== PROMPT TEXT ===
${details.promptText}

=== REFERENCES ===
${details.references.map(ref => `- ${ref.id}: ${ref.kind} (${ref.role})`).join('\n')}

=== GENERATION SETTINGS ===
${Object.entries(details.generationSettings)
  .map(([key, value]) => `- ${key}: ${JSON.stringify(value)}`)
  .join('\n')}
        `.trim()

        const filename = `./test-output/prompt-${details.promptId}.txt`
        fs.writeFileSync(filename, promptDetails)
        console.log(`💾 Prompt details saved to: ${filename}`)
      }
    } catch (error) {
      console.warn('⚠️ Failed to save prompt details:', error)
    }
  }

  /**
   * Save generated images with descriptive filenames
   */
  static async saveGeneratedImages(
    promptId: string,
    model: NanoGptModel,
    seed: number | undefined,
    images: Array<{ base64?: string; url?: string }>,
    timestamp: string
  ): Promise<string[]> {
    const savedFiles: string[] = []

    try {
      // Only save in development or when explicitly enabled
      if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_IMAGE_SAVING === 'true') {
        const fs = await import('fs')
        
        images.forEach((image, index) => {
          if (image.base64) {
            const outputBase64 = image.base64.replace(/^data:image\/[a-z]+;base64,/, '')
            const filename = `./test-output/${promptId}-${model}-seed-${seed || 'auto'}-${index + 1}-${timestamp}.png`
            fs.writeFileSync(filename, outputBase64, 'base64')
            savedFiles.push(filename)
            console.log(`💾 Image ${index + 1} saved to: ${filename}`)
          } else if (image.url) {
            savedFiles.push(image.url)
          }
        })
      }
    } catch (error) {
      console.warn('⚠️ Failed to save generated images:', error)
    }

    return savedFiles
  }

  /**
   * Log generation details for tracking and debugging
   */
  static logGenerationDetails(log: GenerationLog): void {
    console.log(`\n📸 AI Generation: ${log.model} with ${log.costume}`)
    console.log(`🎲 Using seed: ${log.seed || 'auto'} for costume: ${log.costume}`)
    console.log(`📝 Prompt ID: ${log.promptId}`)
    console.log(`📄 Prompt length: ${log.promptLength} characters`)
    console.log(`🔗 Reference count: ${log.referenceCount}`)
    console.log(`✅ Status: ${log.status}`)
    
    if (log.imagesGenerated) {
      console.log(`🖼️ Images Generated: ${log.imagesGenerated}`)
    }
    
    if (log.error) {
      console.log(`🚨 Error: ${log.error}`)
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

    // Add user selfie as primary reference (always first)
    if (selfieBase64) {
      references.push({
        id: 'user-selfie',
        kind: 'base64',
        value: selfieBase64,
        role: 'user',
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
      // Only add fallback costume reference, not fallback selfie (to maintain order)
      const costumeFallbacks = fallbackReferences.filter(ref => ref.role === 'costume')
      references.push(...costumeFallbacks)
    }

    // If no user selfie was provided and we need a fallback, add it at the beginning
    if (!selfieBase64 && includeFallback && references.length > 0) {
      const fallbackSelfie = this.buildFallbackReferences(selfieBase64)
        .find(ref => ref.role === 'user')
      if (fallbackSelfie) {
        references.unshift(fallbackSelfie)
      }
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
      const aPriority = a.priority || 0
      const bPriority = b.priority || 0
      return bPriority - aPriority
    })

    let selectedAssets: typeof assets

    switch (strategy) {
      case 'priority-order': {
        // Use assets with priority order, preferring primary reference IDs
        const primaryAssets = assets.filter(asset =>
          primaryReferenceIds.some(id => asset.url.includes(id))
        )
        const secondaryAssets = assets.filter(asset =>
          !primaryReferenceIds.some(id => asset.url.includes(id))
        )
        selectedAssets = [...primaryAssets, ...secondaryAssets]
        break
      }

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
    const { costume, model } = request
    const aiSettings: Partial<CostumeAIGeneration> = {
      ...(costume.aiGeneration as Partial<CostumeAIGeneration> | undefined ?? {}),
    }

    const selectedModel = options.overrideModel || model || aiSettings.model || 'seedream-v4'

    return {
      costumeId: costume.id,
      costumeName: costume.name,
      model: selectedModel,
      seed: options.overrideSeed ?? aiSettings.seed,
      promptLength: (options.overridePrompt || aiSettings.primaryPrompt || aiSettings.fallbackPrompt || '').length,
      referenceStrategy: aiSettings.referenceStrategy ?? 'priority-order',
      maxReferences: aiSettings.maxReferences ?? MODEL_REFERENCE_LIMITS[selectedModel],
      primaryReferenceIds: aiSettings.primaryReferenceIds ?? [],
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