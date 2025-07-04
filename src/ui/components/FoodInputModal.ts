import { App, Modal, Setting, Notice } from 'obsidian';
import { PluginSettings } from '../../types/settings';
import { LLMService } from '../../services/llm-service';
import { FileService } from '../../services/file-service';
import { Meal, FoodItem } from '../../types/nutrition';

export class FoodInputModal extends Modal {
  private description: string = '';
  private selectedImages: File[] = [];
  private selectedMeals: Meal[] = [];
  private availableMeals: Meal[] = [];
  private saveAsMeal: boolean = false;
  private mealName: string = '';
  private isProcessing: boolean = false;
  private processButton: HTMLButtonElement | null = null;
  private processingIndicator: HTMLElement | null = null;
  private initialData: any = null;

  constructor(
    app: App, 
    private settings: PluginSettings,
    private llmService: LLMService,
    private fileService: FileService
  ) {
    super(app);
    this.modalEl.addClass('nutrition-tracker-modal');
  }

  setInitialData(data: { food: string, quantity: string, calories: number, protein: number, carbs: number, fat: number }) {
    this.initialData = data;
    this.description = `${data.quantity} ${data.food}`;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    // Load available meals
    await this.loadMeals();

    const title = this.initialData ? 'Edit Food Entry' : 'Add Food Entry';
    contentEl.createEl('h2', { text: title });

    // Add editing notice
    if (this.initialData) {
      const isDarkTheme = document.body.classList.contains('theme-dark');
      const notice = contentEl.createEl('p', { 
        text: `✏️ Editing: ${this.initialData.quantity} ${this.initialData.food} (${this.initialData.calories} kcal). Modify description as needed - this will edit the existing entry.`,
        cls: 'nutrition-tracker-edit-notice'
      });
      
      if (isDarkTheme) {
        notice.style.cssText = 'background: linear-gradient(135deg, #1e3a8a, #3730a3); padding: 12px; border-radius: 8px; border-left: 3px solid #60a5fa; margin-bottom: 16px; font-size: 11px; color: #dbeafe; border: 1px solid rgba(96, 165, 250, 0.2);';
      } else {
        notice.style.cssText = 'background: linear-gradient(135deg, #dbeafe, #e0f2fe); padding: 12px; border-radius: 8px; border-left: 3px solid #3b82f6; margin-bottom: 16px; font-size: 11px; color: #1e40af; border: 1px solid rgba(59, 130, 246, 0.2);';
      }
    }

    // Meal selection dropdown
    if (this.availableMeals.length > 0) {
      const mealSelectionSetting = new Setting(contentEl)
        .setName('Add saved meals')
        .setDesc('Select from your saved meals to add to this entry')
        .addDropdown(dropdown => {
          dropdown.addOption('', 'Select a meal...');
          this.availableMeals.forEach(meal => {
            dropdown.addOption(meal.id, `${meal.name} (${meal.items.length} items)`);
          });
          dropdown.onChange(async (value) => {
            if (value) {
              await this.addMeal(value);
              dropdown.setValue(''); // Reset dropdown
            }
          });
        });
      mealSelectionSetting.settingEl.addClass('nutrition-tracker-meal-selection');
    }

    // Show selected meals
    if (this.selectedMeals.length > 0) {
      const selectedMealsContainer = contentEl.createDiv('nutrition-tracker-selected-meals');
      selectedMealsContainer.createEl('h3', { text: 'Selected Meals' });
      
      this.selectedMeals.forEach((meal, index) => {
        const mealDiv = selectedMealsContainer.createDiv('nutrition-tracker-selected-meal');
        const mealInfo = mealDiv.createDiv('nutrition-tracker-meal-info');
        
        mealInfo.createEl('strong', { text: meal.name });
        const itemsText = meal.items.map(item => `${item.quantity} ${item.food}`).join(', ');
        mealInfo.createEl('p', { text: itemsText, cls: 'nutrition-tracker-meal-items' });
        
        const totalCalories = meal.items.reduce((sum, item) => sum + item.calories, 0);
        mealInfo.createEl('p', { text: `Total: ${totalCalories} kcal`, cls: 'nutrition-tracker-meal-calories' });
        
        // Remove button
        const removeBtn = mealDiv.createEl('button', { 
          text: '✕',
          cls: 'nutrition-tracker-remove-meal'
        });
        removeBtn.addEventListener('click', () => this.removeMeal(index));
      });
    }

    // Food description input
    const foodDescSetting = new Setting(contentEl)
      .setName('Additional food description')
      .setDesc('Add extra items or details (optional - will be processed with AI)')
      .addTextArea(text => {
        text
          .setPlaceholder('Enter additional food description...')
          .setValue(this.description)
          .onChange(value => {
            this.description = value;
            this.updateButtonState();
          });
        
        text.inputEl.addClass('nutrition-tracker-food-input');
      });
    
    foodDescSetting.settingEl.addClass('nutrition-tracker-food-setting');

    // Image upload
    const imageUploadSetting = new Setting(contentEl)
      .setName('Additional food images')
      .setDesc('Upload additional images for AI analysis (optional)')
      .addButton(button => {
        button
          .setButtonText('Add Images')
          .onClick(() => this.selectImages())
          .setDisabled(this.isProcessing);
      });
    
    imageUploadSetting.settingEl.addClass('nutrition-tracker-image-setting');

    // Show selected images preview
    if (this.selectedImages.length > 0) {
      const imagesContainer = contentEl.createDiv('nutrition-tracker-images-container');
      
      this.selectedImages.forEach((image, index) => {
        const imagePreview = imagesContainer.createDiv('nutrition-tracker-image-preview');
        
        const img = imagePreview.createEl('img', { 
          cls: 'nutrition-tracker-preview-image' 
        });
        
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(image);
        
        const imageInfo = imagePreview.createDiv('nutrition-tracker-image-info');
        const imageDetails = imageInfo.createDiv('nutrition-tracker-image-details');
        imageDetails.createEl('p', { text: `📷 ${image.name}` });
        imageDetails.createEl('p', { 
          text: `${(image.size / 1024 / 1024).toFixed(1)} MB`,
          cls: 'nutrition-tracker-image-size'
        });
        
        const removeBtn = imageInfo.createEl('button', { 
          text: '✕',
          cls: 'nutrition-tracker-remove-image'
        });
        removeBtn.addEventListener('click', () => {
          this.selectedImages.splice(index, 1);
          this.onOpen();
        });
      });

      if (this.selectedImages.length > 1) {
        const clearAllBtn = imagesContainer.createEl('button', {
          text: `Clear All Images (${this.selectedImages.length})`,
          cls: 'nutrition-tracker-clear-all-images'
        });
        clearAllBtn.addEventListener('click', () => {
          this.selectedImages = [];
          this.onOpen();
        });
      }
    }

    // Save as meal section
    const saveAsMealSetting = new Setting(contentEl)
      .setName('Save as meal')
      .setDesc('Save this combination as a reusable meal')
      .addToggle(toggle => {
        toggle
          .setValue(this.saveAsMeal)
          .onChange(value => {
            this.saveAsMeal = value;
            this.onOpen(); // Refresh to show/hide meal name input
          });
      });

    // Add CSS class for better styling
    saveAsMealSetting.settingEl.addClass('nutrition-tracker-save-meal-toggle');

    if (this.saveAsMeal) {
      const mealNameSetting = new Setting(contentEl)
        .setName('Meal name')
        .setDesc('Enter a name for this meal')
        .addText(text => {
          text
            .setPlaceholder('Enter meal name...')
            .setValue(this.mealName)
            .onChange(value => {
              this.mealName = value;
              this.updateButtonState();
            });
          
          // Add CSS class for styling
          text.inputEl.addClass('nutrition-tracker-meal-name-input');
        });
      
      mealNameSetting.settingEl.addClass('nutrition-tracker-meal-name-setting');
    }

    // Processing status indicator
    this.processingIndicator = contentEl.createEl('p', { 
      text: '🔄 Processing food with AI...',
      cls: 'nutrition-tracker-processing'
    });
    this.processingIndicator.style.display = this.isProcessing ? 'block' : 'none';

    // Action buttons
    const buttonContainer = contentEl.createDiv('nutrition-tracker-button-container');
    
    const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
    cancelButton.addEventListener('click', () => this.close());
    cancelButton.disabled = this.isProcessing;
    
    const buttonText = this.initialData ? 'Update Food' : 'Process Food';
    this.processButton = buttonContainer.createEl('button', { 
      text: this.isProcessing ? 'Processing...' : buttonText,
      cls: 'mod-cta'
    });
    this.processButton.addEventListener('click', () => this.processFood());
    this.updateButtonState();
  }

  private updateButtonState() {
    if (this.processButton) {
      const hasDescription = this.description.trim().length > 0;
      const hasImages = this.selectedImages.length > 0;
      const hasSelectedMeals = this.selectedMeals.length > 0;
      const hasMealName = this.saveAsMeal ? this.mealName.trim().length > 0 : true;
      
      // Enable button if we have meals OR (description/images) AND (if save as meal, must have name)
      this.processButton.disabled = this.isProcessing || (!hasSelectedMeals && !hasDescription && !hasImages) || !hasMealName;
      
      const buttonText = this.initialData ? 'Update Food' : 'Process Food';
      this.processButton.textContent = this.isProcessing ? 'Processing...' : buttonText;
    }
    
    if (this.processingIndicator) {
      this.processingIndicator.style.display = this.isProcessing ? 'block' : 'none';
    }
  }

  private async loadMeals() {
    try {
      this.availableMeals = await this.fileService.getMeals();
    } catch (error) {
      console.error('Error loading meals:', error);
      this.availableMeals = [];
    }
  }

  private async addMeal(mealId: string) {
    const meal = this.availableMeals.find(m => m.id === mealId);
    if (meal && !this.selectedMeals.find(m => m.id === mealId)) {
      this.selectedMeals.push(meal);
      await this.onOpen(); // Refresh UI
    }
  }

  private async removeMeal(index: number) {
    this.selectedMeals.splice(index, 1);
    await this.onOpen(); // Refresh UI
  }

  private selectImages() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length > 0) {
        // Validate file sizes (max 10MB each)
        const validFiles = files.filter(file => {
          if (file.size > 10 * 1024 * 1024) {
            new Notice(`${file.name} is too large. Please select images under 10MB.`);
            return false;
          }
          return true;
        });
        
        if (validFiles.length > 0) {
          this.selectedImages.push(...validFiles);
          this.onOpen(); // Refresh the modal to show selected files
        }
      }
    };
    
    input.click();
  }

  private async processFood() {
    // Check if we have meals or additional input
    const hasSelectedMeals = this.selectedMeals.length > 0;
    const hasAdditionalInput = this.description.trim().length > 0 || this.selectedImages.length > 0;
    
    if (!hasSelectedMeals && !hasAdditionalInput) {
      new Notice('Please select meals or add additional food description/images');
      return;
    }

    // Check if save as meal is enabled but no name provided
    if (this.saveAsMeal && !this.mealName.trim()) {
      new Notice('Please enter a meal name');
      return;
    }

    // Check if API key is configured for LLM processing
    if (hasAdditionalInput && !this.settings.openRouterApiKey) {
      new Notice('OpenRouter API key not configured. Please check plugin settings.');
      return;
    }

    this.isProcessing = true;
    this.updateButtonState();

    try {
      let allFoodItems: FoodItem[] = [];
      
      // Add items from selected meals
      this.selectedMeals.forEach(meal => {
        meal.items.forEach(item => {
          allFoodItems.push({
            ...item,
            mealId: meal.id,
            timestamp: new Date().toISOString()
          });
        });
      });

      // Process additional input with AI if provided
      if (hasAdditionalInput) {
        const processingMessage = this.selectedImages.length > 0 && !this.description.trim() 
          ? `Processing ${this.selectedImages.length} additional food image(s) with AI...` 
          : 'Processing additional food with AI...';
        new Notice(processingMessage);
        
        const additionalFoodItems = await this.llmService.processFood(this.description, this.selectedImages.length > 0 ? this.selectedImages : undefined);
        allFoodItems.push(...additionalFoodItems);
      }

      if (allFoodItems.length === 0) {
        new Notice('No food items could be processed');
        return;
      }

      // Save images if provided
      let savedImagePaths: string[] = [];
      if (this.selectedImages.length > 0) {
        try {
          savedImagePaths = await Promise.all(
            this.selectedImages.map(image => this.fileService.saveImage(image))
          );
          new Notice(`${savedImagePaths.length} image(s) saved successfully`);
        } catch (error) {
          console.error('Failed to save images:', error);
          new Notice('Warning: Failed to save some images, but continuing with food processing');
        }
      }

      // Save as meal if requested
      if (this.saveAsMeal) {
        try {
          await this.fileService.saveMeal(
            this.mealName,
            allFoodItems,
            this.description || undefined,
            savedImagePaths.length > 0 ? savedImagePaths : undefined
          );
        } catch (error) {
          console.error('Failed to save meal:', error);
          new Notice('Warning: Failed to save meal, but continuing with food processing');
        }
      }

      // Create or update food log
      if (this.initialData) {
        await this.fileService.createOrUpdateFoodLog(allFoodItems, this.initialData);
      } else {
        await this.fileService.createOrUpdateFoodLog(allFoodItems);
      }
      
      // Show success message
      const totalCalories = allFoodItems.reduce((sum, item) => sum + item.calories, 0);
      const mealCount = this.selectedMeals.length;
      const additionalCount = allFoodItems.length - this.selectedMeals.reduce((sum, meal) => sum + meal.items.length, 0);
      
      let message = `✅ Successfully processed ${allFoodItems.length} food item(s) (${totalCalories} kcal)`;
      if (mealCount > 0) {
        message += ` - ${mealCount} meal(s)`;
      }
      if (additionalCount > 0) {
        message += ` + ${additionalCount} additional item(s)`;
      }
      
      new Notice(message);
      this.close();
    } catch (error) {
      console.error('Error processing food:', error);
      
      if (error.message.includes('API key')) {
        new Notice('API Error: Please check your OpenRouter API key in settings');
      } else if (error.message.includes('quota') || error.message.includes('credits')) {
        new Notice('API Error: Insufficient credits or quota exceeded');
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        new Notice('Network Error: Please check your internet connection');
      } else {
        new Notice(`Error processing food: ${error.message}`);
      }
    } finally {
      this.isProcessing = false;
      this.updateButtonState();
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
} 