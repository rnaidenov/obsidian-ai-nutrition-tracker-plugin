import { AbstractInputSuggest, App } from 'obsidian';
import { Meal } from '../../../../types/nutrition';

export class MealSuggest extends AbstractInputSuggest<Meal> {
  private meals: Meal[];
  private onSelectCallback: (mealId: string) => Promise<void>;

  constructor(
    app: App,
    inputEl: HTMLInputElement,
    meals: Meal[],
    onSelect: (mealId: string) => Promise<void>
  ) {
    super(app, inputEl);
    this.meals = meals;
    this.onSelectCallback = onSelect;
  }

  getSuggestions(inputStr: string): Meal[] {
    const lowerCaseInputStr = inputStr.toLowerCase();

    return this.meals.filter(meal =>
      meal.name.toLowerCase().includes(lowerCaseInputStr)
    );
  }

  renderSuggestion(meal: Meal, el: HTMLElement): void {
    el.createDiv({ text: meal.name, cls: 'meal-suggest-name' });
    el.createDiv({ 
      text: `${meal.items.length} items`, 
      cls: 'meal-suggest-count' 
    });
  }

  selectSuggestion(meal: Meal): void {
    this.setValue(meal.name);
    this.close();
    this.onSelectCallback(meal.id);
  }
}

