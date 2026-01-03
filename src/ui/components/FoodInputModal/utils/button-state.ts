import { FoodItem, Meal } from '../../../../types/nutrition';

// Interfaces
export interface ButtonStateParams {
  description: string;
  selectedImages: File[];
  selectedMeals: Meal[];
  saveAsMeal: boolean;
  mealName: string;
  isProcessing: boolean;
  initialData?: FoodItem;
  editingContext?: 'meal' | 'foodlog';
  targetMealId?: string;
}

export interface ButtonState {
  isEnabled: boolean;
  text: string;
  showProcessingIndicator: boolean;
}

export interface ButtonElements {
  processButton: HTMLButtonElement | null;
  processingIndicator: HTMLElement | null;
}

// Pure function: Calculate button state based on modal state
export function calculateButtonState(params: ButtonStateParams): ButtonState {
  const {
    description,
    selectedImages,
    selectedMeals,
    saveAsMeal,
    mealName,
    isProcessing,
    initialData,
    editingContext,
    targetMealId
  } = params;

  const hasDescription = description.trim().length > 0;
  const hasImages = selectedImages.length > 0;
  const hasSelectedMeals = selectedMeals.length > 0;
  const hasMealName = saveAsMeal ? mealName.trim().length > 0 : true;

  let isEnabled = false;
  if (targetMealId) {
    // When adding to a specific meal, we just need description or images
    isEnabled = !isProcessing && (hasDescription || hasImages);
  } else {
    // Normal flow: need meals OR (description/images) AND (if save as meal, must have name)
    isEnabled = !isProcessing && (hasSelectedMeals || hasDescription || hasImages) && hasMealName;
  }


  let text = 'Process food';
  if (initialData) {
    text = editingContext === 'meal' ? 'Update meal item' : 'Update food';
  } else if (targetMealId) {
    text = 'Add to meal';
  }
  if (isProcessing) {
    text = 'Processing...';
  }

  return { isEnabled, text, showProcessingIndicator: isProcessing };
}

// Side effect function: Apply calculated state to DOM elements
export function applyButtonState(
  elements: ButtonElements,
  state: ButtonState
): void {
  if (elements.processButton) {
    elements.processButton.disabled = !state.isEnabled;
    elements.processButton.textContent = state.text;
  }

  if (elements.processingIndicator) {
    if (state.showProcessingIndicator) {
      elements.processingIndicator.classList.add('visible');
    } else {
      elements.processingIndicator.classList.remove('visible');
    }
  }
}
