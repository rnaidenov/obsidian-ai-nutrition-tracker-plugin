import { FoodItem, NutritionData, Meal } from '../types/nutrition';

export function extractFoodItemsFromContent(content: string): FoodItem[] {
  const items: FoodItem[] = [];

  // Extract food items using data-ntr-* attributes
  const regex = /<div[^>]*data-ntr-food="([^"]*)"[^>]*data-ntr-quantity="([^"]*)"[^>]*data-ntr-calories="([\d.]+)"[^>]*data-ntr-protein="([\d.]+)"[^>]*data-ntr-carbs="([\d.]+)"[^>]*data-ntr-fat="([\d.]+)"[^>]*>/g;

  let match;
  while ((match = regex.exec(content)) !== null) {
    items.push({
      food: match[1].replace(/&quot;/g, '"'),
      quantity: match[2].replace(/&quot;/g, '"'),
      calories: parseFloat(match[3]),
      protein: parseFloat(match[4]),
      carbs: parseFloat(match[5]),
      fat: parseFloat(match[6])
    });
  }

  return items;
}

export function calculateTotals(foodItems: FoodItem[]): NutritionData {
  return foodItems.reduce((totals, item) => ({
    calories: totals.calories + (item.calories || 0),
    protein: totals.protein + (item.protein || 0),
    carbs: totals.carbs + (item.carbs || 0),
    fat: totals.fat + (item.fat || 0)
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

export function calculatePercentage(current: number, goal: number): number {
  if (goal === 0) return 0;
  return Math.round((current / goal) * 100);
}

export function parseMealFromMarkdown(content: string): Partial<Meal> | null {
  try {
    // Extract meal ID from HTML data attribute
    const mealIdMatch = content.match(/data-meal-id="([^"]+)"/);
    if (!mealIdMatch) {
      return null;
    }

    const mealId = mealIdMatch[1];

    // Extract description (if exists)
    const descriptionMatch = content.match(/## 📝 Description\n([\s\S]+?)\n\n/);
    const description = descriptionMatch ? descriptionMatch[1].trim() : undefined;

    // Extract food items from card layout
    const foodItems = extractFoodItemsFromContent(content);

    return {
      id: mealId,
      items: foodItems,
      description
    };
  } catch (error) {
    console.error('Error parsing meal from markdown:', error);
    return null;
  }
}

// The generated region (cards + progress summary) is wrapped in these markers so a full
// re-render can replace it in place without touching user-authored content above/below.
export const NTR_MARKER_BEGIN = '%% ntr:begin %%';
export const NTR_MARKER_END = '%% ntr:end %%';

export function wrapInMarkers(generatedContent: string): string {
  return `${NTR_MARKER_BEGIN}\n${generatedContent}\n${NTR_MARKER_END}`;
}

export function replaceMarkedRegion(content: string, newRegionContent: string): string {
  const beginIndex = content.indexOf(NTR_MARKER_BEGIN);
  const endIndex = content.indexOf(NTR_MARKER_END);

  if (beginIndex === -1 || endIndex === -1 || endIndex < beginIndex) {
    const separator = content.trim().length > 0 ? '\n\n' : '';
    return content + separator + wrapInMarkers(newRegionContent);
  }

  const before = content.slice(0, beginIndex);
  const after = content.slice(endIndex + NTR_MARKER_END.length);
  return before + wrapInMarkers(newRegionContent) + after;
}
