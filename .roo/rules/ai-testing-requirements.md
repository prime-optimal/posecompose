# Testing Requirements for AI Generation Features

## Overview
This rule establishes comprehensive testing requirements for AI generation systems, ensuring reliability, performance, and quality in virtual try-on transformations.

## Core Testing Principles

### 1. Comprehensive Coverage
**Requirement**: Test all components of the AI generation pipeline
**Implementation**:
```typescript
// Test structure should cover:
describe('AI Generation Pipeline', () => {
  describe('Reference Building', () => { /* reference ordering, limits, fallbacks */ })
  describe('Prompt Generation', () => { /* prompt building, merging, validation */ })
  describe('API Integration', () => { /* payload structure, model handling, responses */ })
  describe('Error Handling', () => { /* network failures, invalid inputs, edge cases */ })
  describe('Performance', () => { /* response times, memory usage, concurrent requests */ })
})
```

### 2. Model-Specific Testing
**Requirement**: Test each supported AI model with its specific requirements
**Implementation**:
```typescript
const MODELS: NanoGptModel[] = ['seedream-v4', 'google:4@1', 'background-remover'];

MODELS.forEach(model => {
  describe(`${model} Model Integration`, () => {
    it('should build correct payload structure', () => {
      // Test model-specific payload requirements
    })
    
    it('should respect model reference limits', () => {
      // Test reference count limits per model
    })
    
    it('should handle model-specific parameters', () => {
      // Test size, steps, and other model options
    })
  })
})
```

## Reference Ordering Tests

### 1. Primary Reference Priority
**Requirement**: Verify user selfie is always the primary reference
**Implementation**:
```typescript
it('should place user selfie first when provided', () => {
  const request = AIGenerationService.buildRequest({
    costume: mockCostume,
    selfieBase64: 'data:image/jpeg;base64,test-data',
    selfieMimeType: 'image/jpeg',
    model: 'seedream-v4',
    includeFallback: false,
  })
  
  const references = request.references
  expect(references[0].id).toBe('user-selfie')
  expect(references[0].role).toBe('user')
})
```

### 2. Reference Limit Enforcement
**Requirement**: Ensure reference counts don't exceed model limits
**Implementation**:
```typescript
it('should respect model reference limits', () => {
  const mockCostumeWithManyAssets = {
    ...mockCostume,
    assets: Array(15).fill(null).map((_, i) => ({
      id: `asset-${i}`,
      type: 'main',
      url: `https://example.com/asset-${i}.jpg`,
      priority: i,
    }))
  }
  
  const request = AIGenerationService.buildRequest({
    costume: mockCostumeWithManyAssets,
    model: 'google:4@1', // Limit: 4 references
    includeFallback: false,
  })
  
  expect(request.references.length).toBeLessThanOrEqual(4)
})
```

### 3. Fallback Reference Testing
**Requirement**: Test fallback mechanisms when primary assets are missing
**Implementation**:
```typescript
it('should provide fallback references when primary assets missing', () => {
  const request = AIGenerationService.buildRequest({
    costume: mockCostumeWithNoAssets,
    model: 'seedream-v4',
    includeFallback: true,
  })
  
  expect(request.references.length).toBeGreaterThan(0)
  expect(request.references.some(ref => ref.id.includes('fallback'))).toBe(true)
})
```

## Prompt Generation Tests

### 1. Prompt Priority Testing
**Requirement**: Test prompt selection priority (database > legacy > fallback)
**Implementation**:
```typescript
it('should use database prompt when available', () => {
  const costumeWithDbPrompt = {
    ...mockCostume,
    aiSettings: { prompt: 'Database prompt' },
    aiGeneration: { primaryPrompt: 'Structured prompt' }
  }
  
  const request = AIGenerationService.buildRequest({
    costume: costumeWithDbPrompt,
    model: 'seedream-v4',
  })
  
  expect(request.prompt).toBe('Database prompt')
})
```

### 2. Prompt Validation
**Requirement**: Ensure prompts meet minimum quality standards
**Implementation**:
```typescript
it('should validate prompt structure and content', () => {
  const request = AIGenerationService.buildRequest({
    costume: mockCostume,
    model: 'seedream-v4',
  })
  
  // Check for required transformation instructions
  expect(request.prompt).toMatch(/preserve|keep|maintain/i)
  expect(request.prompt).toMatch(/transform|change|replace/i)
  expect(request.prompt.length).toBeGreaterThan(50)
})
```

## API Integration Tests

### 1. Payload Structure Validation
**Requirement**: Verify API payloads match expected structure
**Implementation**:
```typescript
it('should build correct NanoGPT payload structure', () => {
  const request = AIGenerationService.buildRequest(mockRequest)
  const payload = NanoGptProviderV2.buildPayload(request)
  
  expect(payload).toHaveProperty('model')
  expect(payload).toHaveProperty('prompt')
  expect(payload).toHaveProperty('n', 1)
  expect(payload).toHaveProperty('imageDataUrl' || 'imageDataUrls')
})
```

### 2. Response Handling
**Requirement**: Test various response formats and error conditions
**Implementation**:
```typescript
it('should handle both URL and base64 image responses', async () => {
  const mockResponse = {
    id: 'test-id',
    status: 'succeeded' as const,
    images: [
      { id: 'img-1', url: 'https://example.com/image.jpg' },
      { id: 'img-2', base64: 'base64-image-data' }
    ]
  }
  
  const result = NanoGptProviderV2.normalizeResponse(mockResponse)
  expect(result.images).toHaveLength(2)
  expect(result.images[0].url).toBeDefined()
  expect(result.images[1].base64).toBeDefined()
})
```

## Error Handling Tests

### 1. Network Failure Testing
**Requirement**: Test graceful handling of network and API failures
**Implementation**:
```typescript
it('should handle network failures with retry logic', async () => {
  const provider = new NanoGptProviderV2()
  const mockRequest = { /* ... */ }
  
  // Mock network failure
  jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'))
  
  await expect(provider.generateImage(mockRequest))
    .rejects.toThrow('Network error')
})
```

### 2. Invalid Input Testing
**Requirement**: Test validation of invalid inputs and edge cases
**Implementation**:
```typescript
it('should validate required parameters', () => {
  expect(() => {
    AIGenerationService.buildRequest({
      costume: null as any,
      model: 'seedream-v4',
    })
  }).toThrow()
  
  expect(() => {
    AIGenerationService.buildRequest({
      costume: mockCostume,
      model: 'invalid-model' as any,
    })
  }).toThrow()
})
```

## Performance Testing

### 1. Response Time Monitoring
**Requirement**: Ensure acceptable response times for user experience
**Implementation**:
```typescript
it('should complete generation within acceptable time', async () => {
  const startTime = Date.now()
  const result = await provider.generateImage(mockRequest)
  const duration = Date.now() - startTime
  
  expect(duration).toBeLessThan(30000) // 30 seconds max
  expect(result.status).toBe('succeeded')
})
```

### 2. Memory Usage Testing
**Requirement**: Monitor memory usage during image generation
**Implementation**:
```typescript
it('should not exceed memory limits during generation', async () => {
  const initialMemory = process.memoryUsage().heapUsed
  
  await provider.generateImage(mockRequest)
  
  const finalMemory = process.memoryUsage().heapUsed
  const memoryIncrease = finalMemory - initialMemory
  
  expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024) // 100MB max increase
})
```

## Integration Testing

### 1. End-to-End Flow Testing
**Requirement**: Test complete user flow from costume selection to result
**Implementation**:
```typescript
describe('End-to-End Generation Flow', () => {
  it('should complete full transformation flow', async () => {
    // 1. Select costume
    const selectedCostume = await selectCostume('bowsette')
    
    // 2. Upload selfie
    const selfieData = await uploadSelfie(testSelfiePath)
    
    // 3. Build generation request
    const request = AIGenerationService.buildRequest({
      costume: selectedCostume,
      selfieBase64: selfieData.base64,
      selfieMimeType: selfieData.mimeType,
      model: 'seedream-v4',
    })
    
    // 4. Generate image
    const result = await provider.generateImage(request)
    
    // 5. Verify result
    expect(result.status).toBe('succeeded')
    expect(result.images).toHaveLength(1)
  })
})
```

### 2. Database Integration Testing
**Requirement**: Test integration with database for AI settings
**Implementation**:
```typescript
it('should fetch AI settings from database', async () => {
  const costume = await getCostumeWithAISettings('bowsette')
  
  expect(costume.aiSettings).toBeDefined()
  expect(costume.aiGeneration).toBeDefined()
  
  const request = AIGenerationService.buildRequest({
    costume,
    model: 'seedream-v4',
  })
  
  // Verify database settings are used
  expect(request.prompt).toBe(costume.aiSettings?.prompt)
})
```

## Visual Testing

### 1. Image Quality Validation
**Requirement**: Basic validation of generated image quality
**Implementation**:
```typescript
it('should generate images with acceptable quality', async () => {
  const result = await provider.generateImage(mockRequest)
  
  expect(result.images).toHaveLength(1)
  const image = result.images[0]
  
  if (image.base64) {
    const size = Buffer.byteLength(image.base64, 'base64')
    expect(size).toBeGreaterThan(1024) // At least 1KB
    expect(size).toBeLessThan(10 * 1024 * 1024) // Less than 10MB
  }
})
```

### 2. Transformation Accuracy
**Requirement**: Basic validation that transformations preserve identity
**Implementation**:
```typescript
it('should preserve user identity in transformations', async () => {
  const result = await provider.generateImage(mockRequest)
  
  // This would require more sophisticated image analysis
  // For now, we check that the image was generated
  expect(result.images).toHaveLength(1)
  expect(result.status).toBe('succeeded')
})
```

## Test Data Management

### 1. Test Asset Management
**Requirement**: Maintain organized test assets and data
**Implementation**:
```typescript
// Test assets should be organized:
test/
├── inputs/
│   ├── selfies/
│   │   ├── standard-selfie.jpg
│   │   ├── selfie-with-expression.jpg
│   │   └── selfie-with-glasses.jpg
│   └── costumes/
│       ├── bowsette-reference.jpg
│       ├── daisy-reference.png
│       └── rosalina-reference.webp
└── outputs/
    ├── generated-images/
    └── comparison-images/
```

### 2. Test Data Cleanup
**Requirement**: Clean up test data and temporary files
**Implementation**:
```typescript
afterEach(() => {
  // Clean up generated test files
  fs.rmSync('./test-output', { recursive: true, force: true })
  
  // Reset any mocked database state
  resetDatabaseMocks()
})
```

## Continuous Integration

### 1. Test Automation
**Requirement**: Automate all tests in CI/CD pipeline
**Implementation**:
```json
// package.json
{
  "scripts": {
    "test:ai": "bun test --run src/__tests__/*ai*.test.ts",
    "test:ai:integration": "bun test --run scripts/test-*.integration.ts",
    "test:ai:performance": "bun test --run src/__tests__/*performance*.test.ts"
  }
}
```

### 2. Test Coverage Requirements
**Requirement**: Maintain minimum test coverage for AI features
**Implementation**:
```json
// Configuration for test coverage
{
  "coverageThreshold": {
    "src/lib/ai/": 90,
    "src/__tests__/": 85,
    "scripts/test-": 80
  }
}
```

## References
- [`src/__tests__/reference-ordering.test.ts`](src/__tests__/reference-ordering.test.ts:1) - Reference ordering tests
- [`scripts/test-enhanced-ai-generation.ts`](scripts/test-enhanced-ai-generation.ts:1) - Enhanced AI generation testing
- [`scripts/test-full-integration.ts`](scripts/test-full-integration.ts:1) - Full integration testing