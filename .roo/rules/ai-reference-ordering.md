# AI Reference Ordering Requirements

## Overview
This rule establishes mandatory requirements for reference image ordering in AI generation systems to ensure proper virtual try-on transformations.

## Core Principles

### 1. User Identity Preservation
**Requirement**: User selfie must always be the primary reference image
**Implementation**: 
```typescript
const primary = references.find(reference => reference.role === 'user') ?? references[0]
const secondary = references.filter(reference => reference !== primary)
```

**Rationale**: Ensures AI transformations preserve the user's facial features, identity, and expression while only changing the clothing.

### 2. Reference Priority Hierarchy
**Required Order**:
1. User selfie (role: 'user') - Always first
2. Primary costume assets (role: 'costume') - Based on strategy
3. Fallback costume assets (role: 'costume') - When primary unavailable
4. Fallback selfie (role: 'user') - When no user selfie provided

### 3. Reference Strategy Implementation
**Supported Strategies**:
- `'priority-order'`: Use assets with priority order, preferring primary reference IDs
- `'best-match'`: Prioritize main and detail assets over examples/backgrounds
- `'random'`: Random selection for testing/variety
- `'auto'`: Default priority ordering

**Implementation**:
```typescript
switch (strategy) {
  case 'priority-order': {
    const primaryAssets = assets.filter(asset =>
      primaryReferenceIds.some(id => asset.url.includes(id))
    )
    const secondaryAssets = assets.filter(asset =>
      !primaryReferenceIds.some(id => asset.url.includes(id))
    )
    selectedAssets = [...primaryAssets, ...secondaryAssets]
    break
  }
  // ... other strategies
}
```

## Model-Specific Reference Limits

### Reference Count Limits
```typescript
export const MODEL_REFERENCE_LIMITS: Record<NanoGptModel, number> = {
  'seedream-v4': 10,
  'google:4@1': 4,
  'background-remover': 1,
}
```

### Reference Building Rules
1. **Never exceed model limits** - Use `Math.min(maxReferences, MODEL_REFERENCE_LIMITS[model])`
2. **Always include user selfie** - When available, it should be the first reference
3. **Maintain order** - User selfie first, then costume assets, then fallbacks
4. **Handle missing references** - Provide fallback assets when primary assets unavailable

## Testing Requirements

### Required Test Coverage
1. **Reference Order Tests** - Verify user selfie is always first
2. **Model Limit Tests** - Ensure reference counts don't exceed model limits
3. **Fallback Tests** - Verify fallback references work when primary assets missing
4. **Strategy Tests** - Test all reference selection strategies

### Test Examples
```typescript
it('should place user selfie first when provided', () => {
  const request = AIGenerationService.buildRequest({
    costume: mockCostume,
    selfieBase64: 'data:image/jpeg;base64,test-selfie-data',
    selfieMimeType: 'image/jpeg',
    model: 'seedream-v4',
    includeFallback: false,
  })
  
  const references = request.references
  expect(references[0].id).toBe('user-selfie')
  expect(references[0].role).toBe('user')
})
```

## Error Handling

### Missing User Selfie
**Requirement**: Provide fallback selfie when no user selfie provided
**Implementation**:
```typescript
if (!selfieBase64 && includeFallback && references.length > 0) {
  const fallbackSelfie = this.buildFallbackReferences(selfieBase64)
    .find(ref => ref.role === 'user')
  if (fallbackSelfie) {
    references.unshift(fallbackSelfie)
  }
}
```

### Missing Costume Assets
**Requirement**: Provide fallback costume assets when primary assets unavailable
**Implementation**:
```typescript
if (references.length < limit && includeFallback) {
  const fallbackReferences = this.buildFallbackReferences(selfieBase64)
  const costumeFallbacks = fallbackReferences.filter(ref => ref.role === 'costume')
  references.push(...costumeFallbacks)
}
```

## Performance Considerations

### Reference Optimization
1. **Pre-filter assets** - Only load and process relevant costume assets
2. **Cache reference building** - Cache reference arrays for repeated requests
3. **Lazy loading** - Load reference images only when needed for API requests
4. **URL validation** - Validate reference URLs before building requests

### Memory Management
1. **Limit reference count** - Respect model limits to avoid memory issues
2. **Clean up temporary references** - Remove fallback references after use
3. **Optimize image sizes** - Use appropriately sized reference images

## Best Practices

### Reference Selection
1. **Prefer high-quality assets** - Use main and detail assets over examples
2. **Consider costume type** - Different costumes may need different reference strategies
3. **Test reference effectiveness** - Monitor generation success rates by reference set
4. **Update references regularly** - Keep costume reference images current

### Monitoring
1. **Track reference usage** - Log which reference sets produce best results
2. **Monitor generation success** - Track success rates by reference count and type
3. **Collect user feedback** - Gather feedback on transformation quality
4. **A/B test reference strategies** - Test different ordering strategies

## References
- [`src/lib/ai/ai-generation-service.ts`](src/lib/ai/ai-generation-service.ts:204) - Reference building implementation
- [`src/lib/ai/references.ts`](src/lib/ai/references.ts:47) - Reference building utilities
- [`src/__tests__/reference-ordering.test.ts`](src/__tests__/reference-ordering.test.ts:1) - Reference ordering tests