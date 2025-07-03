import { FoodItem } from '../types/nutrition';
import { PluginSettings } from '../types/settings';
import { Notice } from 'obsidian';

export interface LLMResponse {
  items: FoodItem[];
}

export class LLMService {
  constructor(private settings: PluginSettings) {}

  async processFood(description: string, image?: File): Promise<FoodItem[]> {
    if (!this.settings.openRouterApiKey) {
      throw new Error('OpenRouter API key not configured. Please set it in plugin settings.');
    }

    try {
      const prompt = this.buildNutritionPrompt(description);
      const messages = await this.buildMessages(prompt, image);

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.settings.openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://obsidian.md',
          'X-Title': 'Nutrition Tracker Plugin'
        },
        body: JSON.stringify({
          model: this.settings.llmModel,
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
You are a nutrition expert. Analyze the following food description and return accurate nutrition data in JSON format.

Food description: "${description}"

Please provide detailed nutrition information for each food item mentioned. Be as accurate as possible with portions and nutrition values based on typical serving sizes.

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

Rules:
- Break down complex meals into individual components
- Use realistic portion sizes
- Round nutrition values to 1 decimal place
- Include all identifiable foods from the description
- If portion size is unclear, assume reasonable serving sizes
- Choose the most appropriate single emoji for each food item
- Only return the JSON object, no other text
    `;
  }

  private async buildMessages(prompt: string, image?: File): Promise<any[]> {
    const messages: any[] = [
      {
        role: 'system',
        content: 'You are a nutrition expert. Analyze food descriptions and return accurate nutrition data in JSON format. Always respond with valid JSON only.'
      }
    ];

    if (image) {
      // Convert image to base64 for multimodal models
      const base64Image = await this.imageToBase64(image);
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { 
            type: 'image_url', 
            image_url: { url: `data:${image.type};base64,${base64Image}` }
          }
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



  // Test the API connection
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.settings.openRouterApiKey}`,
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }
} 