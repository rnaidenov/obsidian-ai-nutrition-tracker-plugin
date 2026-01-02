import { Vault, App } from 'obsidian';
import { Meal } from '../../../../types/nutrition';
import { PluginSettings } from '../../../../types/settings';
import * as MealOps from '../../../../services/meal/manager';

export class MealManager {
  private availableMeals: Meal[] = [];
  private selectedMeals: Meal[] = [];

  constructor(
    private vault: Vault,
    private app: App,
    private settings: PluginSettings
  ) {}

  private get mealDeps(): MealOps.MealDeps {
    return {
      vault: this.vault,
      app: this.app,
      settings: this.settings
    };
  }

  async loadMeals(): Promise<void> {
    try {
      this.availableMeals = await MealOps.getMeals(this.mealDeps);
    } catch (error) {
      console.error('Error loading meals:', error);
      this.availableMeals = [];
    }
  }

  async addMeal(mealId: string): Promise<void> {
    const meal = await MealOps.getMealById(this.mealDeps, mealId);
    if (meal && !this.selectedMeals.find(m => m.id === meal.id)) {
      this.selectedMeals.push(meal);
    }
  }

  removeMeal(index: number): void {
    if (index >= 0 && index < this.selectedMeals.length) {
      this.selectedMeals.splice(index, 1);
    }
  }

  getAvailableMeals(): Meal[] {
    return this.availableMeals;
  }

  getSelectedMeals(): Meal[] {
    return this.selectedMeals;
  }

  clearSelectedMeals(): void {
    this.selectedMeals = [];
  }
} 