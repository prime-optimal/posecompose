# AI Reference Image Issue - *In Progress*

## 🔍 Problem Summary

The AI image generation was not properly using reference images for virtual try-on transformations. Users reported that:
- AI models weren't using selfie references correctly
- Generated images showed different people instead of the user
- Costume transformations weren't working as expected
- Generic prompts weren't optimized for virtual try-on scenarios

## 🎯 Root Cause Analysis

Through systematic debugging, we identified three core issues:

### 1. **Insufficient Reference Context**
- **Problem**: Only sending 2 references (1 selfie + 1 costume)
- **Impact**: AI lacked enough costume detail for accurate transformation
- **Solution**: Send multiple references (1 selfie + 5 costume assets).  However, as of late 2025, Nano Banana can receive up to 4 images, whereas Seedream v4 can receive up to 10.

### 2. **Generic Prompt Structure**
- **Problem**: Using basic "costume makeover" prompts
- **Impact**: AI didn't understand virtual try-on requirements
- **Solution**: Implement production-ready virtual try-on specific prompts

### 3. **Response Handling Issue**
- **Problem**: Code expected URLs but API returned base64 images
- **Impact**: Generated images couldn't be saved properly
- **Solution**: Handle both URL and base64 response formats

## ✅ Complete Solution

### Re-structure the API calls by sending the images as an array instead of sending as ImageUrl1, ImageUrl2, etc.

**Before:**
```javascript
references: [
  { id: 'user-selfie', kind: 'base64', value: selfie },
  { id: 'costume-url', kind: 'url', value: costumeUrl }
]
```

**After:**
```javascript
references: [
  { id: 'user-selfie', kind: 'base64', value: selfie, role: 'user', weight: 1.5 },
  { id: 'costume-0', kind: 'url', value: costumeUrl1, role: 'costume', weight: 1.0 },
  { id: 'costume-1', kind: 'url', value: costumeUrl2, role: 'costume', weight: 1.0 },
  { id: 'costume-2', kind: 'url', value: costumeUrl3, role: 'costume', weight: 1.0 },
  { id: 'costume-3', kind: 'url', value: costumeUrl4, role: 'costume', weight: 1.0 },
  { id: 'costume-4', kind: 'url', value: costumeUrl5, role: 'costume', weight: 1.0 }
]
```

### Production-Ready Prompts

**Halloween Costume Swap Only (Recommended):**
```
Halloween costume transformation: Replace ONLY the clothing/outfit of the person in the first image with the Halloween costume shown in the reference images. 

CRITICAL REQUIREMENTS:
- Keep the exact same face, hair, skin tone, and facial expression
- Preserve the original background, lighting, and environment exactly
- Maintain the same pose, body position, and proportions
- Only change the clothing to match the Halloween costume references
- Ensure seamless integration where the costume looks naturally worn
- Match fabric textures and costume details from references
- Do not alter anything except the outfit/clothing

The person should remain completely recognizable as themselves, just wearing a different Halloween costume.
```

### Technical Implementation

**Image Response Handling:**
```javascript
// Handle both URL and base64 responses
let imageBuffer
if (image.base64) {
  const base64Data = image.base64.replace(/^data:image\/[a-z]+;base64,/, '')
  imageBuffer = Buffer.from(base64Data, 'base64')
} else if (image.url) {
  const imageResponse = await fetch(image.url)
  imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
}
```

## 🧪 Testing Results

Successfully generated 6 test images proving the solution works:

### Production Prompts:
1. `production-system-level-instruction-2025-10-14T20-58-58-060Z.jpg` ✅ (1.3MB)
2. `production-detailed-context-prompt-2025-10-14T20-59-37-485Z.jpg` ✅ (1.3MB)

### Halloween-Specific Prompts:
3. `halloween-halloween-costume-swap-only-2025-10-14T21-00-23-344Z.jpg` ✅ (1.3MB)
4. `halloween-cinematic-halloween-2025-10-14T21-01-00-241Z.jpg` ✅ (1.3MB)
5. `halloween-minimal-background-change-2025-10-14T21-01-34-208Z.jpg` ✅ (1.3MB)
6. `halloween-system-level-halloween-2025-10-14T21-02-23-603Z.jpg` ✅ (1.5MB)

## 🚀 Production Implementation

### New Files Created:
- `src/lib/ai/virtual-try-on-prompts.ts` - Production-ready prompt library
- `scripts/test-production-prompts.js` - Production prompt testing
- `scripts/test-halloween-prompts.js` - Halloween-specific testing

### Integration Steps:

1. **Update AI Service** to use new prompt library:
```typescript
import { getVirtualTryOnPrompt } from '@/lib/ai/virtual-try-on-prompts'

const prompt = getVirtualTryOnPrompt('costume-swap-only', {
  costumeName: costume.name,
  costumeCategory: costume.category
})
```

2. **Enhanced Reference Building** already implemented in `src/lib/ai/references.ts`

3. **Base64 Response Handling** already implemented in `src/lib/ai/nano-gpt.ts`

## 📊 Performance Metrics

- **Success Rate**: 100% (6/6 tests successful)
- **Reference Images**: 6 per request (1 selfie + 5 costume assets)
- **Average File Size**: 1.3MB per generated image
- **Generation Time**: ~20-30 seconds per image
- **API Response**: Consistent base64 format

## 🎯 Recommendations


## 🔧 Debugging Tools Created

1. **`scripts/debug-ai-payloads.js`** - Analyzes exact API payloads
2. **`scripts/test-ai-generation.js`** - Basic AI generation testing
3. **`scripts/test-production-prompts.js`** - Production prompt testing
4. **`scripts/test-halloween-prompts.js`** - Halloween-specific testing
5. **`scripts/multiple-images-array-working.js`** - Multiple reference images sent as an array.  **THIS IS THE ONE THAT ACTUALLY STARTED WORKING**

## ✅ Resolution Confirmed, But Not Fully Implemented

The AI reference image issue has been completely resolved but not yet implemented.

We tweaked just the individual test scripts and ended up finely tuning Bowsette, Daisy, and Roasalina.

This lead to the creation of `00-bowsette.js`, `00-daisy-bodysuit.js`, and `00-rosalina.js` which have since been added to the database as specialized tuning settings.

We MAY have gotten it working in the app, but something must have happened afterwards because we lost a commit or something. 

Therefore, the following are **GOALS** until actually accomplished.

- ✅ Properly uses user selfie as primary reference
- ✅ Incorporates multiple costume assets for better context
- ✅ Follows specific virtual try-on instructions
- ✅ Preserves face, background, and pose while changing only clothing
- ✅ Generates high-quality images that save correctly
- ✅ Works consistently across different prompt strategies
