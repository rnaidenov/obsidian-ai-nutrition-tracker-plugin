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
  }

  async onunload() {
    console.log('Unloading Nutrition Tracker Plugin');
  }

  private openFoodInputModal() {
    new FoodInputModal(
      this.app, 
      this.settings, 
      this.llmService, 
      this.fileService
    ).open();
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