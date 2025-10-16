
INSERT INTO costume_ai_generation (
  id, costume_id, model, seed, primary_prompt, negative_prompt, 
  steps, resolution, show_explicit_content, num_outputs, 
  reference_strategy, max_references, primary_reference_ids,
  quality_modifiers, style_enhancements, model_options, created_at, updated_at
) VALUES (
  'rosalina-ai-gen',
  'rosalina',
  'seedream-v4',
  1004,
  'The user uploaded a personal photo (image 1).
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
          Style: hyper-detailed, photorealistic, cinematic lighting, sharp focus, 8K.',
  NULL,
  30,
  'auto',
  true,
  1,
  'priority-order',
  2,
  ARRAY['rosalina-blurred', 'rosalina-crown'],
  ARRAY['photorealistic', 'sharp focus', '8K'],
  ARRAY['dramatic', 'cinematic', 'soft lighting', 'hyper-detailed'],
  '{}',
  NOW(),
  NOW()
) ON CONFLICT (costume_id) DO UPDATE SET
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
  updated_at = NOW();

INSERT INTO costume_ai_generation (
  id, costume_id, model, seed, primary_prompt, negative_prompt, 
  steps, resolution, show_explicit_content, num_outputs, 
  reference_strategy, max_references, primary_reference_ids,
  quality_modifiers, style_enhancements, model_options, created_at, updated_at
) VALUES (
  'bowsette-ai-gen',
  'bowsette',
  'seedream-v4',
  1003,
  'The user uploaded a personal photo (image 1).
          Apply the selected costume from the following reference image to create a realistic virtual try-on result.
          Keep the user\''s facial expression, and skin tone.

          Context: 
          Behold Bowsette, the naughtiest of the Koopa tribe and Bowser''s dangerously hot cousin. 
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
          Style: hyper-detailed, photorealistic, cinematic lighting, sharp focus, 8K.',
  NULL,
  30,
  'auto',
  true,
  1,
  'priority-order',
  7,
  ARRAY['bowsette-blurred', 'bowsette-crown', 'bowsette-horns', 'bowsette-wig', 'bowsette-empty', 'bowsette-skirt', 'bowsette-arms-up'],
  ARRAY['photorealistic', 'sharp focus', '8K'],
  ARRAY['dramatic', 'cinematic', 'hyper-detailed'],
  '{}',
  NOW(),
  NOW()
) ON CONFLICT (costume_id) DO UPDATE SET
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
  updated_at = NOW();

INSERT INTO costume_ai_generation (
  id, costume_id, model, seed, primary_prompt, negative_prompt, 
  steps, resolution, show_explicit_content, num_outputs, 
  reference_strategy, max_references, primary_reference_ids,
  quality_modifiers, style_enhancements, model_options, created_at, updated_at
) VALUES (
  'daisy-bodysuit-ai-gen',
  'daisy-bodysuit',
  'seedream-v4',
  1001,
  'The user uploaded a personal photo (image 1).
          Apply the selected costume from the following reference image to create a realistic virtual try-on result.

          Context:
          A highly detailed full-body rendering of Princess Daisy\''s
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
          Keep the users hairstyle, facial expression and skin tone.',
  NULL,
  30,
  'auto',
  false,
  1,
  'priority-order',
  1,
  ARRAY['daisy-bodysuit-blurred'],
  ARRAY['studio lighting'],
  ARRAY['vibrant'],
  '{}',
  NOW(),
  NOW()
) ON CONFLICT (costume_id) DO UPDATE SET
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
  updated_at = NOW();