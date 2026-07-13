import { NutritionGoals } from './nutrition';

export interface AppearanceSettings {
  caloriesEmoji: string;
  proteinEmoji: string;
  carbsEmoji: string;
  fatEmoji: string;
}

export interface PluginSettings {
  openRouterApiKey: string;
  llmModel: string;
  useCustomModel: boolean;
  customModelName: string;
  nutritionGoals: NutritionGoals;
  logStoragePath: string;
  mealStoragePath: string;
  imageStoragePath: string;
  appearance: AppearanceSettings;
  // Deliberately absent from DEFAULT_SETTINGS below. loadSettings() merges saved data
  // over the defaults, so if this had a default, every pre-3.0 vault (whose saved
  // data.json predates this field) would silently inherit "already migrated" and skip
  // the v2->v3 migration. Leaving it unset lets the migration itself decide, then persist
  // 3 afterwards for both fresh and upgraded vaults.
  dataVersion?: number;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  openRouterApiKey: '',
  llmModel: 'google/gemini-2.5-flash',
  useCustomModel: false,
  customModelName: '',
  nutritionGoals: {
    calories: 2000,
    protein: 150,
    carbs: 100,
    fat: 80
  },
  logStoragePath: 'tracker/health/food/log',
  mealStoragePath: 'tracker/health/food/meals',
  imageStoragePath: 'tracker/health/food/log/images',
  appearance: {
    caloriesEmoji: '🔥',
    proteinEmoji: '🥩',
    carbsEmoji: '🍚',
    fatEmoji: '🥑'
  }
}; 