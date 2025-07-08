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

  private mealManager: MealManager;
  private imageManager: ImageManager;
  private foodProcessor: FoodProcessor;
  private buttonStateManager: ButtonStateManager;

  constructor(
    app: App, 
    private settings: PluginSettings,
    private llmService: LLMService,
    private fileService: FileService
  ) {
    super(app);
    this.modalEl.addClass('nutrition-tracker-modal');
    
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

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    // Load meals
    await this.mealManager.loadMeals();

    // Create UI components
    createModalTitle(contentEl, this.initialData, this.editingContext);
    createEditingNotice(contentEl, this.initialData, this.editingContext);
    
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
    
    createSaveAsMealToggle(
      contentEl, 
      this.saveAsMeal, 
      this.mealName,
      this.handleSaveAsMealChange.bind(this),
      this.handleMealNameChange.bind(this)
    );
    
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
    this.isProcessing = true;
    this.updateButtonState();

    const result = await this.foodProcessor.processFood(
      this.mealManager.getSelectedMeals(),
      this.description,
      this.imageManager.getSelectedImages(),
      this.saveAsMeal,
      this.mealName,
      this.initialData,
      this.editingContext
    );

    if (result.success) {
      this.close();
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
      this.editingContext
    );
  }

  private refresh() {
    this.onOpen();
  }

  onClose() {
    this.contentEl.empty();
  }
} 