import { generateCardLayout } from '../../layout-generator';
import { extractFoodItemsFromContent } from '../parser';
import { FoodItem, NutritionGoals } from '../../../types/nutrition';

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
