import { Setting } from 'obsidian';
import { Meal, FoodItem } from '../../../../types/nutrition';

export function createModalTitle(contentEl: HTMLElement, initialData: any, editingContext: 'meal' | 'foodlog', targetMealId?: string) {
  let title = 'Add food entry';
  if (initialData) {
    title = editingContext === 'meal' ? 'Edit meal item' : 'Edit food entry';
  } else if (targetMealId) {
    title = '➕ Add items to meal';
  }
  contentEl.createEl('h2', { text: title });
}

export function createEditingNotice(contentEl: HTMLElement, initialData: any, editingContext: 'meal' | 'foodlog', targetMealId?: string) {
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
  
  const notice = contentEl.createEl('p', { 
    text: noticeText,
    cls: 'nutrition-tracker-edit-notice'
  });
}

export function createMealSelectionDropdown(
  contentEl: HTMLElement, 
  availableMeals: Meal[], 
  onMealSelect: (mealId: string) => Promise<void>
) {
  if (availableMeals.length === 0) return;
  
  const mealSelectionSetting = new Setting(contentEl)
    .setName('Add saved meals')
    .setDesc('Select from your saved meals to add to this entry')
    .addDropdown(dropdown => {
      dropdown.addOption('', 'Select a meal...');
      availableMeals.forEach(meal => {
        dropdown.addOption(meal.id, `${meal.name} (${meal.items.length} items)`);
      });
      dropdown.onChange(async (value) => {
        if (value) {
          await onMealSelect(value);
          dropdown.setValue(''); // Reset dropdown
        }
      });
    });
  mealSelectionSetting.settingEl.addClass('nutrition-tracker-meal-selection');
}

export function createSelectedMealsDisplay(
  contentEl: HTMLElement, 
  selectedMeals: Meal[], 
  onRemoveMeal: (index: number) => void
) {
  if (selectedMeals.length === 0) return;
  
  const selectedMealsContainer = contentEl.createDiv('nutrition-tracker-selected-meals');
  selectedMealsContainer.createEl('h3', { text: 'Selected meals' });
  
  selectedMeals.forEach((meal, index) => {
    const mealDiv = selectedMealsContainer.createDiv('nutrition-tracker-selected-meal');
    const mealInfo = mealDiv.createDiv('nutrition-tracker-meal-info');
    
    mealInfo.createEl('strong', { text: meal.name });
    const itemsText = meal.items.map((item: FoodItem) => `${item.quantity} ${item.food}`).join(', ');
    mealInfo.createEl('p', { text: itemsText, cls: 'nutrition-tracker-meal-items' });
    
    const totalCalories = meal.items.reduce((sum: number, item: FoodItem) => sum + item.calories, 0);
    mealInfo.createEl('p', { text: `Total: ${totalCalories} kcal`, cls: 'nutrition-tracker-meal-calories' });
    
    // Remove button
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
  onDescriptionChange: (value: string) => void
) {
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
    });
  
  foodDescSetting.settingEl.addClass('nutrition-tracker-food-setting');
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
  initialData: any, 
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
  
  const processButton = processButtonSetting.settingEl.querySelector('button') as HTMLButtonElement;
  
  // Add processing indicator
  const processingIndicator = contentEl.createDiv(`nutrition-tracker-processing-indicator${isProcessing ? ' visible' : ''}`);
  
  processingIndicator.createDiv('nutrition-tracker-processing-spinner');
  processingIndicator.createEl('p', { 
    text: 'Processing food data...', 
    cls: 'nutrition-tracker-processing-text' 
  });
  
  return processButton;
} 