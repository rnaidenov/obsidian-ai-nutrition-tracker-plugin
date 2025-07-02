import { App, Modal, Setting, Notice } from 'obsidian';
import { PluginSettings } from '../../types/settings';
import { LLMService } from '../../services/llm-service';
import { FileService } from '../../services/file-service';

export class FoodInputModal extends Modal {
  private description: string = '';
  private selectedImage: File | null = null;
  private isProcessing: boolean = false;
  private processButton: HTMLButtonElement | null = null;
  private processingIndicator: HTMLElement | null = null;

  constructor(
    app: App, 
    private settings: PluginSettings,
    private llmService: LLMService,
    private fileService: FileService
  ) {
    super(app);
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Add Food Entry' });

    // Food description input
    new Setting(contentEl)
      .setName('Food description')
      .setDesc('Describe what you ate (e.g., "2 eggs scrambled with butter, 1 slice of whole grain toast")')
      .addTextArea(text => {
        text
          .setPlaceholder('Enter food description...')
          .setValue(this.description)
          .onChange(value => {
            this.description = value;
            this.updateButtonState();
          });
        
        // Make the text area larger
        text.inputEl.style.minHeight = '100px';
        text.inputEl.style.width = '100%';
      });

    // Image upload
    new Setting(contentEl)
      .setName('Food image (optional)')
      .setDesc('Upload an image of your food for better accuracy')
      .addButton(button => {
        button
          .setButtonText('Choose Image')
          .onClick(() => this.selectImage())
          .setDisabled(this.isProcessing);
      });

    // Show selected image info
    if (this.selectedImage) {
      const imageInfo = contentEl.createDiv('nutrition-tracker-selected-image');
      imageInfo.createEl('p', { text: `Selected: ${this.selectedImage.name}` });
      
      // Add remove button
      const removeBtn = imageInfo.createEl('button', { 
        text: '✕ Remove',
        cls: 'nutrition-tracker-remove-image'
      });
      removeBtn.addEventListener('click', () => {
        this.selectedImage = null;
        this.onOpen();
      });
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
    
    this.processButton = buttonContainer.createEl('button', { 
      text: this.isProcessing ? 'Processing...' : 'Process Food',
      cls: 'mod-cta'
    });
    this.processButton.addEventListener('click', () => this.processFood());
    this.updateButtonState();
  }

  private updateButtonState() {
    if (this.processButton) {
      this.processButton.disabled = this.isProcessing || !this.description.trim();
      this.processButton.textContent = this.isProcessing ? 'Processing...' : 'Process Food';
    }
    
    if (this.processingIndicator) {
      this.processingIndicator.style.display = this.isProcessing ? 'block' : 'none';
    }
  }

  private selectImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          new Notice('Image file too large. Please select an image under 10MB.');
          return;
        }
        
        this.selectedImage = file;
        this.onOpen(); // Refresh the modal to show selected file
      }
    };
    
    input.click();
  }

  private async processFood() {
    if (!this.description.trim()) {
      new Notice('Please enter a food description');
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
      new Notice('Processing food with AI...');
      const foodItems = await this.llmService.processFood(this.description, this.selectedImage || undefined);
      
      if (foodItems.length === 0) {
        new Notice('No food items could be processed from the description');
        return;
      }

      // Save image if provided
      if (this.selectedImage) {
        try {
          const imagePath = await this.fileService.saveImage(this.selectedImage);
          new Notice(`Image saved to: ${imagePath}`);
        } catch (error) {
          console.error('Failed to save image:', error);
          new Notice('Warning: Failed to save image, but continuing with food processing');
        }
      }

      // Create or update food log
      await this.fileService.createOrUpdateFoodLog(foodItems);
      
      // Show success message with details
      const totalCalories = foodItems.reduce((sum, item) => sum + item.calories, 0);
      new Notice(`✅ Successfully processed ${foodItems.length} food item(s) with ${totalCalories} calories`);
      
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