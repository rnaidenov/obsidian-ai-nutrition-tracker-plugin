import { Setting, App } from 'obsidian';
import { Meal, FoodItem, ServingUnitType } from '../../../../types/nutrition';
import { MealSuggest } from './MealSuggest';
import { scaleNutrition, calculateTotalNutrition, calculateMealPortionNutrition } from '../../../../utils/meal/meal-operations';

export function createModalTitle(contentEl: HTMLElement, initialData: FoodItem | null, editingContext: 'meal' | 'foodlog', targetMealId?: string) {
  let title = 'Add food entry';
  if (initialData) {
    title = editingContext === 'meal' ? 'Edit meal item' : 'Edit food entry';
  } else if (targetMealId) {
    title = '➕ Add items to meal';
  }
  contentEl.createEl('h2', { text: title });
}

export function createEditingNotice(contentEl: HTMLElement, initialData: FoodItem | null, editingContext: 'meal' | 'foodlog', targetMealId?: string) {
  // Show different notices based on the context
  let noticeText = '';
  
  if (initialData) {
    // Editing existing item
    if (editingContext === 'meal') {
      noticeText = `🍽️ Editing meal item: ${initialData.quantity} ${initialData.food} (${initialData.calories} kcal). This will update the meal template for future use only. Past food logs remain unchanged.`;
    } else {
      noticeText = `✏️ Editing: ${initialData.quantity} ${initialData.food} (${initialData.calories} kcal). Modify description as needed - this will edit the existing entry.`;
    }
  } else if (targetMealId) {
    // Adding new items to specific meal
    noticeText = `🍽️ Adding new items to this meal template. The items you add will be saved to the meal for future use.`;
  }
  
  if (!noticeText) return; // No notice needed

  contentEl.createEl('p', {
    text: noticeText,
    cls: 'nutrition-tracker-edit-notice'
  });
}

export function createMealSelectionDropdown(
  app: App,
  contentEl: HTMLElement, 
  availableMeals: Meal[], 
  onMealSelect: (mealId: string) => Promise<void>
) {
  if (availableMeals.length === 0) return;
  
  const mealSelectionSetting = new Setting(contentEl)
    .setName('Add saved meals')
    .setDesc('Type to search and select from your saved meals')
    .addText(text => {
      new MealSuggest(app, text.inputEl, availableMeals, async (mealId) => {
        await onMealSelect(mealId);
        text.setValue(''); // Reset input
      });
      text.setPlaceholder('Type to search meals...');
    });
  
  mealSelectionSetting.settingEl.addClass('nutrition-tracker-meal-selection');
}

export function createSelectedMealsDisplay(
  contentEl: HTMLElement,
  selectedMeals: Meal[],
  servings: Map<string, number>,
  onRemoveMeal: (index: number) => void,
  onServingsChange: (mealId: string, servings: number) => void
) {
  if (selectedMeals.length === 0) return;

  const selectedMealsContainer = contentEl.createDiv('nutrition-tracker-selected-meals');
  selectedMealsContainer.createEl('h3', { text: 'Selected meals' });

  selectedMeals.forEach((meal, index) => {
    const mealDiv = selectedMealsContainer.createDiv('nutrition-tracker-selected-meal');
    const mealInfo = mealDiv.createDiv('nutrition-tracker-meal-info');

    mealInfo.createEl('strong', { text: meal.name });

    if (meal.servingUnit) {
      const unitText = `Saved as: ${meal.servingUnit.label}`;
      mealInfo.createEl('p', { text: unitText, cls: 'nutrition-tracker-meal-unit' });
    }

    const itemsText = meal.items.map((item: FoodItem) => `${item.quantity} ${item.food}`).join(', ');
    mealInfo.createEl('p', { text: itemsText, cls: 'nutrition-tracker-meal-items' });

    const servingsDiv = mealDiv.createDiv('nutrition-tracker-servings-input');
    new Setting(servingsDiv)
      .setName('Number of servings')
      .addText(text => {
        text
          .setPlaceholder('1')
          .setValue((servings.get(meal.id) || 1).toString())
          .onChange(value => {
            const num = parseFloat(value) || 1;
            onServingsChange(meal.id, num);
          });

        text.inputEl.setAttribute('type', 'number');
        text.inputEl.setAttribute('min', '0.1');
        text.inputEl.setAttribute('step', '0.5');
      });

    const currentServings = servings.get(meal.id) || 1;
    const scaledNutrition = calculateMealPortionNutrition(meal, currentServings);

    const nutritionText = `Total: ${scaledNutrition.calories} kcal | P: ${scaledNutrition.protein}g | C: ${scaledNutrition.carbs}g | F: ${scaledNutrition.fat}g`;
    mealInfo.createEl('p', { text: nutritionText, cls: 'nutrition-tracker-meal-nutrition' });

    const removeBtn = mealDiv.createEl('button', {
      text: '✕',
      cls: 'nutrition-tracker-remove-meal'
    });
    removeBtn.addEventListener('click', () => onRemoveMeal(index));
  });
}

export function createFoodDescriptionInput(
  contentEl: HTMLElement, 
  description: string, 
  onDescriptionChange: (value: string) => void,
  onSubmit: () => void
): HTMLTextAreaElement {
  let textareaEl: HTMLTextAreaElement;
  
  const foodDescSetting = new Setting(contentEl)
    .setName('Additional food description')
    .setDesc('Add extra items or details (optional - will be processed with AI)')
    .addTextArea(text => {
      text
        .setPlaceholder('Enter additional food description...')
        .setValue(description)
        .onChange(value => {
          onDescriptionChange(value);
        });
      
      text.inputEl.addClass('nutrition-tracker-food-input');
      textareaEl = text.inputEl;
      
      // Add Enter key handler (Ctrl/Cmd+Enter to submit, plain Enter for new line)
      text.inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          onSubmit();
        }
      });
    });
  
  foodDescSetting.settingEl.addClass('nutrition-tracker-food-setting');
  
  return textareaEl;
}

export function createServingUnitSelector(
  contentEl: HTMLElement,
  currentUnit: ServingUnitType,
  customUnitLabel: string,
  onUnitChange: (unit: ServingUnitType) => void,
  onCustomLabelChange: (label: string) => void
) {
  const setting = new Setting(contentEl)
    .setName('Serving unit')
    .setDesc('Choose how this meal will be portioned when used')
    .addDropdown(dropdown => {
      dropdown
        .addOption('100g', 'Per 100g (weight-based)')
        .addOption('piece', 'Per piece/item')
        .addOption('serving', 'Per serving')
        .addOption('custom', 'Custom unit')
        .setValue(currentUnit)
        .onChange(value => {
          onUnitChange(value as ServingUnitType);
        });
    });

  setting.settingEl.addClass('nutrition-tracker-serving-unit');

  if (currentUnit === 'custom') {
    const customSetting = new Setting(contentEl)
      .setName('Custom unit name')
      .setDesc('E.g., "bowl", "cup", "plate"')
      .addText(text => {
        text
          .setPlaceholder('Enter unit name...')
          .setValue(customUnitLabel)
          .onChange(value => {
            onCustomLabelChange(value);
          });
      });

    customSetting.settingEl.addClass('nutrition-tracker-custom-unit');
  }
}

export function createSaveAsMealToggle(
  contentEl: HTMLElement,
  saveAsMeal: boolean,
  mealName: string,
  onSaveAsMealChange: (value: boolean) => void,
  onMealNameChange: (value: string) => void
) {
  const saveAsMealSetting = new Setting(contentEl)
    .setName('Save as meal')
    .setDesc('Save this combination as a reusable meal template')
    .addToggle(toggle => {
      toggle
        .setValue(saveAsMeal)
        .onChange(value => {
          onSaveAsMealChange(value);
        });
    });

  saveAsMealSetting.settingEl.addClass('nutrition-tracker-save-meal-setting');

  if (saveAsMeal) {
    const mealNameSetting = new Setting(contentEl)
      .setName('Meal name')
      .setDesc('Enter a name for this meal template')
      .addText(text => {
        text
          .setPlaceholder('Enter meal name...')
          .setValue(mealName)
          .onChange(value => {
            onMealNameChange(value);
          });

        text.inputEl.addClass('nutrition-tracker-meal-name-input');
      });

    mealNameSetting.settingEl.addClass('nutrition-tracker-meal-name-setting');
  }
}

export function createProcessButton(
  contentEl: HTMLElement, 
  isProcessing: boolean, 
  initialData: FoodItem | null, 
  editingContext: 'meal' | 'foodlog',
  onProcess: () => void
): HTMLButtonElement {
  const processButtonSetting = new Setting(contentEl)
    .addButton(button => {
      let buttonText = 'Process food';
      if (initialData) {
        buttonText = editingContext === 'meal' ? 'Update meal item' : 'Update food';
      }
      
      button
        .setButtonText(isProcessing ? 'Processing...' : buttonText)
        .onClick(onProcess)
        .setDisabled(isProcessing);
    });
  
  processButtonSetting.settingEl.addClass('nutrition-tracker-process-button-setting');
  
  const processButton = processButtonSetting.settingEl.querySelector('button');
  
  // Add processing indicator
  const processingIndicator = contentEl.createDiv(`nutrition-tracker-processing-indicator${isProcessing ? ' visible' : ''}`);
  
  processingIndicator.createDiv('nutrition-tracker-processing-spinner');
  processingIndicator.createEl('p', { 
    text: 'Processing food data...', 
    cls: 'nutrition-tracker-processing-text' 
  });
  
  return processButton;
} 