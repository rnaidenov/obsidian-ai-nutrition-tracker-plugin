import { App, Modal, Setting, Notice } from 'obsidian';
import { PluginSettings } from '../../types/settings';
import { LLMService } from '../../services/llm-service';
import { FileService } from '../../services/file-service';

export class FoodInputModal extends Modal {
  private description: string = '';
  private selectedImages: File[] = [];
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

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

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

    // Food description input
    const foodDescSetting = new Setting(contentEl)
      .setName('Food description')
      .setDesc('Describe what you ate, and / or supplement your images with additional details')
      .addTextArea(text => {
        text
          .setPlaceholder('Enter food description...')
          .setValue(this.description)
          .onChange(value => {
            this.description = value;
            this.updateButtonState();
          });
        
        // Add class for CSS targeting
        text.inputEl.addClass('nutrition-tracker-food-input');
      });
    
    // Add class to the setting container
    foodDescSetting.settingEl.addClass('nutrition-tracker-food-setting');

    // Image upload
    const imageUploadSetting = new Setting(contentEl)
      .setName('Food images')
      .setDesc('Upload images of your food for AI analysis')
      .addButton(button => {
        button
          .setButtonText('Add Images')
          .onClick(() => this.selectImages())
          .setDisabled(this.isProcessing);
      });
    
    // Add class to keep this setting horizontal
    imageUploadSetting.settingEl.addClass('nutrition-tracker-image-setting');

    // Show selected images preview
    if (this.selectedImages.length > 0) {
      const imagesContainer = contentEl.createDiv('nutrition-tracker-images-container');
      
      this.selectedImages.forEach((image, index) => {
        const imagePreview = imagesContainer.createDiv('nutrition-tracker-image-preview');
        
        // Create image element
        const img = imagePreview.createEl('img', { 
          cls: 'nutrition-tracker-preview-image' 
        });
        
        // Create image data URL for preview
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(image);
        
        // Image info and controls
        const imageInfo = imagePreview.createDiv('nutrition-tracker-image-info');
        const imageDetails = imageInfo.createDiv('nutrition-tracker-image-details');
        imageDetails.createEl('p', { text: `📷 ${image.name}` });
        imageDetails.createEl('p', { 
          text: `${(image.size / 1024 / 1024).toFixed(1)} MB`,
          cls: 'nutrition-tracker-image-size'
        });
        
        // Add remove button for individual image
        const removeBtn = imageInfo.createEl('button', { 
          text: '✕',
          cls: 'nutrition-tracker-remove-image'
        });
        removeBtn.addEventListener('click', () => {
          this.selectedImages.splice(index, 1);
          this.onOpen();
        });
      });

      // Add clear all button if multiple images
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

    // Processing status indicator (always create but hide when not processing)
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
      // Enable button if either description has content OR images are selected
      const hasDescription = this.description.trim().length > 0;
      const hasImages = this.selectedImages.length > 0;
      
      this.processButton.disabled = this.isProcessing || (!hasDescription && !hasImages);
      const buttonText = this.initialData ? 'Update Food' : 'Process Food';
      this.processButton.textContent = this.isProcessing ? 'Processing...' : buttonText;
    }
    
    if (this.processingIndicator) {
      this.processingIndicator.style.display = this.isProcessing ? 'block' : 'none';
    }
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
    // Check if either description or images are provided
    if (!this.description.trim() && this.selectedImages.length === 0) {
      new Notice('Please enter a food description or upload images');
      return;
    }

    // Check if API key is configured
    if (!this.settings.openRouterApiKey) {
      new Notice('OpenRouter API key not configured. Please check plugin settings.');
      return;
    }

    this.isProcessing = true;
    this.updateButtonState();

    try {
      // Process the food with AI
      const processingMessage = this.selectedImages.length > 0 && !this.description.trim() 
        ? `Processing ${this.selectedImages.length} food image(s) with AI...` 
        : 'Processing food with AI...';
      new Notice(processingMessage);
      
      const foodItems = await this.llmService.processFood(this.description, this.selectedImages.length > 0 ? this.selectedImages : undefined);
      
      if (foodItems.length === 0) {
        new Notice('No food items could be processed from the input');
        return;
      }

      // Save images if provided
      if (this.selectedImages.length > 0) {
        try {
          const imagePaths = await Promise.all(
            this.selectedImages.map(image => this.fileService.saveImage(image))
          );
          new Notice(`${imagePaths.length} image(s) saved successfully`);
        } catch (error) {
          console.error('Failed to save images:', error);
          new Notice('Warning: Failed to save some images, but continuing with food processing');
        }
      }

      // Create or update food log
      if (this.initialData) {
        // Replace the original entry
        await this.fileService.createOrUpdateFoodLog(foodItems, this.initialData);
      } else {
        // Create new entry
        await this.fileService.createOrUpdateFoodLog(foodItems);
      }
      
      // Show success message with details
      const totalCalories = foodItems.reduce((sum, item) => sum + item.calories, 0);
      if (this.initialData) {
        new Notice(`✅ Successfully replaced "${this.initialData.food}" with ${foodItems.length} item(s) (${totalCalories} kcal)`);
      } else {
        new Notice(`✅ Successfully processed ${foodItems.length} food item(s) with ${totalCalories} calories`);
      }
      
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