import { Vault, TFile, normalizePath } from 'obsidian';
import { Meal } from '../../types/nutrition';
import { PluginSettings } from '../../types/settings';

export function getMealsFilePath(settings: PluginSettings): string {
  return normalizePath(`${settings.mealStoragePath}/meals.json`);
}

export async function ensureMealDirectoryExists(vault: Vault, settings: PluginSettings): Promise<void> {
  const exists = vault.getAbstractFileByPath(settings.mealStoragePath);
  if (!exists) {
    await vault.createFolder(settings.mealStoragePath);
  }
}

export async function readMeals(vault: Vault, settings: PluginSettings): Promise<Meal[]> {
  try {
    const mealsPath = getMealsFilePath(settings);
    const mealsFile = vault.getAbstractFileByPath(mealsPath);

    if (!mealsFile || !(mealsFile instanceof TFile)) {
      return [];
    }

    const content = await vault.read(mealsFile);
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

export async function writeMeals(vault: Vault, settings: PluginSettings, meals: Meal[]): Promise<void> {
  const mealsPath = getMealsFilePath(settings);
  const content = JSON.stringify(meals, null, 2);
  const existingFile = vault.getAbstractFileByPath(mealsPath);

  if (existingFile instanceof TFile) {
    await vault.modify(existingFile, content);
  } else {
    await ensureMealDirectoryExists(vault, settings);
    await vault.create(mealsPath, content);
  }
}
