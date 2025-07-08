import { FoodItem } from '../types/nutrition';
import { PluginSettings } from '../types/settings';

export interface LLMResponse {
  items: FoodItem[];
}

export class LLMService {
  constructor(private settings: PluginSettings) {}

  private getEffectiveModel(): string {
    if (this.settings.useCustomModel && this.settings.customModelName.trim()) {
      return this.settings.customModelName.trim();
    }
    return this.settings.llmModel;
  }

  async processFood(description: string, images?: File[]): Promise<FoodItem[]> {
    if (!this.settings.openRouterApiKey) {
      throw new Error('OpenRouter API key not configured. Please set it in plugin settings.');
    }

    if (this.settings.useCustomModel && !this.settings.customModelName.trim()) {
      throw new Error('Custom model is enabled but no model name is specified. Please set a custom model name in plugin settings.');
    }

    try {
      const prompt = this.buildNutritionPrompt(description);
      const messages = await this.buildMessages(prompt, images);
      const effectiveModel = this.getEffectiveModel();

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.settings.openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://obsidian.md',
          'X-Title': 'Nutrition Tracker Plugin'
        },
        body: JSON.stringify({
          model: effectiveModel,
          messages: messages,
          response_format: { type: 'json_object' },
          max_tokens: 1000,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from OpenRouter API');
      }

      return this.parseNutritionResponse(data.choices[0].message.content);
    } catch (error) {
      console.error('LLM Service Error:', error);
      throw error;
    }
  }

  private buildNutritionPrompt(description: string): string {
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

  private async buildMessages(prompt: string, images?: File[]): Promise<any[]> {
    const messages: any[] = [
      {
        role: 'system',
        content: 'You are a nutrition expert. Analyze food descriptions and return accurate nutrition data in JSON format. Always respond with valid JSON only.'
      }
    ];

    if (images && images.length > 0) {
      // Convert all images to base64 for multimodal models
      const imageContents = await Promise.all(
        images.map(async (image) => ({
          type: 'image_url',
          image_url: { url: `data:${image.type};base64,${await this.imageToBase64(image)}` }
        }))
      );

      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          ...imageContents
        ]
      });
    } else {
      messages.push({
        role: 'user',
        content: prompt
      });
    }

    return messages;
  }

  private async imageToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private parseNutritionResponse(content: string): FoodItem[] {
    try {
      // Clean up the response - remove any markdown formatting or extra text
      const cleanContent = content.trim().replace(/```json\n?|\n?```/g, '');
      
      const parsed: LLMResponse = JSON.parse(cleanContent);
      
      if (!parsed.items || !Array.isArray(parsed.items)) {
        throw new Error('Response does not contain valid items array');
      }

      // Validate and clean each food item
      return parsed.items.map((item, index) => {
        if (!item.food || typeof item.food !== 'string') {
          throw new Error(`Item ${index + 1}: Missing or invalid food name`);
        }
        
        if (!item.quantity || typeof item.quantity !== 'string') {
          throw new Error(`Item ${index + 1}: Missing or invalid quantity`);
        }

        const calories = this.parseNumber(item.calories, 'calories');
        const protein = this.parseNumber(item.protein, 'protein');
        const carbs = this.parseNumber(item.carbs, 'carbs');
        const fat = this.parseNumber(item.fat, 'fat');

        return {
          food: item.food.trim(),
          quantity: item.quantity.trim(),
          calories: Math.round(calories * 10) / 10,
          protein: Math.round(protein * 10) / 10,
          carbs: Math.round(carbs * 10) / 10,
          fat: Math.round(fat * 10) / 10,
          emoji: item.emoji || '🍽️',
          timestamp: new Date().toISOString()
        };
      });
    } catch (error) {
      console.error('Error parsing nutrition response:', error);
      console.error('Raw content:', content);
      throw new Error(`Failed to parse nutrition data: ${error.message}`);
    }
  }

  private parseNumber(value: any, fieldName: string): number {
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    
    if (isNaN(num) || num < 0) {
      throw new Error(`Invalid ${fieldName} value: ${value}`);
    }
    
    return num;
  }
} 