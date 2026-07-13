import { readMeals, writeMeals, getMealsFilePath, ensureMealDirectoryExists } from '../meal-storage';
import { Meal } from '../../../types/nutrition';
import { PluginSettings, DEFAULT_SETTINGS } from '../../../types/settings';
import { createFakeVault } from '../../../test-utils/fake-vault';

const settings: PluginSettings = { ...DEFAULT_SETTINGS, mealStoragePath: 'tracker/health/food/meals' };

describe('getMealsFilePath', () => {
  test('joins the meal storage path with meals.json', () => {
    expect(getMealsFilePath(settings)).toBe('tracker/health/food/meals/meals.json');
  });
});

describe('readMeals', () => {
  test('returns an empty array when the meals file does not exist', async () => {
    const { vault } = createFakeVault();
    expect(await readMeals(vault, settings)).toEqual([]);
  });

  test('returns parsed meals from a valid JSON file', async () => {
    const meals: Meal[] = [
      { id: 'm1', name: 'Breakfast', items: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    ];
    const { vault } = createFakeVault({ 'tracker/health/food/meals/meals.json': JSON.stringify(meals) });
    expect(await readMeals(vault, settings)).toEqual(meals);
  });

  test('returns an empty array for malformed JSON instead of throwing', async () => {
    const { vault } = createFakeVault({ 'tracker/health/food/meals/meals.json': '{ not valid json' });
    expect(await readMeals(vault, settings)).toEqual([]);
  });

  test('returns an empty array when the JSON is valid but not an array', async () => {
    const { vault } = createFakeVault({ 'tracker/health/food/meals/meals.json': JSON.stringify({ oops: true }) });
    expect(await readMeals(vault, settings)).toEqual([]);
  });
});

describe('writeMeals', () => {
  test('creates the meals file and its directory when none exists yet', async () => {
    const { vault, files, folders } = createFakeVault();
    const meals: Meal[] = [
      { id: 'm1', name: 'Lunch', items: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    ];

    await writeMeals(vault, settings, meals);

    expect(folders.has('tracker/health/food/meals')).toBe(true);
    expect(JSON.parse(files.get('tracker/health/food/meals/meals.json')!)).toEqual(meals);
    expect(vault.create).toHaveBeenCalledTimes(1);
    expect(vault.modify).not.toHaveBeenCalled();
  });

  test('modifies the existing meals file in place rather than recreating it', async () => {
    const { vault, files } = createFakeVault({ 'tracker/health/food/meals/meals.json': '[]' });
    const meals: Meal[] = [
      { id: 'm1', name: 'Dinner', items: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    ];

    await writeMeals(vault, settings, meals);

    expect(JSON.parse(files.get('tracker/health/food/meals/meals.json')!)).toEqual(meals);
    expect(vault.modify).toHaveBeenCalledTimes(1);
    expect(vault.create).not.toHaveBeenCalled();
  });

  test('write then read round trips the same meals', async () => {
    const { vault } = createFakeVault();
    const meals: Meal[] = [
      { id: 'm1', name: 'Snack', items: [{ food: 'Nuts', quantity: '30g', calories: 180, protein: 6, carbs: 5, fat: 15 }], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
    ];

    await writeMeals(vault, settings, meals);
    expect(await readMeals(vault, settings)).toEqual(meals);
  });
});

describe('ensureMealDirectoryExists', () => {
  test('creates the folder when it does not exist', async () => {
    const { vault, folders } = createFakeVault();
    await ensureMealDirectoryExists(vault, settings);
    expect(folders.has('tracker/health/food/meals')).toBe(true);
    expect(vault.createFolder).toHaveBeenCalledTimes(1);
  });

  test('does nothing when the folder already exists', async () => {
    const { vault, folders } = createFakeVault();
    folders.add('tracker/health/food/meals');
    await ensureMealDirectoryExists(vault, settings);
    expect(vault.createFolder).not.toHaveBeenCalled();
  });
});
