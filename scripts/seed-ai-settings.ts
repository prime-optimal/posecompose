#!/usr/bin/env bun

import { neon } from '@neondatabase/serverless'

type AiSettings = {
	model?: string
	prompt?: string
	steps?: number
	seed?: number
	resolution?: 'auto' | '512x512' | '1024x1024'
	showExplicitContent?: boolean
	referenceUrls?: string[]
}

type TunedCostume = {
	slug: string
	aiSettings: AiSettings
}

const tunedSettings: TunedCostume[] = [
	{
		slug: 'bowsette',
		aiSettings: {
			model: 'seedream-v4',
			steps: 30,
			seed: 1003,
			resolution: 'auto',
			showExplicitContent: true,
			prompt: `The user uploaded a personal photo (image 1).
Apply the selected costume from the following reference image to create a realistic virtual try-on result.
Keep the user's facial expression, and skin tone.

Context: 
Behold Bowsette, the naughtiest of the Koopa tribe and Bowser's dangerously hot cousin. 
Her costume is a dramatic and provocative, two-piece ensemble that blends gothic 
elegance with a rebellious, dominant edge.

The Bodice: The top is a structured, form-fitting black top with fetish-vibes and a powerful aesthetic.
The blue jewel sticks out as the only color on her otherwise all-black outfit.

The Skirt: The bottom is a high-waisted, short skirt composed of multiple layers of black fabric. 
These layers are gathered and pleated, creating a voluminous, ruffled silhouette that contrasts 
sharply with the tight bodice. 

The skirt is notably short, ending high on the thighs, and its fullness adds a playful, 
theatrical element to the otherwise severe top.

She wears sheer black stockings, a spiked choker, and a menacing horned crown and long blonde hair. 
Her powerful stance and smoldering gaze exude dominance and playful rebellion, 
making her the ultimate bad girl of the Mushroom Kingdom.

Photorealistic, dramatic lighting.  Spotlights shining on her from both sides.

The image should emphasize craftsmanship, fabric details, and authentic video game character costuming.

Background: the moat of a castle with lava in the background.  Slightly muted contrast to emphasize 
the detail on the corset.  
Avoid: No sunglasses, no frowns, no words on clothing.
Style: hyper-detailed, photorealistic, cinematic lighting, sharp focus, 8K.`,
			referenceUrls: [
				'https://f004.backblazeb2.com/file/waifu-test/costumes/bowsette/bowsette-blurred.png',
				'https://f004.backblazeb2.com/file/waifu-test/costumes/bowsette/bowsette-crown.jpg',
				'https://f004.backblazeb2.com/file/waifu-test/costumes/bowsette/bowsette-horns.jpg',
				'https://f004.backblazeb2.com/file/waifu-test/costumes/bowsette/bowsette-wig.jpg',
				'https://f004.backblazeb2.com/file/waifu-test/costumes/bowsette/bowsette-empty.jpg',
				'https://f004.backblazeb2.com/file/waifu-test/costumes/bowsette/bowsette-skirt.jpg',
				'https://f004.backblazeb2.com/file/waifu-test/costumes/bowsette/bowsette-arms-up.jpg',
			],
		},
	},
	{
		slug: 'daisy-bodysuit',
		aiSettings: {
			model: 'seedream-v4',
			steps: 30,
			seed: 1001,
			resolution: 'auto',
			prompt: `The user uploaded a personal photo (image 1).
Apply the selected costume from the following reference image to create a realistic virtual try-on result.

Context:
A highly detailed full-body rendering of Princess Daisy's
racing suit costume from Super Mario Kart.
Focus on the outfits design and materials.
The costume is a sleek, form-fitting bodysuit made of glossy yellow
and bright orange late with reflective, vinyl-like texture.
Orange panels run down the arms and sides, complemented by white stripe accents at the wrists.
A gold belt with a square buckle cinches the waist.
The cut of the bodysuit shows off her bare thighs.
The chest area has a small green gemstone brooch resembling a daisy flower emblem.
Include long orange gloves that match the suit, and a small,
detailed golden crown adorned with red and green jewels positioned above her head.
The lighting should highlight the costumes shimmer and contours, evoking the clean,
vibrant aesthetic of Nintendo character design.
Neutral background, studio lighting.
The image should emphasize craftsmanship, fabric details, and authentic video game character costuming.
Keep the users hairstyle, facial expression and skin tone.`,
			referenceUrls: [
				'https://f004.backblazeb2.com/file/waifu-test/costumes/daisy-bodysuit/daisy-bodysuit-blurred.png',
			],
		},
	},
	{
		slug: 'rosalina',
		aiSettings: {
			model: 'seedream-v4',
			steps: 30,
			seed: 1004,
			resolution: 'auto',
			showExplicitContent: true,
			prompt: `The user uploaded a personal photo (image 1).
Apply the selected costume from the following reference image to create a realistic virtual try-on result.
Keep the users hairstyle, facial expression and skin tone.

Context:
A realistic, true to life Rosalina from Super Mario Kart. 
A seductive reimagining of Rosalina, the classic gaming princess. 
She wears a daring, form-fitting pale blue bustier that reveals 
her midriff and a hint of cleavage. The voluminous skirt is slit high, 
offering a playful glimpse of her legs. 
Dramatic, wide sleeves with delicate white lace frame her alluring pose. 
A sparkling silver, jeweled crown rests on her hair, completing this naughty 
yet elegant tribute to the celestial princess. Photorealistic, soft lighting.

The image should emphasize craftsmanship, fabric details, and authentic video game character costuming.

Background: She is at a classy, masquerade ball.  Lots of people are around, but out of focus and slightly in the shadows.
Avoid: No sunglasses, no frowns, no words on clothing.
Style: hyper-detailed, photorealistic, cinematic lighting, sharp focus, 8K.`,
			referenceUrls: [
				'https://f004.backblazeb2.com/file/waifu-test/costumes/rosalina/rosalina-blurred.png',
				'https://f004.backblazeb2.com/file/waifu-test/costumes/rosalina/rosalina-crown.jpg',
			],
		},
	},
]

const createSqlClient = () => {
	const url = process.env.NEON_DATABASE_URL ?? process.env.NEON_DATABASE_URL_READONLY
	if (!url) {
		throw new Error('NEON_DATABASE_URL is not set')
	}
	return neon(url)
}

const upsertAiSettings = async () => {
	const sql = createSqlClient()

	for (const entry of tunedSettings) {
		console.log(`🔧 Upserting ai_settings for costume: ${entry.slug}`)
		await sql`
			UPDATE costumes
			SET ai_settings = ${JSON.stringify(entry.aiSettings)}::jsonb,
			    updated_at = NOW()
			WHERE slug = ${entry.slug}
		`
	}

	console.log('✅ AI settings upsert complete')
}

upsertAiSettings().catch(error => {
	console.error('❌ Failed to upsert AI settings:', error)
	process.exit(1)
})
