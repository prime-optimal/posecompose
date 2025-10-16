import { describe, it, expect } from 'bun:test'
import { AIGenerationService } from '@/lib/ai/ai-generation-service'
import type { CostumePresetV2 } from '@/types/costume-v2'

describe('Reference Ordering', () => {
  const mockCostume: CostumePresetV2 = {
    id: 'test-costume',
    name: 'Test Costume',
    category: 'test',
    description: 'Test costume description',
    version: '1.0.0',
    assets: [
      {
        id: 'asset-1',
        type: 'main',
        url: 'https://example.com/costume-1.jpg',
        priority: 1,
      },
      {
        id: 'asset-2',
        type: 'detail',
        url: 'https://example.com/costume-2.jpg',
        priority: 2,
      },
    ],
    colors: {
      primary: '#ff0000',
      secondary: '#00ff00',
      accent: '#0000ff',
      palette: ['#ff0000', '#00ff00', '#0000ff'],
    },
    affiliateLinks: [],
    metadata: {
      estimatedProcessingTime: 30,
      tags: ['test'],
      difficulty: 'easy',
      compatibleModels: ['seedream-v4'],
    },
    marketing: {
      displayName: 'Test Costume',
      shortDescription: 'Test costume',
      socialPreview: 'Test costume social preview',
      callToAction: 'Try this costume',
    },
    aiGeneration: {
      model: 'seedream-v4',
      seed: 42,
      primaryPrompt: 'Test prompt',
      fallbackPrompt: 'Fallback prompt',
      steps: 20,
      resolution: '1024x1024',
      showExplicitContent: false,
      numOutputs: 1,
      referenceStrategy: 'priority-order',
      maxReferences: 4,
      primaryReferenceIds: [],
      qualityModifiers: [],
      styleEnhancements: [],
      modelOptions: {},
    },
    transformation: {
      base: 'Transform into test costume',
      variations: [],
      qualityModifiers: [],
      detailEnhancements: [],
    },
    isActive: true,
    isPremium: false,
    isNew: false,
    isFeatured: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  it('should place user selfie first when provided', () => {
    const request = AIGenerationService.buildRequest({
      costume: mockCostume,
      selfieBase64: 'data:image/jpeg;base64,test-selfie-data',
      selfieMimeType: 'image/jpeg',
      model: 'seedream-v4',
      includeFallback: false,
    })

    const references = request.references
    expect(references.length).toBeGreaterThan(0)
    expect(references[0].id).toBe('user-selfie')
    expect(references[0].role).toBe('user')
  })

  it('should place fallback selfie first when no user selfie provided', () => {
    const request = AIGenerationService.buildRequest({
      costume: mockCostume,
      selfieBase64: null,
      model: 'seedream-v4',
      includeFallback: true,
    })

    const references = request.references
    expect(references.length).toBeGreaterThan(0)
    expect(references[0].id).toBe('fallback-selfie')
    expect(references[0].role).toBe('user')
  })

  it('should maintain order: [user selfie, costume references, fallback costume]', () => {
    const request = AIGenerationService.buildRequest({
      costume: mockCostume,
      selfieBase64: 'data:image/jpeg;base64,test-selfie-data',
      selfieMimeType: 'image/jpeg',
      model: 'seedream-v4',
      includeFallback: true,
    })

    const references = request.references
    expect(references.length).toBeGreaterThan(1)
    
    // First should be user selfie
    expect(references[0].id).toBe('user-selfie')
    expect(references[0].role).toBe('user')
    
    // Next should be costume references
    const costumeRefs = references.filter(ref => ref.role === 'costume')
    expect(costumeRefs.length).toBeGreaterThan(0)
    
    // Last should be fallback costume if present
    const lastRef = references[references.length - 1]
    if (lastRef.id === 'fallback-costume') {
      expect(lastRef.role).toBe('costume')
    }
  })

  it('should work with background-remover model', () => {
    const request = AIGenerationService.buildRequest({
      costume: mockCostume,
      selfieBase64: 'data:image/jpeg;base64,test-selfie-data',
      selfieMimeType: 'image/jpeg',
      model: 'background-remover',
      includeFallback: true,
    })

    const references = request.references
    expect(references.length).toBe(1)
    expect(references[0].id).toBe('user-selfie')
    expect(references[0].role).toBe('user')
  })
})