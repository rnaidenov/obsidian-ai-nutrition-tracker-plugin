import { NutritionGoals } from './nutrition';

export interface PluginSettings {
  openRouterApiKey: string;
  llmModel: string;
  nutritionGoals: NutritionGoals;
  logStoragePath: string;
  mealStoragePath: string;
  templatePath: string;
  imageStoragePath: string;
  autoCreateDailyNotes: boolean;
  dateFormat: string;
  
  // Display Settings
  layoutStyle: 'simple' | 'cards';
  displayTheme: 'auto' | 'light' | 'dark';
  progressBarStyle: 'emoji-dots' | 'modern-bars' | 'percentage-only';
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
  templatePath: 'templates/Food Log Template.md',
  imageStoragePath: 'tracker/health/food/log/images',
  autoCreateDailyNotes: true,
  dateFormat: 'YYYY-MM-DD',
  
  // Display Settings Defaults
  layoutStyle: 'cards',
  displayTheme: 'auto',
  progressBarStyle: 'emoji-dots'
}; 