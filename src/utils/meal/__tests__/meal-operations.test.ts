import { createMeal } from '../meal-operations';
import { FoodItem, ServingUnit } from '../../../types/nutrition';

const servingUnit: ServingUnit = { type: 'serving', amount: 1, label: 'per serving' };

describe('createMeal assigns stable ids to items', () => {
  test('items without an id get a fresh, unique id', () => {
    const items: FoodItem[] = [
      { food: 'Egg', quantity: '2 pcs', calories: 140, protein: 12, carbs: 1, fat: 10 },
      { food: 'Toast', quantity: '1 slice', calories: 80, protein: 3, carbs: 15, fat: 1 },
    ];

    const meal = createMeal('meal-1', 'Breakfast', items, servingUnit);

    expect(meal.items).toHaveLength(2);
    for (const item of meal.items) {
      expect(typeof item.id).toBe('string');
      expect(item.id!.length).toBeGreaterThan(0);
    }
    expect(meal.items[0].id).not.toBe(meal.items[1].id);
  });

  test('an item that already carries an id keeps it', () => {
    const items: FoodItem[] = [
      { id: 'stable-id-1', food: 'Egg', quantity: '2 pcs', calories: 140, protein: 12, carbs: 1, fat: 10 },
    ];

    const meal = createMeal('meal-1', 'Breakfast', items, servingUnit);

    expect(meal.items[0].id).toBe('stable-id-1');
  });

  test('duplicate identical items each get their own distinct id', () => {
    const items: FoodItem[] = [
      { food: 'Egg', quantity: '2 pcs', calories: 140, protein: 12, carbs: 1, fat: 10 },
      { food: 'Egg', quantity: '2 pcs', calories: 140, protein: 12, carbs: 1, fat: 10 },
    ];

    const meal = createMeal('meal-1', 'Breakfast', items, servingUnit);

    expect(meal.items[0].id).not.toBe(meal.items[1].id);
  });
});
