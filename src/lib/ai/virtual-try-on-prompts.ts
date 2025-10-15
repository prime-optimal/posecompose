/**
 * Production-ready virtual try-on prompts for Halloween costumes
 * Optimized for preserving user identity while transforming costumes
 */

export interface VirtualTryOnPromptOptions {
	costumeName?: string
	costumeCategory?: string
	style?: 'halloween-cinematic' | 'costume-swap-only' | 'minimal-change' | 'retail'
}

/**
 * Halloween-specific virtual try-on prompt that preserves everything except costume
 */
export const HALLOWEEN_COSTUME_SWAP_PROMPT = (options: VirtualTryOnPromptOptions = {}) => {
	const { costumeName, costumeCategory } = options
	
	return `Halloween costume transformation: Replace ONLY the clothing/outfit of the person in the first image with the Halloween costume shown in the reference images. 

CRITICAL REQUIREMENTS:
- Keep the exact same face, hair, skin tone, and facial expression
- Preserve the original background, lighting, and environment exactly
- Maintain the same pose, body position, and proportions
- Only change the clothing to match the Halloween costume references
- Ensure seamless integration where the costume looks naturally worn
- Match fabric textures and costume details from references
- Do not alter anything except the outfit/clothing

The person should remain completely recognizable as themselves, just wearing a different Halloween costume${costumeName ? ` (${costumeName})` : ''}.`
}

/**
 * Cinematic Halloween prompt with festive atmosphere
 */
export const HALLOWEEN_CINEMATIC_PROMPT = (options: VirtualTryOnPromptOptions = {}) => {
	const { costumeName } = options
	
	return `Create a fun, cinematic Halloween appearance by applying the costume from the reference images to the person in the first image. 

Key instructions:
- Preserve the person's real facial features and identity perfectly
- Transform only the clothing to match the Halloween costume
- Add subtle Halloween atmosphere while keeping the original setting
- Ensure the costume integration looks realistic and seamless
- Maintain the same pose and expression
- Focus on making it look like the person is enjoying wearing the costume

The result should be festive and cinematic while keeping the person completely recognizable${costumeName ? ` in their ${costumeName} costume` : ''}.`
}

/**
 * Minimal change prompt for subtle costume transformation
 */
export const MINIMAL_CHANGE_PROMPT = (options: VirtualTryOnPromptOptions = {}) => {
	const { costumeName } = options
	
	return `Apply the Halloween costume from the reference images to the person in the first image with minimal environmental changes.

Requirements:
- Keep the exact same face, identity, and expression
- Preserve the original background as much as possible
- Only change the outfit to match the costume references
- Maintain original lighting and atmosphere
- Ensure natural-looking costume integration
- Keep the same pose and body positioning

The transformation should focus solely on the costume swap while preserving everything else from the original photo${costumeName ? ` with the ${costumeName}` : ''}.`
}

/**
 * System-level instruction for maximum control
 */
export const SYSTEM_LEVEL_PROMPT = (options: VirtualTryOnPromptOptions = {}) => {
	const { costumeName, costumeCategory } = options
	
	const systemInstruction = `The first image is the user's original photo. All subsequent images are Halloween costume references.

Your task is to create a Halloween costume transformation by replacing ONLY the clothing/outfit of the person from the first image with the costume elements shown in the reference images.

ABSOLUTE REQUIREMENTS:
- Preserve the person's exact facial features, identity, and expression
- Keep the original background, environment, and lighting unchanged
- Maintain the same pose, body position, and proportions
- Only transform the clothing/outfit to match the Halloween costume
- Ensure seamless, realistic costume integration
- Match costume details, textures, and colors from references
- Do not alter any element except the clothing

Output a photorealistic image showing the same person wearing the Halloween costume while everything else remains identical to the original photo.`

	const userInstruction = `Apply the Halloween costume${costumeName ? ` (${costumeName})` : ''} from the reference images to the person in the first image. Keep everything else exactly the same - only change the clothing.`

	return {
		systemPrompt: systemInstruction,
		userPrompt: userInstruction
	}
}

/**
 * Get the best prompt based on style preference
 */
export const getVirtualTryOnPrompt = (style: VirtualTryOnPromptOptions['style'] = 'costume-swap-only', options: VirtualTryOnPromptOptions = {}) => {
	switch (style) {
		case 'halloween-cinematic':
			return HALLOWEEN_CINEMATIC_PROMPT(options)
		case 'costume-swap-only':
			return HALLOWEEN_COSTUME_SWAP_PROMPT(options)
		case 'minimal-change':
			return MINIMAL_CHANGE_PROMPT(options)
		case 'retail':
			return `Generate a clean, photorealistic composite where the user from the first image wears the selected garment(s) from the reference images, suitable for e-commerce visualization. Maintain exact facial features and realistic lighting integration. Prioritize the most distinct and detailed garment layer if conflicts occur.`
		default:
			return HALLOWEEN_COSTUME_SWAP_PROMPT(options)
	}
}

/**
 * Get system/user prompt pair for APIs that support it
 */
export const getVirtualTryOnPromptPair = (style: VirtualTryOnPromptOptions['style'] = 'costume-swap-only', options: VirtualTryOnPromptOptions = {}) => {
	if (style === 'retail') {
		return {
			systemPrompt: 'Create a photorealistic e-commerce visualization showing the user wearing the selected garments.',
			userPrompt: `Apply the ${options.costumeName || 'costume'} from the reference images to the person in the first image. Maintain exact facial features and realistic lighting.`
		}
	}
	
	return SYSTEM_LEVEL_PROMPT(options)
}