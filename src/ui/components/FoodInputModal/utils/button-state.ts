import { Meal } from '../../../../types/nutrition';

export class ButtonStateManager {
  constructor(
    private processButton: HTMLButtonElement | null,
    private processingIndicator: HTMLElement | null
  ) {}

  updateButtonState(
    description: string,
    selectedImages: File[],
    selectedMeals: Meal[],
    saveAsMeal: boolean,
    mealName: string,
    isProcessing: boolean,
    initialData?: any,
    editingContext?: 'meal' | 'foodlog',
    targetMealId?: string
  ): void {
    if (this.processButton) {
      const hasDescription = description.trim().length > 0;
      const hasImages = selectedImages.length > 0;
      const hasSelectedMeals = selectedMeals.length > 0;
      const hasMealName = saveAsMeal ? mealName.trim().length > 0 : true;
      
      let enableButton = false;
      
      if (targetMealId) {
        // When adding to a specific meal, we just need description or images
        enableButton = !isProcessing && (hasDescription || hasImages);
      } else {
        // Normal flow: need meals OR (description/images) AND (if save as meal, must have name)
        enableButton = !isProcessing && (hasSelectedMeals || hasDescription || hasImages) && hasMealName;
      }
      
      this.processButton.disabled = !enableButton;
      
      let buttonText = 'Process Food';
      if (initialData) {
        buttonText = editingContext === 'meal' ? 'Update Meal Item' : 'Update Food';
      } else if (targetMealId) {
        buttonText = 'Add to Meal';
      }
      this.processButton.textContent = isProcessing ? 'Processing...' : buttonText;
    }
    
    if (this.processingIndicator) {
      if (isProcessing) {
        this.processingIndicator.classList.add('visible');
      } else {
        this.processingIndicator.classList.remove('visible');
      }
    }
  }
} 