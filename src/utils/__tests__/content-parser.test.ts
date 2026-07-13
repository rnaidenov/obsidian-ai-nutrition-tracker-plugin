import { generateCardLayout } from '../layout-generator';
import {
  extractFoodItemsFromContent,
  calculateTotals,
  calculatePercentage,
  deleteCardFromContent,
} from '../content-parser';
import { FoodItem, NutritionGoals } from '../../types/nutrition';

const goals: NutritionGoals = { calories: 2000, protein: 150, carbs: 100, fat: 80 };

describe('extractFoodItemsFromContent — round trip against generateCardLayout output', () => {
  test('plain food item', () => {
    const item: FoodItem = { food: 'Chicken breast', quantity: '150g', calories: 250, protein: 40, carbs: 0, fat: 8 };
    const content = generateCardLayout([item], goals);
    expect(extractFoodItemsFromContent(content)).toEqual([item]);
  });

  test('multiple food items preserve order', () => {
    const items: FoodItem[] = [
      { food: 'Oats', quantity: '50g', calories: 190, protein: 7, carbs: 33, fat: 3 },
      { food: 'Banana', quantity: '1 medium', calories: 105, protein: 1, carbs: 27, fat: 0 },
    ];
    const content = generateCardLayout(items, goals);
    expect(extractFoodItemsFromContent(content)).toEqual(items);
  });

  test('double quotes in food name round trip through &quot; escaping', () => {
    const item: FoodItem = { food: 'Rice "Basmati"', quantity: '100g', calories: 130, protein: 2.7, carbs: 28, fat: 0.3 };
    const content = generateCardLayout([item], goals);
    expect(content).toContain('data-ntr-food="Rice &quot;Basmati&quot;"');
    expect(extractFoodItemsFromContent(content)).toEqual([item]);
  });

  test('regex-metacharacter-heavy food name round trips correctly (extraction does not build a regex from food data)', () => {
    const item: FoodItem = { food: 'Chicken (grilled) + rice [200g]', quantity: '1 serving', calories: 300, protein: 30, carbs: 20, fat: 10 };
    const content = generateCardLayout([item], goals);
    expect(extractFoodItemsFromContent(content)).toEqual([item]);
  });

  test('unicode and emoji in food name round trip', () => {
    const item: FoodItem = { food: 'Käsespätzle 🧀', quantity: '1 Portion', calories: 480, protein: 18, carbs: 55, fat: 20 };
    const content = generateCardLayout([item], goals);
    expect(extractFoodItemsFromContent(content)).toEqual([item]);
  });

  test('decimal macro values round trip', () => {
    const item: FoodItem = { food: 'Almonds', quantity: '15g', calories: 87.3, protein: 3.2, carbs: 2.5, fat: 7.5 };
    const content = generateCardLayout([item], goals);
    expect(extractFoodItemsFromContent(content)).toEqual([item]);
  });

  test('zero-value macros round trip', () => {
    const item: FoodItem = { food: 'Black coffee', quantity: '1 cup', calories: 0, protein: 0, carbs: 0, fat: 0 };
    const content = generateCardLayout([item], goals);
    expect(extractFoodItemsFromContent(content)).toEqual([item]);
  });

  test('no food cards in content returns an empty array', () => {
    expect(extractFoodItemsFromContent('# Just a heading\n\nSome notes.')).toEqual([]);
  });
});

describe('calculateTotals', () => {
  test('sums calories, protein, carbs and fat across items', () => {
    const items: FoodItem[] = [
      { food: 'A', quantity: '1', calories: 100, protein: 10, carbs: 5, fat: 2 },
      { food: 'B', quantity: '1', calories: 200, protein: 20, carbs: 15, fat: 8 },
    ];
    expect(calculateTotals(items)).toEqual({ calories: 300, protein: 30, carbs: 20, fat: 10 });
  });

  test('empty item list totals to zero', () => {
    expect(calculateTotals([])).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });

  test('treats missing/undefined macro fields as zero', () => {
    const items = [{ food: 'A', quantity: '1' } as FoodItem];
    expect(calculateTotals(items)).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });
});

describe('calculatePercentage', () => {
  test('rounds to the nearest percent', () => {
    expect(calculatePercentage(150, 200)).toBe(75);
    expect(calculatePercentage(1, 3)).toBe(33);
  });

  test('goal of zero returns zero instead of dividing by zero', () => {
    expect(calculatePercentage(100, 0)).toBe(0);
    expect(calculatePercentage(0, 0)).toBe(0);
  });

  test('can exceed 100 when current exceeds goal', () => {
    expect(calculatePercentage(300, 200)).toBe(150);
  });
});

describe('documented bug: duplicate identical entries are indistinguishable to deleteCardFromContent', () => {
  test('deleting one of two identical entries always removes the first one in document order, not necessarily the one the user targeted', () => {
    const duplicate = { food: 'Egg', quantity: '2 pcs', calories: 140, protein: 12, carbs: 1, fat: 10 };
    const first: FoodItem = { ...duplicate, timestamp: '2026-07-13T08:00:00.000Z' };
    const second: FoodItem = { ...duplicate, timestamp: '2026-07-13T18:00:00.000Z' };
    const content = generateCardLayout([first, second], goals);

    // The identity used for lookup is the (food, quantity, calories, protein, carbs, fat) tuple —
    // it carries no timestamp/id, so both cards match equally and only positional order decides
    // which one is removed. There is no way to ask "delete the second Egg entry" specifically.
    const result = deleteCardFromContent(content, duplicate);

    expect(result.success).toBe(true);
    const remainingCards = extractFoodItemsFromContent(result.content);
    expect(remainingCards).toHaveLength(1);

    // Always the first-in-document-order card is removed, regardless of which one a user
    // clicked delete on in the rendered note — this is the ambiguity the refactor's stable
    // per-entry IDs are meant to fix. Only the second (later) entry's timestamp survives.
    const survivingTimestamps = result.content.match(/ntr-food-card-timestamp">🕐 [^<]+</g) ?? [];
    expect(survivingTimestamps).toHaveLength(1);
    expect(result.content).not.toContain(new Date(first.timestamp!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
  });
});
