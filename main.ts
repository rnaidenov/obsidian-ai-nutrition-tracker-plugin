import { Plugin, TFile, Notice } from 'obsidian';
import { FoodInputModal } from './src/ui/components/FoodInputModal';
import { SettingsTab } from './src/ui/settings/SettingsTab';
import { PluginSettings, DEFAULT_SETTINGS } from './src/types/settings';
import { LLMService } from './src/services/llm-service';
import { FileService } from './src/services/file-service';

export default class NutritionTrackerPlugin extends Plugin {
  settings: PluginSettings;
  llmService: LLMService;
  fileService: FileService;
  private editButtonHandler: (event: Event) => void;

  async onload() {
    console.log('Loading Nutrition Tracker Plugin');
    
    await this.loadSettings();
    
    // Initialize services
    this.llmService = new LLMService(this.settings);
    this.fileService = new FileService(this.app.vault, this.settings);
    
    // Add ribbon icon
    this.addRibbonIcon('apple', 'Log Food', () => {
      this.openFoodInputModal();
    });

    // Add command palette command
    this.addCommand({
      id: 'open-food-log-modal',
      name: 'Log Food Entry',
      callback: () => {
        this.openFoodInputModal();
      }
    });

    // Add command for quick access to today's food log
    this.addCommand({
      id: 'open-todays-food-log',
      name: 'Open Today\'s Food Log',
      callback: () => {
        this.openTodaysFoodLog();
      }
    });

    // Add settings tab
    this.addSettingTab(new SettingsTab(this.app, this));

    // Check if API key is configured
    if (!this.settings.openRouterApiKey) {
      new Notice('Nutrition Tracker: Please configure your OpenRouter API key in settings');
    }

    // Set up event delegation for edit buttons
    this.setupEditButtonEventHandling();
  }

  async onunload() {
    console.log('Unloading Nutrition Tracker Plugin');
    
    // Clean up event listener
    if (this.editButtonHandler) {
      document.removeEventListener('click', this.editButtonHandler);
    }
  }

  private openFoodInputModal() {
    new FoodInputModal(
      this.app, 
      this.settings, 
      this.llmService, 
      this.fileService
    ).open();
  }

  private editFoodEntry(food: string, quantity: string, calories: number, protein: number, carbs: number, fat: number) {
    const modal = new FoodInputModal(
      this.app, 
      this.settings, 
      this.llmService, 
      this.fileService
    );
    
    // Pre-fill the modal with existing data
    modal.setInitialData({
      food,
      quantity,
      calories,
      protein,
      carbs,
      fat
    });
    
    modal.open();
  }

  private setupEditButtonEventHandling() {
    // Use event delegation to handle clicks on edit buttons
    this.editButtonHandler = (event: Event) => {
      const target = event.target as HTMLElement;
      
      if (target && target.classList.contains('nutrition-edit-btn')) {
        event.preventDefault();
        
        // Extract data from button attributes
        const food = target.getAttribute('data-food') || '';
        const quantity = target.getAttribute('data-quantity') || '';
        const calories = parseFloat(target.getAttribute('data-calories') || '0');
        const protein = parseFloat(target.getAttribute('data-protein') || '0');
        const carbs = parseFloat(target.getAttribute('data-carbs') || '0');
        const fat = parseFloat(target.getAttribute('data-fat') || '0');
        
        console.log('Edit button clicked via event delegation:', { food, quantity, calories, protein, carbs, fat });
        new Notice(`Editing: ${food} (${quantity})`);
        
        this.editFoodEntry(food, quantity, calories, protein, carbs, fat);
      }
    };
    
    document.addEventListener('click', this.editButtonHandler);
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    
    // Update services with new settings if they exist
    if (this.llmService) {
      this.llmService = new LLMService(this.settings);
    }
    if (this.fileService) {
      this.fileService = new FileService(this.app.vault, this.settings);
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
    
    // Update services with new settings
    this.llmService = new LLMService(this.settings);
    this.fileService = new FileService(this.app.vault, this.settings);
  }

  private async openTodaysFoodLog() {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const logPath = `${this.settings.logStoragePath}/${today}.md`;
    
    try {
      const file = this.app.vault.getAbstractFileByPath(logPath);
      if (file instanceof TFile) {
        // Open existing file
        await this.app.workspace.getLeaf().openFile(file);
      } else {
        // Create new file if it doesn't exist
        new Notice(`No food log found for today. Use "Log Food Entry" to create one.`);
      }
    } catch (error) {
      new Notice(`Error opening today's food log: ${error.message}`);
    }
  }
} 