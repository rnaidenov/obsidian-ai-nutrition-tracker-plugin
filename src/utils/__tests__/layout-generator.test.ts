import {
  generateCardLayout,
  generateCTAButtons,
  generateDailySummary,
  generateMealProgressSummaryWithId,
  generateModernProgressBars,
  getColorZone,
  IdGenerator,
} from '../layout-generator';
import { FoodItem, NutritionData, NutritionGoals } from '../../types/nutrition';

function makeDeterministicIdGenerator(): IdGenerator {
  let counter = 0;
  return (prefix: string) => `${prefix}-test-${counter++}`;
}

const goals: NutritionGoals = { calories: 2000, protein: 150, carbs: 100, fat: 80 };

const items: FoodItem[] = [
  { food: 'Grilled chicken', quantity: '150g', calories: 250, protein: 40, carbs: 0, fat: 8 },
  { food: 'Brown rice', quantity: '100g', calories: 130, protein: 3, carbs: 28, fat: 1 },
];

describe('generateCardLayout snapshots (deterministic idGenerator injected)', () => {
  test('foodlog context', () => {
    expect(generateCardLayout(items, goals, 'foodlog', undefined, makeDeterministicIdGenerator())).toMatchSnapshot();
  });

  test('meal context includes the meal add-to-meal CTA and meal id', () => {
    expect(generateCardLayout(items, goals, 'meal', 'meal-123', makeDeterministicIdGenerator())).toMatchSnapshot();
  });

  test('no context renders cards without CTA buttons', () => {
    expect(generateCardLayout(items, goals, undefined, undefined, makeDeterministicIdGenerator())).toMatchSnapshot();
  });

  test('empty item list with no context renders nothing', () => {
    expect(generateCardLayout([], goals, undefined, undefined, makeDeterministicIdGenerator())).toBe('');
  });

  test('empty item list still renders the CTA button when a context is given', () => {
    expect(generateCardLayout([], goals, 'foodlog', undefined, makeDeterministicIdGenerator())).toMatchSnapshot();
  });
});

describe('generateCTAButtons snapshots', () => {
  test('foodlog CTA', () => {
    expect(generateCTAButtons('foodlog', undefined, makeDeterministicIdGenerator())).toMatchSnapshot();
  });

  test('meal CTA includes data-meal-id', () => {
    expect(generateCTAButtons('meal', 'meal-123', makeDeterministicIdGenerator())).toMatchSnapshot();
  });
});

describe('generateDailySummary / generateMealProgressSummaryWithId snapshots', () => {
  const totals: NutritionData = { calories: 1500, protein: 100, carbs: 90, fat: 50 };

  test('daily summary vs goals', () => {
    expect(generateDailySummary(totals, goals)).toMatchSnapshot();
  });

  test('meal summary vs goals includes the meal id', () => {
    expect(generateMealProgressSummaryWithId(totals, goals, 'meal-123')).toMatchSnapshot();
  });

  test('goal of zero does not divide by zero in the progress bars', () => {
    const zeroGoals: NutritionGoals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    expect(generateModernProgressBars(totals, zeroGoals)).toMatchSnapshot();
  });
});

describe('getColorZone', () => {
  test.each([
    [0, 'zone-red'],
    [24, 'zone-red'],
    [25, 'zone-orange'],
    [49, 'zone-orange'],
    [50, 'zone-yellow'],
    [74, 'zone-yellow'],
    [75, 'zone-light-green'],
    [89, 'zone-light-green'],
    [90, 'zone-green'],
    [150, 'zone-green'],
  ])('percentage %i maps to %s', (percentage, expectedZone) => {
    expect(getColorZone(percentage)).toBe(expectedZone);
  });
});
