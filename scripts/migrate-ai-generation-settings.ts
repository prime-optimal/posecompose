import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

const createSqlClient = () => {
  const url = process.env.NEON_DATABASE_URL
  if (!url) {
    throw new Error('NEON_DATABASE_URL is not set. Please add it to your environment before running the migration script.')
  }
  return neon(url)
}

const migrateAIGenerationSettings = async (sql: NeonQueryFunction<false, false>) => {
  console.log('🔄 Creating AI generation settings table...')
  
  await sql`
    CREATE TABLE IF NOT EXISTS costume_ai_generation (
      id TEXT PRIMARY KEY,
      costume_id TEXT REFERENCES costumes(id) ON DELETE CASCADE,
      model TEXT NOT NULL DEFAULT 'seedream-v4',
      seed INTEGER NOT NULL DEFAULT 1000,
      primary_prompt TEXT NOT NULL,
      fallback_prompt TEXT,
      negative_prompt TEXT,
      steps INTEGER NOT NULL DEFAULT 30,
      resolution TEXT NOT NULL DEFAULT 'auto',
      show_explicit_content BOOLEAN NOT NULL DEFAULT false,
      num_outputs INTEGER NOT NULL DEFAULT 1,
      reference_strategy TEXT NOT NULL DEFAULT 'priority-order',
      max_references INTEGER NOT NULL DEFAULT 5,
      primary_reference_ids TEXT[] DEFAULT '{}',
      quality_modifiers TEXT[] DEFAULT '{}',
      style_enhancements TEXT[] DEFAULT '{}',
      model_options JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(costume_id)
    )
  `
  
  console.log('✅ AI generation settings table created')
}

const migrateCostumeAssets = async (sql: NeonQueryFunction<false, false>) => {
  console.log('🔄 Updating costume assets table...')
  
  // Add priority column if it doesn't exist
  await sql`
    ALTER TABLE costume_assets 
    ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0
  `
  
  console.log('✅ Costume assets table updated')
}

const extractAndMigrateScriptSettings = async (sql: NeonQueryFunction<false, false>) => {
  console.log('🔄 Extracting settings from costume scripts...')
  
  // Define the costume settings extracted from scripts
  const costumeSettings = [
    {
      id: 'rosalina',
      model: 'seedream-v4',
      seed: 1004,
      primaryPrompt: `The user uploaded a personal photo (image 1).
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
      negativePrompt: 'low quality, blurry, medieval armor, casual clothing, extra limbs, watermark, sunglasses, frowns, words on clothing',
      steps: 30,
      resolution: 'auto',
      showExplicitContent: true,
      numOutputs: 1,
      referenceStrategy: 'priority-order',
      maxReferences: 5,
      primaryReferenceIds: ['rosalina-blurred', 'rosalina-crown'],
      qualityModifiers: ['studio lighting', 'high detail', 'color accuracy', 'photorealistic', 'soft lighting'],
      styleEnhancements: ['costume accuracy', 'fabric texture enhancement', 'accessory emphasis', 'dramatic sleeves', 'jeweled crown'],
      modelOptions: {}
    },
    {
      id: 'daisy-bodysuit',
      model: 'seedream-v4',
      seed: 1001,
      primaryPrompt: `The user uploaded a personal photo (image 1).
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
      negativePrompt: 'low quality, blurry, distorted face, extra limbs, wrong costume, casual clothing, watermark',
      steps: 30,
      resolution: 'auto',
      showExplicitContent: false,
      numOutputs: 1,
      referenceStrategy: 'priority-order',
      maxReferences: 3,
      primaryReferenceIds: ['daisy-bodysuit-blurred'],
      qualityModifiers: ['studio lighting', 'high detail', 'color accuracy', 'vibrant aesthetic'],
      styleEnhancements: ['costume accuracy', 'fabric texture enhancement', 'reflective vinyl texture', 'gold belt details'],
      modelOptions: {}
    },
    {
      id: 'bowsette',
      model: 'seedream-v4',
      seed: 1003,
      primaryPrompt: `The user uploaded a personal photo (image 1).
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
      negativePrompt: 'low quality, blurry, medieval armor, casual clothing, extra limbs, watermark, sunglasses, frowns, words on clothing',
      steps: 30,
      resolution: 'auto',
      showExplicitContent: true,
      numOutputs: 1,
      referenceStrategy: 'priority-order',
      maxReferences: 7,
      primaryReferenceIds: ['bowsette-blurred', 'bowsette-crown', 'bowsette-horns', 'bowsette-wig'],
      qualityModifiers: ['dramatic lighting', 'spotlights', 'photorealistic', 'cinematic lighting', 'sharp focus', '8K'],
      styleEnhancements: ['gothic elegance', 'dominant edge', 'structured bodice', 'ruffled silhouette', 'theatrical elements'],
      modelOptions: {}
    }
  ]
  
  // Insert the settings into the database
  for (const settings of costumeSettings) {
    await sql`
      INSERT INTO costume_ai_generation (
        id, costume_id, model, seed, primary_prompt, negative_prompt, 
        steps, resolution, show_explicit_content, num_outputs, 
        reference_strategy, max_references, primary_reference_ids,
        quality_modifiers, style_enhancements, model_options, updated_at
      )
      VALUES (
        ${settings.id}-ai-gen,
        ${settings.id},
        ${settings.model},
        ${settings.seed},
        ${settings.primaryPrompt},
        ${settings.negativePrompt},
        ${settings.steps},
        ${settings.resolution},
        ${settings.showExplicitContent},
        ${settings.numOutputs},
        ${settings.referenceStrategy},
        ${settings.maxReferences},
        ${settings.primaryReferenceIds},
        ${settings.qualityModifiers},
        ${settings.styleEnhancements},
        ${JSON.stringify(settings.modelOptions)}::jsonb,
        NOW()
      )
      ON CONFLICT (costume_id) DO UPDATE SET
        model = EXCLUDED.model,
        seed = EXCLUDED.seed,
        primary_prompt = EXCLUDED.primary_prompt,
        negative_prompt = EXCLUDED.negative_prompt,
        steps = EXCLUDED.steps,
        resolution = EXCLUDED.resolution,
        show_explicit_content = EXCLUDED.show_explicit_content,
        num_outputs = EXCLUDED.num_outputs,
        reference_strategy = EXCLUDED.reference_strategy,
        max_references = EXCLUDED.max_references,
        primary_reference_ids = EXCLUDED.primary_reference_ids,
        quality_modifiers = EXCLUDED.quality_modifiers,
        style_enhancements = EXCLUDED.style_enhancements,
        model_options = EXCLUDED.model_options,
        updated_at = NOW()
    `
    
    console.log(`✅ Migrated AI settings for costume: ${settings.id}`)
  }
  
  console.log('✅ All costume AI settings migrated')
}

const updateAssetPriorities = async (sql: NeonQueryFunction<false, false>) => {
  console.log('🔄 Updating asset priorities...')
  
  // Update specific asset priorities based on script usage
  const assetUpdates = [
    // Rosalina assets
    { costumeId: 'rosalina', urlPattern: '%rosalina-blurred%', priority: 1 },
    { costumeId: 'rosalina', urlPattern: '%rosalina-crown%', priority: 2 },
    { costumeId: 'rosalina', urlPattern: '%rosalina-square%', priority: 3 },
    
    // Daisy bodysuit assets
    { costumeId: 'daisy-bodysuit', urlPattern: '%daisy-bodysuit-blurred%', priority: 1 },
    { costumeId: 'daisy-bodysuit', urlPattern: '%daisy-bodysuit-front%', priority: 2 },
    { costumeId: 'daisy-bodysuit', urlPattern: '%daisy-bodysuit-square%', priority: 3 },
    
    // Bowsette assets
    { costumeId: 'bowsette', urlPattern: '%bowsette-blurred%', priority: 1 },
    { costumeId: 'bowsette', urlPattern: '%bowsette-crown%', priority: 2 },
    { costumeId: 'bowsette', urlPattern: '%bowsette-horns%', priority: 3 },
    { costumeId: 'bowsette', urlPattern: '%bowsette-wig%', priority: 4 },
  ]
  
  for (const update of assetUpdates) {
    await sql`
      UPDATE costume_assets 
      SET priority = ${update.priority}
      WHERE costume_id = ${update.costumeId} 
      AND url LIKE ${update.urlPattern}
    `
  }
  
  console.log('✅ Asset priorities updated')
}

const main = async () => {
  console.log('🚀 Starting AI generation settings migration...')
  
  const sql = createSqlClient()
  
  try {
    await migrateAIGenerationSettings(sql)
    await migrateCostumeAssets(sql)
    await extractAndMigrateScriptSettings(sql)
    await updateAssetPriorities(sql)
    
    console.log('🎉 Migration completed successfully!')
    console.log('')
    console.log('Summary of changes:')
    console.log('- Created costume_ai_generation table')
    console.log('- Added priority column to costume_assets')
    console.log('- Migrated AI settings from rosalina, daisy-bodysuit, and bowsette scripts')
    console.log('- Updated asset priorities based on script usage')
    console.log('')
    console.log('Next steps:')
    console.log('1. Update the AI generation flow to use database-stored settings')
    console.log('2. Test the integration with existing costumes')
    console.log('3. Add remaining costumes to the AI generation settings')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exitCode = 1
  }
}

main()