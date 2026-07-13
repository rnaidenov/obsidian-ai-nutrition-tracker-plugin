import { Vault } from 'obsidian';
import { updateMealItem, deleteMealItem, addItemsToMeal, handleFileRename } from '../manager';
import { Meal } from '../../../types/nutrition';
import { PluginContext } from '../../../types/plugin-context';
import { PluginSettings, DEFAULT_SETTINGS } from '../../../types/settings';
import { createFakeVault } from '../../../test-utils/fake-vault';

const settings: PluginSettings = { ...DEFAULT_SETTINGS, mealStoragePath: 'tracker/health/food/meals' };

function makeCtx(vault: Vault): PluginContext {
  return { vault, settings, app: {} as PluginContext['app'] };
}

function mealsFile(meals: Meal[]) {
  return { 'tracker/health/food/meals/meals.json': JSON.stringify(meals) };
}

describe('deleteMealItem — duplicate identical entries', () => {
  test('deleting by id removes exactly the targeted entry, not a positionally-first duplicate', async () => {
    const meal: Meal = {
      id: 'meal-1',
      name: 'Breakfast',
      items: [
        { id: 'entry-1', food: 'Egg', quantity: '2 pcs', calories: 140, protein: 12, carbs: 1, fat: 10, timestamp: '2026-07-13T08:00:00.000Z' },
        { id: 'entry-2', food: 'Egg', quantity: '2 pcs', calories: 140, protein: 12, carbs: 1, fat: 10, timestamp: '2026-07-13T18:00:00.000Z' },
      ],
      createdAt: '2026-07-13T00:00:00.000Z',
      updatedAt: '2026-07-13T00:00:00.000Z',
    };
    const { vault, files } = createFakeVault(mealsFile([meal]));

    // Delete the SECOND identical entry specifically — the old tuple-based lookup could
    // only ever remove the first match in the array, regardless of which one was targeted.
    await deleteMealItem(makeCtx(vault), 'entry-2');

    const savedMeals: Meal[] = JSON.parse(files.get('tracker/health/food/meals/meals.json')!);
    expect(savedMeals[0].items).toHaveLength(1);
    expect(savedMeals[0].items[0].id).toBe('entry-1');
  });

  test('does nothing destructive when the id is not found in any meal', async () => {
    const meal: Meal = {
      id: 'meal-1',
      name: 'Breakfast',
      items: [{ id: 'entry-1', food: 'Egg', quantity: '2 pcs', calories: 140, protein: 12, carbs: 1, fat: 10 }],
      createdAt: '2026-07-13T00:00:00.000Z',
      updatedAt: '2026-07-13T00:00:00.000Z',
    };
    const { vault, files } = createFakeVault(mealsFile([meal]));

    await deleteMealItem(makeCtx(vault), 'does-not-exist');

    const savedMeals: Meal[] = JSON.parse(files.get('tracker/health/food/meals/meals.json')!);
    expect(savedMeals[0].items).toHaveLength(1);
  });
});

describe('updateMealItem — id-based lookup', () => {
  test('updates the entry matching the given id and preserves that id', async () => {
    const meal: Meal = {
      id: 'meal-1',
      name: 'Breakfast',
      items: [
        { id: 'entry-1', food: 'Egg', quantity: '2 pcs', calories: 140, protein: 12, carbs: 1, fat: 10 },
        { id: 'entry-2', food: 'Egg', quantity: '2 pcs', calories: 140, protein: 12, carbs: 1, fat: 10 },
      ],
      createdAt: '2026-07-13T00:00:00.000Z',
      updatedAt: '2026-07-13T00:00:00.000Z',
    };
    const { vault, files } = createFakeVault(mealsFile([meal]));

    await updateMealItem(makeCtx(vault), 'entry-2', { food: 'Scrambled egg', quantity: '3 pcs', calories: 210, protein: 18, carbs: 1, fat: 15 });

    const savedMeals: Meal[] = JSON.parse(files.get('tracker/health/food/meals/meals.json')!);
    expect(savedMeals[0].items[0]).toMatchObject({ id: 'entry-1', food: 'Egg' });
    expect(savedMeals[0].items[1]).toMatchObject({ id: 'entry-2', food: 'Scrambled egg', quantity: '3 pcs', calories: 210 });
  });
});

describe('addItemsToMeal — assigns ids to newly added items', () => {
  test('appended items each receive a distinct id', async () => {
    const meal: Meal = {
      id: 'meal-1',
      name: 'Breakfast',
      items: [{ id: 'entry-1', food: 'Egg', quantity: '2 pcs', calories: 140, protein: 12, carbs: 1, fat: 10 }],
      createdAt: '2026-07-13T00:00:00.000Z',
      updatedAt: '2026-07-13T00:00:00.000Z',
    };
    const { vault, files } = createFakeVault(mealsFile([meal]));

    await addItemsToMeal(makeCtx(vault), 'meal-1', [
      { food: 'Toast', quantity: '1 slice', calories: 80, protein: 3, carbs: 15, fat: 1 },
      { food: 'Butter', quantity: '10g', calories: 70, protein: 0, carbs: 0, fat: 8 },
    ]);

    const savedMeals: Meal[] = JSON.parse(files.get('tracker/health/food/meals/meals.json')!);
    expect(savedMeals[0].items).toHaveLength(3);
    const ids = savedMeals[0].items.map(item => item.id);
    expect(new Set(ids).size).toBe(3);
    for (const id of ids) {
      expect(typeof id).toBe('string');
      expect(id!.length).toBeGreaterThan(0);
    }
  });
});

describe('handleFileRename — path/JSON based, no content parsing', () => {
  function meal(overrides: Partial<Meal> = {}): Meal {
    return {
      id: 'meal-1',
      name: 'Breakfast Bowl',
      items: [],
      createdAt: '2026-07-13T00:00:00.000Z',
      updatedAt: '2026-07-13T00:00:00.000Z',
      version: 2,
      ...overrides,
    };
  }

  test('a hand-rename in the file explorer updates the meal name in JSON', async () => {
    const { vault, files } = createFakeVault(mealsFile([meal()]));

    await handleFileRename(
      makeCtx(vault),
      'tracker/health/food/meals/breakfast-bowl.md',
      'tracker/health/food/meals/morning-bowl.md'
    );

    const savedMeals: Meal[] = JSON.parse(files.get('tracker/health/food/meals/meals.json')!);
    expect(savedMeals[0].name).toBe('Morning Bowl');
  });

  test('is a no-op when the name already matches (self-triggered by a UI-driven rename)', async () => {
    // Simulates updateMeal's flow: JSON is written with the new name BEFORE the file is
    // renamed, so by the time the vault "rename" event fires, sanitizeMealName(name) no
    // longer matches the old filename — handleFileRename must not touch the JSON again.
    const { vault, files } = createFakeVault(mealsFile([meal({ name: 'Morning Bowl' })]));
    const before = files.get('tracker/health/food/meals/meals.json');

    await handleFileRename(
      makeCtx(vault),
      'tracker/health/food/meals/breakfast-bowl.md',
      'tracker/health/food/meals/morning-bowl.md'
    );

    expect(files.get('tracker/health/food/meals/meals.json')).toBe(before);
  });

  test('ignores renames outside the meal storage path', async () => {
    const { vault, files } = createFakeVault(mealsFile([meal()]));
    const before = files.get('tracker/health/food/meals/meals.json');

    await handleFileRename(makeCtx(vault), 'tracker/health/food/log/2026-07-13.md', 'tracker/health/food/log/renamed.md');

    expect(files.get('tracker/health/food/meals/meals.json')).toBe(before);
  });

  test('ignores a rename that does not match any tracked meal', async () => {
    const { vault, files } = createFakeVault(mealsFile([meal()]));
    const before = files.get('tracker/health/food/meals/meals.json');

    await handleFileRename(
      makeCtx(vault),
      'tracker/health/food/meals/some-orphaned-note.md',
      'tracker/health/food/meals/renamed-orphan.md'
    );

    expect(files.get('tracker/health/food/meals/meals.json')).toBe(before);
  });

  test('does not create or modify a note file — only meals.json is touched', async () => {
    const { vault, files } = createFakeVault(mealsFile([meal()]));

    await handleFileRename(
      makeCtx(vault),
      'tracker/health/food/meals/breakfast-bowl.md',
      'tracker/health/food/meals/morning-bowl.md'
    );

    expect(vault.create).not.toHaveBeenCalled();
    expect(files.size).toBe(1); // only meals.json exists — no .md note was ever created
    expect([...files.keys()]).toEqual(['tracker/health/food/meals/meals.json']);
  });
});
