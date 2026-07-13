import {
  calculateTotals,
  calculatePercentage,
} from '../content-parser';
import { FoodItem } from '../../types/nutrition';

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
