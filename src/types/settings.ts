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

  // Template settings
  templatesPath: string;
  useCustomTemplates: boolean;
  defaultTemplate: string;
  enableYAMLFrontmatter: boolean;

  // Meal category settings
  showMealCategories: boolean;
  groupByCategory: boolean;
  showTimestamps: boolean;
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
  },

  // Template settings
  templatesPath: 'tracker/health/food/templates',
  useCustomTemplates: false,
  defaultTemplate: 'classic-html',
  enableYAMLFrontmatter: false,

  // Meal category settings
  showMealCategories: true,
  groupByCategory: true,
  showTimestamps: true
}; 