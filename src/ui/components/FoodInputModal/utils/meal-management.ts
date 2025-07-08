import { Meal } from '../../../../types/nutrition';
import { FileService } from '../../../../services/file-service';

export class MealManager {
  private availableMeals: Meal[] = [];
  private selectedMeals: Meal[] = [];

  constructor(private fileService: FileService) {}

  async loadMeals(): Promise<void> {
    try {
      this.availableMeals = await this.fileService.getMeals();
    } catch (error) {
      console.error('Error loading meals:', error);
      this.availableMeals = [];
    }
  }

  async addMeal(mealId: string): Promise<void> {
    const meal = await this.fileService.getMealById(mealId);
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