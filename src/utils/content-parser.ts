import { FoodItem, NutritionData } from '../types/nutrition';

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
