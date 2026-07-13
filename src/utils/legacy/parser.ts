import { FoodItem } from '../../types/nutrition';

// Parses the pre-3.0 card format (data-ntr-* attributes on generated <div> elements).
// Used only by the one-time v2 -> v3 migration to read existing food log notes before
// they're rewritten into the new JSON-backed, marker-wrapped format.
export function extractFoodItemsFromContent(content: string): FoodItem[] {
  const items: FoodItem[] = [];

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
