import { FoodItem } from '../../types/nutrition';

export interface LLMResponse {
  items: FoodItem[];
}

export function cleanMarkdownFormatting(content: string): string {
  return content.trim().replace(/```json\n?|\n?```/g, '');
}

export function parseNumber(value: unknown, fieldName: string): number {
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);

  if (isNaN(num) || num < 0) {
    throw new Error(`Invalid ${fieldName} value: ${JSON.stringify(value)}`);
  }

  return num;
}

export function validateFoodItem(item: any, index: number): FoodItem {
  if (!item.food || typeof item.food !== 'string') {
    throw new Error(`Item ${index + 1}: Missing or invalid food name`);
  }

  if (!item.quantity || typeof item.quantity !== 'string') {
    throw new Error(`Item ${index + 1}: Missing or invalid quantity`);
  }

  const calories = parseNumber(item.calories, 'calories');
  const protein = parseNumber(item.protein, 'protein');
  const carbs = parseNumber(item.carbs, 'carbs');
  const fat = parseNumber(item.fat, 'fat');

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
}

export function parseNutritionResponse(content: string): FoodItem[] {
  try {
    const cleanContent = cleanMarkdownFormatting(content);

    const parsed: LLMResponse = JSON.parse(cleanContent);

    if (!parsed.items || !Array.isArray(parsed.items)) {
      throw new Error('Response does not contain valid items array');
    }

    return parsed.items.map((item, index) => validateFoodItem(item, index));
  } catch (error) {
    console.error('Error parsing nutrition response:', error);
    console.error('Raw content:', content);
    throw new Error(`Failed to parse nutrition data: ${error.message}`);
  }
}
