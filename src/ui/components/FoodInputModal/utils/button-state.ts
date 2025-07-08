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
    editingContext?: 'meal' | 'foodlog'
  ): void {
    if (this.processButton) {
      const hasDescription = description.trim().length > 0;
      const hasImages = selectedImages.length > 0;
      const hasSelectedMeals = selectedMeals.length > 0;
      const hasMealName = saveAsMeal ? mealName.trim().length > 0 : true;
      
      // Enable button if we have meals OR (description/images) AND (if save as meal, must have name)
      this.processButton.disabled = isProcessing || (!hasSelectedMeals && !hasDescription && !hasImages) || !hasMealName;
      
      let buttonText = 'Process Food';
      if (initialData) {
        buttonText = editingContext === 'meal' ? 'Update Meal Item' : 'Update Food';
      }
      this.processButton.textContent = isProcessing ? 'Processing...' : buttonText;
    }
    
    if (this.processingIndicator) {
      this.processingIndicator.style.display = isProcessing ? 'block' : 'none';
    }
  }
} 