import { NutritionGoals } from './nutrition';

export interface PluginSettings {
  openRouterApiKey: string;
  llmModel: string;
  nutritionGoals: NutritionGoals;
  logStoragePath: string;
  mealStoragePath: string;
  imageStoragePath: string;
  
  // Display Settings
  displayTheme: 'auto' | 'light' | 'dark';
}

export const DEFAULT_SETTINGS: PluginSettings = {
  openRouterApiKey: '',
  llmModel: 'anthropic/claude-3.5-sonnet',
  nutritionGoals: {
    calories: 2000,
    protein: 150,
    carbs: 100,
    fat: 80
  },
  logStoragePath: 'tracker/health/food/log',
  mealStoragePath: 'tracker/health/food/meals',
  imageStoragePath: 'tracker/health/food/log/images',
  
  // Display Settings Defaults
  displayTheme: 'auto'
}; 