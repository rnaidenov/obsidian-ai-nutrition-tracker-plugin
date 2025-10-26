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
}

export const DEFAULT_SETTINGS: PluginSettings = {
  openRouterApiKey: '',
  llmModel: 'anthropic/claude-3.5-sonnet',
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
    proteinEmoji: '💪',
    carbsEmoji: '🌾',
    fatEmoji: '🥑'
  }
}; 