import { Notice } from 'obsidian';
import { Meal } from '../../types/nutrition';
import { migrateMealsToV2, isLegacyMeal } from './meal-operations';
import { MealStorage } from './meal-storage';

export class MealMigration {
  constructor(private storage: MealStorage) {}

  async migrateIfNeeded(): Promise<{ migrated: boolean; count: number }> {
    const meals = await this.storage.readMeals();

    const legacyMeals = meals.filter(isLegacyMeal);

    if (legacyMeals.length === 0) {
      return { migrated: false, count: 0 };
    }

    const migratedMeals = migrateMealsToV2(meals);

    await this.storage.writeMeals(migratedMeals);

    new Notice(`✅ Migrated ${legacyMeals.length} meal(s) to new format (normalized to 100g baseline)`);

    return { migrated: true, count: legacyMeals.length };
  }
}
