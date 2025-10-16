// Auto-generated costume settings from scripts
// Generated on: 2025-10-16T05:02:33.932Z

export type AiGenerationSettings = {
  model?: string
  prompt?: string
  steps?: number
  seed?: number
  resolution?: 'auto' | '512x512' | '1024x1024'
  showExplicitContent?: boolean
  referenceUrls?: string[]
}

export const EXTRACTED_COSTUME_SETTINGS = {
  "rosalina": {
    "model": "seedream-v4",
    "seed": 1004,
    "primaryPrompt": "The user uploaded a personal photo (image 1).\n          Apply the selected costume from the followin...",
    "steps": 30,
    "resolution": "auto",
    "showExplicitContent": true,
    "maxReferences": 2,
    "primaryReferenceIds": [
      "rosalina-blurred",
      "rosalina-crown"
    ],
    "costumeUrls": [
      "https://f004.backblazeb2.com/file/waifu-test/costumes/rosalina/rosalina-blurred.png",
      "https://f004.backblazeb2.com/file/waifu-test/costumes/rosalina/rosalina-crown.jpg"
    ]
  },
  "bowsette": {
    "model": "seedream-v4",
    "seed": 1003,
    "primaryPrompt": "The user uploaded a personal photo (image 1).\n          Apply the selected costume from the followin...",
    "steps": 30,
    "resolution": "auto",
    "showExplicitContent": true,
    "maxReferences": 7,
    "primaryReferenceIds": [
      "bowsette-blurred",
      "bowsette-crown",
      "bowsette-horns",
      "bowsette-wig",
      "bowsette-empty",
      "bowsette-skirt",
      "bowsette-arms-up"
    ],
    "costumeUrls": [
      "https://f004.backblazeb2.com/file/waifu-test/costumes/bowsette/bowsette-blurred.png",
      "https://f004.backblazeb2.com/file/waifu-test/costumes/bowsette/bowsette-crown.jpg",
      "https://f004.backblazeb2.com/file/waifu-test/costumes/bowsette/bowsette-horns.jpg",
      "https://f004.backblazeb2.com/file/waifu-test/costumes/bowsette/bowsette-wig.jpg",
      "https://f004.backblazeb2.com/file/waifu-test/costumes/bowsette/bowsette-empty.jpg",
      "https://f004.backblazeb2.com/file/waifu-test/costumes/bowsette/bowsette-skirt.jpg",
      "https://f004.backblazeb2.com/file/waifu-test/costumes/bowsette/bowsette-arms-up.jpg"
    ]
  },
  "daisy-bodysuit": {
    "model": "seedream-v4",
    "seed": 1001,
    "primaryPrompt": "The user uploaded a personal photo (image 1).\n          Apply the selected costume from the followin...",
    "steps": 30,
    "resolution": "auto",
    "showExplicitContent": false,
    "maxReferences": 1,
    "primaryReferenceIds": [
      "daisy-bodysuit-blurred"
    ],
    "costumeUrls": [
      "https://f004.backblazeb2.com/file/waifu-test/costumes/daisy-bodysuit/daisy-bodysuit-blurred.png"
    ]
  }
} as const;

export type CostumeScriptSettings = {
  model: string;
  seed: number;
  primaryPrompt: string;
  negativePrompt?: string;
  steps: number;
  resolution: string;
  showExplicitContent: boolean;
  maxReferences: number;
  primaryReferenceIds: string[];
  costumeUrls: string[];
};
