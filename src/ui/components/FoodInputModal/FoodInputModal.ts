import { App, Modal, Notice, Vault } from 'obsidian';
import { PluginSettings } from '../../../types/settings';
import { FoodItem, ServingUnitType } from '../../../types/nutrition';
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
import { MealManager } from './utils/meal-management';
import { ImageManager } from './utils/image-management';
import { processFood } from './utils/food-processing';
import { calculateButtonState, applyButtonState } from './utils/button-state';

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

  private mealManager: MealManager;
  private imageManager: ImageManager;

  constructor(
    app: App,
    private vault: Vault,
    private settings: PluginSettings,
    onCloseCallback?: () => void
  ) {
    super(app);
    this.modalEl.addClass('nutrition-tracker-modal');
    this.onCloseCallback = onCloseCallback;

    // Initialize helper classes
    this.mealManager = new MealManager(vault, app, settings);
    this.imageManager = new ImageManager();
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
    await this.mealManager.loadMeals();

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
        this.mealManager.getAvailableMeals(), 
        this.handleMealSelect.bind(this)
      );
      
      createSelectedMealsDisplay(
        contentEl,
        this.mealManager.getSelectedMeals(),
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
    
    this.imageManager.createImageUploadButton(
      contentEl, 
      this.isProcessing, 
      this.handleImageSelection.bind(this)
    );
    
    this.imageManager.createImagePreview(contentEl, this.refresh.bind(this));
    
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
    await this.mealManager.addMeal(mealId);
    this.refresh();
  }

  private handleMealRemove(index: number) {
    this.mealManager.removeMeal(index);
    this.refresh();
  }

  private handleDescriptionChange(value: string) {
    this.description = value;
    this.updateButtonState();
  }

  private handleImageSelection() {
    this.imageManager.selectImages(this.refresh.bind(this));
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
    const meal = this.mealManager.getSelectedMeals().find(m => m.id === mealId);
    if (!meal) return;

    // Find the nutrition text element for this meal
    const selectedMealsContainer = this.contentEl.querySelector('.nutrition-tracker-selected-meals');
    if (!selectedMealsContainer) return;

    const mealDivs = selectedMealsContainer.querySelectorAll('.nutrition-tracker-selected-meal');
    const mealIndex = this.mealManager.getSelectedMeals().findIndex(m => m.id === mealId);

    if (mealIndex === -1 || mealIndex >= mealDivs.length) return;

    const mealDiv = mealDivs[mealIndex];
    const nutritionEl = mealDiv.querySelector('.nutrition-tracker-meal-nutrition');

    if (nutritionEl) {
      // Calculate scaled nutrition (same logic as in modal-ui-helpers.ts)
      const totalCalories = meal.items.reduce((sum, item) => sum + item.calories, 0);
      const totalProtein = meal.items.reduce((sum, item) => sum + item.protein, 0);
      const totalCarbs = meal.items.reduce((sum, item) => sum + item.carbs, 0);
      const totalFat = meal.items.reduce((sum, item) => sum + item.fat, 0);

      const scaledNutrition = {
        calories: Math.round(totalCalories * servings),
        protein: Math.round(totalProtein * servings),
        carbs: Math.round(totalCarbs * servings),
        fat: Math.round(totalFat * servings)
      };

      nutritionEl.textContent = `Total: ${scaledNutrition.calories} kcal | P: ${scaledNutrition.protein}g | C: ${scaledNutrition.carbs}g | F: ${scaledNutrition.fat}g`;
    }
  }

  private async handleProcessFood() {
    this.isProcessing = true;
    this.clearErrorMessage();
    this.updateButtonState();

    try {
      const result = await processFood(
        {
          vault: this.vault,
          app: this.app,
          settings: this.settings
        },
        {
          selectedMeals: this.mealManager.getSelectedMeals(),
          mealServings: this.mealServings,
          description: this.description,
          images: this.imageManager.getSelectedImages(),
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
    const state = calculateButtonState({
      description: this.description,
      selectedImages: this.imageManager.getSelectedImages(),
      selectedMeals: this.mealManager.getSelectedMeals(),
      saveAsMeal: this.saveAsMeal,
      mealName: this.mealName,
      isProcessing: this.isProcessing,
      initialData: this.initialData,
      editingContext: this.editingContext,
      targetMealId: this.targetMealId
    });

    applyButtonState(
      {
        processButton: this.processButton,
        processingIndicator: this.processingIndicator
      },
      state
    );
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