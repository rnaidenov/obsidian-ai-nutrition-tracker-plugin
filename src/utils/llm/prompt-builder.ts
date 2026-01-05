export function buildNutritionPrompt(description: string): string {
  return `
You are a nutrition expert. Analyze the provided food information and return accurate nutrition data in JSON format.

${description ? `Text description: "${description}"` : ''}

IMPORTANT INSTRUCTIONS:
1. If images are provided, first analyze ALL food items visible in the images
2. If text is also provided, treat it as ADDITIONAL information that supplements the image analysis
3. Include ALL food items from BOTH sources - never exclude items from either the images or text
4. The text may specify quantities, add extra items, or clarify what's in the images

Example: If images show "protein shake + scrambled eggs" and text says "2 eggs", you should include:
- The protein shake (from image)
- 2 scrambled eggs (combining image visibility with text quantity)

Please provide detailed nutrition information for each food item from ALL sources.

Return ONLY valid JSON in this exact format:
{
  "items": [
    {
      "food": "specific food name",
      "quantity": "amount with unit (e.g., '150g', '1 medium', '1 cup')",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "emoji": "single most appropriate emoji for this food"
    }
  ]
}

ANALYSIS PROCESS:
1. First, identify all food items visible in any provided images
2. Then, add or modify items based on the text description
3. Combine information from both sources for complete analysis
4. Use specific quantities from text when provided
5. Include every distinct food item from both images and text

Rules:
- Break down complex meals into individual components
- Use realistic portion sizes
- Round nutrition values to 1 decimal place
- Include ALL identifiable foods from images AND text
- If portion size is unclear, assume reasonable serving sizes
- Choose the most appropriate single emoji for each food item
- When text provides specific quantities, use those exact amounts
- NEVER exclude items - combine all sources
- Only return the JSON object, no other text
    `;
}

export function buildSystemMessage(): string {
  return 'You are a nutrition expert. Analyze food descriptions and return accurate nutrition data in JSON format. Always respond with valid JSON only.';
}

export function buildUserMessageContent(
  prompt: string,
  imageUrls?: string[]
): string | Array<{ type: string; text?: string; image_url?: { url: string } }> {
  if (!imageUrls || imageUrls.length === 0) {
    return prompt;
  }

  // Build content array with text and images
  const imageContents = imageUrls.map(url => ({
    type: 'image_url',
    image_url: { url }
  }));

  return [
    { type: 'text', text: prompt },
    ...imageContents
  ];
}

export function getEffectiveModel(
  useCustomModel: boolean,
  customModelName: string,
  defaultModel: string
): string {
  if (useCustomModel && customModelName.trim()) {
    return customModelName.trim();
  }
  return defaultModel;
}
