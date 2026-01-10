import { App, Modal, Notice, Vault } from 'obsidian';
import { PluginSettings } from '../../../types/settings';
import { FoodItem, Meal, ServingUnitType } from '../../../types/nutrition';
import { PluginContext } from '../../../types/plugin-context';
import {
  createModalTitle,
  createEditingNotice,
  createMealSelectionDropdown,
  createSelectedMealsDisplay,
  createFoodDescriptionInput,
  createSaveAsMealToggle,
  createServingUnitSelector,
  createProcessButton
} from './utils/modal-ui-helpers';
import * as MealOps from '../../../utils/meal/manager';
import { calculateTotalNutrition, scaleNutrition } from '../../../utils/meal/meal-operations';
import * as ImageManagement from './utils/image-management';
import { processFood } from './utils/food-processing';

export class FoodInputModal extends Modal {
  private description: string = '';
  private saveAsMeal: boolean = false;
  private mealName: string = '';
  private isProcessing: boolean = false;
  private processButton: HTMLButtonElement | null = null;
  private processingIndicator: HTMLElement | null = null;
  private errorMessageEl: HTMLElement | null = null;
  private initialData: FoodItem | null = null;
  private editingContext: 'meal' | 'foodlog' = 'foodlog';
  private targetMealId: string | null = null;
  private onCloseCallback?: () => void;
  private foodDescriptionInput: HTMLTextAreaElement | null = null;

  private selectedServingUnit: ServingUnitType = '100g';
  private customServingLabel: string = '';
  private mealServings: Map<string, number> = new Map();

  private availableMeals: Meal[] = [];
  private selectedMeals: Meal[] = [];
  private selectedImages: File[] = [];

  private get ctx(): PluginContext {
    return { vault: this.vault, app: this.app, settings: this.settings };
  }

  constructor(
    app: App,
    private vault: Vault,
    private settings: PluginSettings,
    onCloseCallback?: () => void
  ) {
    super(app);
    this.modalEl.addClass('nutrition-tracker-modal');
    this.onCloseCallback = onCloseCallback;
  }

  setInitialData(data: { food: string, quantity: string, calories: number, protein: number, carbs: number, fat: number }) {
    this.initialData = data;
    this.description = `${data.quantity} ${data.food}`;
  }

  setEditingContext(context: 'meal' | 'foodlog') {
    this.editingContext = context;
  }

  setTargetMealId(mealId: string) {
    this.targetMealId = mealId;
    this.editingContext = 'meal';
  }

  onOpen(): void {
    this.initializeAsync().catch(error => {
      console.error('Error initializing modal:', error);
      new Notice(`Error initializing modal: ${error.message}`);
    });
  }

  private async initializeAsync(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();

    // Load meals
    this.availableMeals = await MealOps.getMeals(this.ctx);

    // Note: We deliberately DON'T pre-select the target meal when targetMealId is set
    // because that would cause duplication - we only want to add NEW items to the meal

    // Create UI components
    createModalTitle(contentEl, this.initialData, this.editingContext, this.targetMealId);
    createEditingNotice(contentEl, this.initialData, this.editingContext, this.targetMealId);

    // Only show meal selection dropdown if we're NOT adding to a specific meal
    if (!this.targetMealId) {
      createMealSelectionDropdown(
        this.app,
        contentEl,
        this.availableMeals,
        this.handleMealSelect.bind(this)
      );

      createSelectedMealsDisplay(
        contentEl,
        this.selectedMeals,
        this.mealServings,
        this.handleMealRemove.bind(this),
        this.handleMealServingsChange.bind(this)
      );
    }

    this.foodDescriptionInput = createFoodDescriptionInput(
      contentEl,
      this.description,
      this.handleDescriptionChange.bind(this),
      this.handleProcessFood.bind(this)
    );

    ImageManagement.createImageUploadButton(
      contentEl,
      this.isProcessing,
      this.handleImageSelection.bind(this)
    );

    ImageManagement.createImagePreview(
      contentEl,
      this.selectedImages,
      this.handleImageRemove.bind(this),
      this.handleImagesClear.bind(this)
    );
    
    // Only show save as meal toggle if we're NOT adding to a specific meal
    if (!this.targetMealId) {
      createSaveAsMealToggle(
        contentEl,
        this.saveAsMeal,
        this.mealName,
        this.handleSaveAsMealChange.bind(this),
        this.handleMealNameChange.bind(this)
      );

      if (this.saveAsMeal) {
        createServingUnitSelector(
          contentEl,
          this.selectedServingUnit,
          this.customServingLabel,
          this.handleServingUnitChange.bind(this),
          this.handleCustomLabelChange.bind(this)
        );
      }
    }
    
    // Create error message display
    this.errorMessageEl = contentEl.createDiv('nutrition-tracker-error-message');
    
    // Create process button and get references
    this.processButton = createProcessButton(
      contentEl, 
      this.isProcessing, 
      this.initialData, 
      this.editingContext,
      this.handleProcessFood.bind(this)
    );
    
    this.processingIndicator = contentEl.querySelector('.nutrition-tracker-processing-indicator');

    // Update button state
    this.updateButtonState();
    
    // Focus the food description input
    if (this.foodDescriptionInput) {
      // Use setTimeout to ensure the modal is fully rendered
      setTimeout(() => {
        this.foodDescriptionInput?.focus();
      }, 0);
    }
  }

  private async handleMealSelect(mealId: string) {
    const meal = await MealOps.getMealById(this.ctx, mealId);
    if (meal && !this.selectedMeals.find(m => m.id === meal.id)) {
      this.selectedMeals = [...this.selectedMeals, meal];
      this.refresh();
    }
  }

  private handleMealRemove(index: number) {
    if (index >= 0 && index < this.selectedMeals.length) {
      this.selectedMeals = this.selectedMeals.filter((_, i) => i !== index);
      this.refresh();
    }
  }

  private handleDescriptionChange(value: string) {
    this.description = value;
    this.updateButtonState();
  }

  private handleImageSelection() {
    ImageManagement.selectImages((files: File[]) => {
      this.selectedImages = ImageManagement.addImages(this.selectedImages, files);
      this.refresh();
    });
  }

  private handleImageRemove(index: number) {
    this.selectedImages = ImageManagement.removeImage(this.selectedImages, index);
    this.refresh();
  }

  private handleImagesClear() {
    this.selectedImages = [];
    this.refresh();
  }

  private handleSaveAsMealChange(value: boolean) {
    this.saveAsMeal = value;
    this.refresh();
  }

  private handleMealNameChange(value: string) {
    this.mealName = value;
    this.updateButtonState();
  }

  private handleServingUnitChange(unit: ServingUnitType) {
    this.selectedServingUnit = unit;
    this.refresh();
  }

  private handleCustomLabelChange(label: string) {
    this.customServingLabel = label;
  }

  private handleMealServingsChange(mealId: string, servings: number) {
    this.mealServings.set(mealId, servings);
    // Update nutrition display without full refresh to prevent input defocus
    this.updateMealNutritionDisplay(mealId, servings);
  }

  private updateMealNutritionDisplay(mealId: string, servings: number) {
    const meal = this.selectedMeals.find(m => m.id === mealId);
    if (!meal) return;

    // Find the nutrition text element for this meal
    const selectedMealsContainer = this.contentEl.querySelector('.nutrition-tracker-selected-meals');
    if (!selectedMealsContainer) return;

    const mealDivs = selectedMealsContainer.querySelectorAll('.nutrition-tracker-selected-meal');
    const mealIndex = this.selectedMeals.findIndex(m => m.id === mealId);

    if (mealIndex === -1 || mealIndex >= mealDivs.length) return;

    const mealDiv = mealDivs[mealIndex];
    const nutritionEl = mealDiv.querySelector('.nutrition-tracker-meal-nutrition');

    if (nutritionEl) {
      const totalNutrition = calculateTotalNutrition(meal.items);
      const scaled = scaleNutrition(totalNutrition, servings);

      nutritionEl.textContent = `Total: ${scaled.calories} kcal | P: ${scaled.protein}g | C: ${scaled.carbs}g | F: ${scaled.fat}g`;
    }
  }

  private async handleProcessFood() {
    this.isProcessing = true;
    this.clearErrorMessage();
    this.updateButtonState();

    try {
      const result = await processFood(
        this.ctx,
        {
          selectedMeals: this.selectedMeals,
          mealServings: this.mealServings,
          description: this.description,
          images: this.selectedImages,
          saveAsMeal: this.saveAsMeal,
          mealName: this.mealName,
          servingUnitType: this.selectedServingUnit,
          customServingLabel: this.customServingLabel,
          initialData: this.initialData,
          editingContext: this.editingContext,
          targetMealId: this.targetMealId
        }
      );

      if (result.success) {
        this.close();
        return;
      } else if (result.message) {
        this.showErrorMessage(result.message);
      }
    } catch (error) {
      console.error('Error during food processing:', error);
      this.showErrorMessage(error.message || 'An unexpected error occurred');
    }

    this.isProcessing = false;
    this.updateButtonState();
  }

  private showErrorMessage(message: string) {
    if (this.errorMessageEl) {
      this.errorMessageEl.textContent = message;
      this.errorMessageEl.addClass('visible');
    }
  }

  private clearErrorMessage() {
    if (this.errorMessageEl) {
      this.errorMessageEl.textContent = '';
      this.errorMessageEl.removeClass('visible');
    }
  }

  private updateButtonState() {
    const hasDescription = this.description.trim().length > 0;
    const hasImages = this.selectedImages.length > 0;
    const hasSelectedMeals = this.selectedMeals.length > 0;
    const hasMealName = this.saveAsMeal ? this.mealName.trim().length > 0 : true;

    let isEnabled = false;
    if (this.targetMealId) {
      isEnabled = !this.isProcessing && (hasDescription || hasImages);
    } else {
      isEnabled = !this.isProcessing && (hasSelectedMeals || hasDescription || hasImages) && hasMealName;
    }

    let text = 'Process food';
    if (this.initialData) {
      text = this.editingContext === 'meal' ? 'Update meal item' : 'Update food';
    } else if (this.targetMealId) {
      text = 'Add to meal';
    }
    if (this.isProcessing) {
      text = 'Processing...';
    }

    if (this.processButton) {
      this.processButton.disabled = !isEnabled;
      this.processButton.textContent = text;
    }

    if (this.processingIndicator) {
      if (this.isProcessing) {
        this.processingIndicator.classList.add('visible');
      } else {
        this.processingIndicator.classList.remove('visible');
      }
    }
  }

  private refresh(): void {
    this.initializeAsync().catch(error => {
      console.error('Error refreshing modal:', error);
      new Notice(`Error refreshing modal: ${error.message}`);
    });
  }

  onClose() {
    this.contentEl.empty();
    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
  }
} 