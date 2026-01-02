import { Vault, TFile, normalizePath } from 'obsidian';
import { Meal } from '../../types/nutrition';
import { PluginSettings } from '../../types/settings';

export class MealStorage {
  constructor(private vault: Vault, private settings: PluginSettings) {}

  getMealsFilePath(): string {
    return normalizePath(`${this.settings.mealStoragePath}/meals.json`);
  }

  async readMeals(): Promise<Meal[]> {
    try {
      const mealsPath = this.getMealsFilePath();
      const mealsFile = this.vault.getAbstractFileByPath(mealsPath);
      console.log("🚀 ~ MealStorage ~ readMeals ~ mealsFile:", mealsFile)

      if (!mealsFile || !(mealsFile instanceof TFile)) {
        return [];
      }

      const content = await this.vault.read(mealsFile);
      const meals = JSON.parse(content);

      if (!Array.isArray(meals)) {
        return [];
      }

      return meals;
    } catch (error) {
      console.error('Error reading meals:', error);
      return [];
    }
  }

  async writeMeals(meals: Meal[]): Promise<void> {
    const mealsPath = this.getMealsFilePath();
    const content = JSON.stringify(meals, null, 2);
    const existingFile = this.vault.getAbstractFileByPath(mealsPath);

    if (existingFile instanceof TFile) {
      await this.vault.modify(existingFile, content);
    } else {
      await this.ensureDirectoryExists();
      await this.vault.create(mealsPath, content);
    }
  }

  private async ensureDirectoryExists(): Promise<void> {
    const exists = this.vault.getAbstractFileByPath(this.settings.mealStoragePath);
    if (!exists) {
      await this.vault.createFolder(this.settings.mealStoragePath);
    }
  }
}
