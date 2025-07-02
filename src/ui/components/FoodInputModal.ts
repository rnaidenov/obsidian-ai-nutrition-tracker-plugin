import { App, Modal, Setting, Notice } from 'obsidian';
import NutritionTrackerPlugin from '../../../main';

export class FoodInputModal extends Modal {
  plugin: NutritionTrackerPlugin;
  foodDescription: string = '';
  imageFile: File | null = null;

  constructor(app: App, plugin: NutritionTrackerPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: "What's cookin'?" });

    // Text input for food description
    new Setting(contentEl)
      .setName('Food Description')
      .setDesc('Describe what you ate (e.g., "grilled chicken breast with quinoa and vegetables")')
      .addTextArea(text => {
        text.setPlaceholder('Enter your food description here...')
          .setValue(this.foodDescription)
          .onChange(value => {
            this.foodDescription = value;
          });
        text.inputEl.rows = 4;
        text.inputEl.style.width = '100%';
      });

    // Image upload
    new Setting(contentEl)
      .setName('Food Image (optional)')
      .setDesc('Upload a photo of your meal for better AI analysis')
      .addButton(button => {
        button.setButtonText('Choose Image')
          .onClick(() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) {
                this.imageFile = file;
                button.setButtonText(`Selected: ${file.name}`);
              }
            };
            input.click();
          });
      });

    // Action buttons
    const buttonContainer = contentEl.createDiv();
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.marginTop = '20px';

    // Cancel button
    new Setting(buttonContainer)
      .addButton(button => {
        button.setButtonText('Cancel')
          .onClick(() => {
            this.close();
          });
      });

    // Submit button
    new Setting(buttonContainer)
      .addButton(button => {
        button.setButtonText('Process Food')
          .setCta()
          .onClick(async () => {
            if (!this.foodDescription.trim()) {
              new Notice('Please enter a food description');
              return;
            }
            
            try {
              new Notice('Processing food entry...');
              await this.processFoodEntry();
              new Notice('Food entry processed successfully!');
              this.close();
            } catch (error) {
              new Notice(`Error processing food: ${error.message}`);
              console.error('Food processing error:', error);
            }
          });
      });
  }

  async processFoodEntry() {
    // This will be implemented once we have the LLM service
    console.log('Processing food:', this.foodDescription);
    console.log('Image file:', this.imageFile);
    
    // For now, just show a placeholder
    new Notice('Food processing functionality will be implemented next!');
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
} 