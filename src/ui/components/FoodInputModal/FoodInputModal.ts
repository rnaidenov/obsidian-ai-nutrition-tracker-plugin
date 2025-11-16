import { App, Modal, Notice } from 'obsidian';
import { PluginSettings } from '../../../types/settings';
import { LLMService } from '../../../services/llm-service';
import { FileService } from '../../../services/file-service';
import {
  createModalTitle,
  createEditingNotice,
  createMealSelectionDropdown,
  createSelectedMealsDisplay,
  createFoodDescriptionInput,
  createSaveAsMealToggle,
  createProcessButton
} from './utils/modal-ui-helpers';
import { MealManager } from './utils/meal-management';
import { ImageManager } from './utils/image-management';
import { FoodProcessor } from './utils/food-processing';
import { ButtonStateManager } from './utils/button-state';

export class FoodInputModal extends Modal {
  private description: string = '';
  private saveAsMeal: boolean = false;
  private mealName: string = '';
  private isProcessing: boolean = false;
  private processButton: HTMLButtonElement | null = null;
  private processingIndicator: HTMLElement | null = null;
  private errorMessageEl: HTMLElement | null = null;
  private initialData: any = null;
  private editingContext: 'meal' | 'foodlog' = 'foodlog';
  private targetMealId: string | null = null;
  private onCloseCallback?: () => void;
  private foodDescriptionInput: HTMLTextAreaElement | null = null;

  private mealManager: MealManager;
  private imageManager: ImageManager;
  private foodProcessor: FoodProcessor;
  private buttonStateManager: ButtonStateManager;

  constructor(
    app: App, 
    private settings: PluginSettings,
    private llmService: LLMService,
    private fileService: FileService,
    onCloseCallback?: () => void
  ) {
    super(app);
    this.modalEl.addClass('nutrition-tracker-modal');
    this.onCloseCallback = onCloseCallback;
    
    // Initialize helper classes
    this.mealManager = new MealManager(fileService);
    this.imageManager = new ImageManager();
    this.foodProcessor = new FoodProcessor(this.app, settings, llmService, fileService);
    this.buttonStateManager = new ButtonStateManager(this.processButton, this.processingIndicator);
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
        this.handleMealRemove.bind(this)
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
    
    // Initialize button state manager with actual elements
    this.buttonStateManager = new ButtonStateManager(this.processButton, this.processingIndicator);
    
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

  private async handleProcessFood() {
    this.isProcessing = true;
    this.clearErrorMessage();
    this.updateButtonState();

    try {
      const result = await this.foodProcessor.processFood(
        this.mealManager.getSelectedMeals(),
        this.description,
        this.imageManager.getSelectedImages(),
        this.saveAsMeal,
        this.mealName,
        this.initialData,
        this.editingContext,
        this.targetMealId
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
    this.buttonStateManager.updateButtonState(
      this.description,
      this.imageManager.getSelectedImages(),
      this.mealManager.getSelectedMeals(),
      this.saveAsMeal,
      this.mealName,
      this.isProcessing,
      this.initialData,
      this.editingContext,
      this.targetMealId
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