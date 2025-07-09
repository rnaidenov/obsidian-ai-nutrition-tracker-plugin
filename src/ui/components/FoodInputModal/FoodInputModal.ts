import { App, Modal } from 'obsidian';
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
  private initialData: any = null;
  private editingContext: 'meal' | 'foodlog' = 'foodlog';
  private targetMealId: string | null = null;
  private onCloseCallback?: () => void;

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
    this.foodProcessor = new FoodProcessor(settings, llmService, fileService);
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
    console.log('🎯 setTargetMealId called with:', mealId);
    this.targetMealId = mealId;
    this.editingContext = 'meal';
    console.log('🎯 targetMealId set to:', this.targetMealId, 'editingContext:', this.editingContext);
  }

  async onOpen() {
    console.log('🚀 FoodInputModal.onOpen() called');
    console.log('🎯 Current state:', {
      targetMealId: this.targetMealId,
      editingContext: this.editingContext,
      initialData: this.initialData,
      hasTargetMealId: !!this.targetMealId
    });
    
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
      console.log('🔽 Showing meal selection dropdown (no targetMealId)');
      createMealSelectionDropdown(
        contentEl, 
        this.mealManager.getAvailableMeals(), 
        this.handleMealSelect.bind(this)
      );
      
      createSelectedMealsDisplay(
        contentEl, 
        this.mealManager.getSelectedMeals(), 
        this.handleMealRemove.bind(this)
      );
    } else {
      console.log('🚫 Hiding meal selection dropdown (targetMealId:', this.targetMealId, ')');
    }
    
    createFoodDescriptionInput(
      contentEl, 
      this.description, 
      this.handleDescriptionChange.bind(this)
    );
    
    this.imageManager.createImageUploadButton(
      contentEl, 
      this.isProcessing, 
      this.handleImageSelection.bind(this)
    );
    
    this.imageManager.createImagePreview(contentEl, this.refresh.bind(this));
    
    // Only show save as meal toggle if we're NOT adding to a specific meal
    if (!this.targetMealId) {
      console.log('🔽 Showing save as meal toggle (no targetMealId)');
      createSaveAsMealToggle(
        contentEl, 
        this.saveAsMeal, 
        this.mealName,
        this.handleSaveAsMealChange.bind(this),
        this.handleMealNameChange.bind(this)
      );
    } else {
      console.log('🚫 Hiding save as meal toggle (targetMealId:', this.targetMealId, ')');
    }
    
    // Create process button and get references
    this.processButton = createProcessButton(
      contentEl, 
      this.isProcessing, 
      this.initialData, 
      this.editingContext,
      this.handleProcessFood.bind(this)
    );
    
    this.processingIndicator = contentEl.querySelector('.nutrition-tracker-processing-indicator') as HTMLElement;
    
    // Initialize button state manager with actual elements
    this.buttonStateManager = new ButtonStateManager(this.processButton, this.processingIndicator);
    
    // Update button state
    this.updateButtonState();
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
    console.log('🍽️ handleProcessFood called');
    console.log('🎯 Processing with state:', {
      targetMealId: this.targetMealId,
      selectedMeals: this.mealManager.getSelectedMeals().length,
      description: this.description,
      editingContext: this.editingContext,
      hasInitialData: !!this.initialData
    });
    
    this.isProcessing = true;
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

      console.log('🔄 Food processing result:', result);

      if (result.success) {
        console.log('✅ Processing successful, closing modal');
        this.close();
        return; // Exit early on success
      } else {
        console.log('❌ Processing failed:', result.message);
        // Don't close modal on failure so user can retry
      }
    } catch (error) {
      console.error('💥 Error during food processing:', error);
      // Don't close modal on error so user can retry
    }

    this.isProcessing = false;
    this.updateButtonState();
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

  private refresh() {
    this.onOpen();
  }

  onClose() {
    this.contentEl.empty();
    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
  }
} 