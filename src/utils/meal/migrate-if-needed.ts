import { Vault, Notice } from 'obsidian';
import { PluginSettings } from '../../types/settings';
import { migrateMealsToV2, isLegacyMeal } from './meal-operations';
import { readMeals, writeMeals } from './meal-storage';

export async function migrateIfNeeded(
  vault: Vault,
  settings: PluginSettings
): Promise<{ migrated: boolean; count: number }> {
  const meals = await readMeals(vault, settings);

  const legacyMeals = meals.filter(isLegacyMeal);

  if (legacyMeals.length === 0) {
    return { migrated: false, count: 0 };
  }

  const migratedMeals = migrateMealsToV2(meals);

  await writeMeals(vault, settings, migratedMeals);

  new Notice(`✅ Migrated ${legacyMeals.length} meal(s) to new format`);

  return { migrated: true, count: legacyMeals.length };
}
