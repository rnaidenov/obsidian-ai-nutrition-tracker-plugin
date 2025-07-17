import { Plugin, TFile, Notice, TFolder, TAbstractFile } from 'obsidian';
import { FoodInputModal } from './src/ui/components/FoodInputModal/FoodInputModal';
import { SettingsTab } from './src/ui/settings/SettingsTab';
import { PluginSettings, DEFAULT_SETTINGS } from './src/types/settings';
import { LLMService } from './src/services/llm-service';
import { FileService } from './src/services/file-service';

export default class NutritionTrackerPlugin extends Plugin {
  settings: PluginSettings;
  llmService: LLMService;
  fileService: FileService;
  private editButtonHandler: (event: Event) => void;
  private deleteButtonHandler: (event: Event) => void;
  private ctaButtonHandler: (event: Event) => void;
  private mealSyncTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private isDeleteInProgress: boolean = false;
  private currentModal: FoodInputModal | null = null; 

  async onload() {
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
    
    // Set up file modification listener for meal notes
    this.setupMealNoteSyncHandler();

    // Set up file rename listener
    this.registerEvent(
      this.app.vault.on('rename', async (file, oldPath) => {
        if (file instanceof TFile) {
          await this.fileService.handleFileRename(oldPath, file.path);
        }
      })
    );
  }

  async onunload() {
    this.mealSyncTimeouts.forEach(timeout => clearTimeout(timeout));
    this.mealSyncTimeouts.clear();
    
    this.isDeleteInProgress = false;
    
    if (this.currentModal) {
      this.currentModal.close();
      this.currentModal = null;
    }
  }

  private ensureModalClosed() {
    if (this.currentModal) {
      this.currentModal.close();
      this.currentModal = null;
    }
    
    const existingModalContainers = document.querySelectorAll('.modal-container.mod-dim');
    const existingModalContent = document.querySelectorAll('.nutrition-tracker-modal');
    
    let removedCount = 0;
    existingModalContainers.forEach(modal => {
      if (modal.querySelector('.nutrition-tracker-modal')) {
        modal.remove();
        removedCount++;
      }
    });
    
    existingModalContent.forEach(modal => {
      const container = modal.closest('.modal-container');
      if (container) {
        container.remove();
        removedCount++;
      } else {
        modal.remove();
        removedCount++;
      }
    });
  }

  private createAndOpenModal(setupFn?: (modal: FoodInputModal) => void) {
    this.ensureModalClosed();
    
    this.currentModal = new FoodInputModal(
      this.app, 
      this.settings, 
      this.llmService, 
      this.fileService,
      () => {
        this.currentModal = null;
      }
    );
    
    if (setupFn) {
      setupFn(this.currentModal);
    }

    this.currentModal.open();
  }

  private openFoodInputModal() {
    this.createAndOpenModal();
  }

  private openFoodInputModalForMeal(mealId: string) {
    this.createAndOpenModal(modal => {
      modal.setTargetMealId(mealId);
    });
  }

  private editFoodEntry(food: string, quantity: string, calories: number, protein: number, carbs: number, fat: number, context?: 'meal' | 'foodlog') {
    this.createAndOpenModal(modal => {
      modal.setInitialData({
        food,
        quantity,
        calories,
        protein,
        carbs,
        fat
      });
      
      modal.setEditingContext(context || 'foodlog');
    });
  }

  private async deleteFoodEntry(food: string, quantity: string, calories: number, protein: number, carbs: number, fat: number, context: 'meal' | 'foodlog', entryId: string) {
    const entryToDelete = {
      food,
      quantity,
      calories,
      protein,
      carbs,
      fat
    };
    
    try {
      if (context === 'meal') {
        await this.fileService.deleteMealItem(entryToDelete);
        new Notice(`🍽️ Deleted from meal: ${food} (${quantity})`);
      } else {
        await this.fileService.deleteFoodLogItem(entryToDelete);
        new Notice(`📝 Deleted from food log: ${food} (${quantity})`);
      }
      
      // Remove the card from the UI immediately
      const cardElement = document.getElementById(entryId);
      if (cardElement) {
        cardElement.remove();
      }
      
    } catch (error) {
      console.error('Error deleting food entry:', error);
      new Notice(`❌ Failed to delete ${food}: ${error.message}`);
    }
  }

  private setupEditButtonEventHandling() {
    // Use event delegation to handle clicks on edit buttons
    this.editButtonHandler = (event: Event) => {
      const target = event.target as HTMLElement;
      
      if (target && target.classList.contains('nutrition-edit-btn')) {
        event.preventDefault();
        event.stopPropagation();
        
        // Extract data from button attributes
        const food = target.getAttribute('data-food') || '';
        const quantity = target.getAttribute('data-quantity') || '';
        const calories = parseFloat(target.getAttribute('data-calories') || '0');
        const protein = parseFloat(target.getAttribute('data-protein') || '0');
        const carbs = parseFloat(target.getAttribute('data-carbs') || '0');
        const fat = parseFloat(target.getAttribute('data-fat') || '0');
        const context = target.getAttribute('data-edit-context') as 'meal' | 'foodlog' || 'foodlog';
        
        if (context === 'meal') {
          new Notice(`🍽️ Opening meal item editor: ${food} (${quantity})`);
        } else {
          new Notice(`📝 Opening food log editor: ${food} (${quantity})`);
        }
        
        this.editFoodEntry(food, quantity, calories, protein, carbs, fat, context);
      }
    };
    
    this.deleteButtonHandler = (event: Event) => {
      const target = event.target as HTMLElement;
      
      if (target && target.classList.contains('nutrition-delete-btn')) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        if (this.isDeleteInProgress) {
          return;
        }
        
        if (target.hasAttribute('data-processing') || (target as HTMLButtonElement).disabled) {
          return;
        }
        
        this.isDeleteInProgress = true;
        target.setAttribute('data-processing', 'true');
        target.style.opacity = '0.5';
        target.style.pointerEvents = 'none';
        
        
        try {
          const food = target.getAttribute('data-food') || '';
          const quantity = target.getAttribute('data-quantity') || '';
          const calories = parseFloat(target.getAttribute('data-calories') || '0');
          const protein = parseFloat(target.getAttribute('data-protein') || '0');
          const carbs = parseFloat(target.getAttribute('data-carbs') || '0');
          const fat = parseFloat(target.getAttribute('data-fat') || '0');
          const context = target.getAttribute('data-edit-context') as 'meal' | 'foodlog' || 'foodlog';
          const entryId = target.getAttribute('data-entry-id') || '';
          
          const confirmDelete = confirm(`Are you sure you want to delete "${food} (${quantity})"?`);
          
          if (confirmDelete) {
            this.deleteFoodEntry(food, quantity, calories, protein, carbs, fat, context, entryId);
          }
          
        } catch (error) {
          console.error('💥 Error in delete handler:', error);
        } finally {
          setTimeout(() => {
            this.isDeleteInProgress = false;
            target.removeAttribute('data-processing');
            target.style.opacity = '';
            target.style.pointerEvents = '';
          }, 100); 
        }
      }
    };

    this.ctaButtonHandler = (event: Event) => {
      const target = event.target as HTMLElement;
      
      if (target && target.classList.contains('nutrition-add-cta-btn')) {
        event.preventDefault();
        event.stopPropagation();
        
        const context = target.getAttribute('data-context') as 'meal' | 'foodlog';
        const mealId = target.getAttribute('data-meal-id');

        if (context !== 'meal') {
          this.openFoodInputModal();
          return;
        }

        if (!mealId) {
          new Notice('❌ Error: Meal ID not found. Please try again or report this issue.');
          return;
        }

        this.openFoodInputModalForMeal(mealId);
      }
    };
    
    this.registerDomEvent(document, 'click', this.editButtonHandler);
    this.registerDomEvent(document, 'click', this.deleteButtonHandler);
    this.registerDomEvent(document, 'click', this.ctaButtonHandler);
  }

  private setupMealNoteSyncHandler() {
    this.registerEvent(
      this.app.vault.on('modify', async (file) => {
        const isMealNote = this.fileService.isMealNote(file);
        
        if (isMealNote && file instanceof TFile) {
          const filePath = file.path;
          
          if (this.mealSyncTimeouts.has(filePath)) {
            clearTimeout(this.mealSyncTimeouts.get(filePath)!);
          }
          
          const timeout = setTimeout(async () => {
            await this.fileService.syncMealNoteToJSON(file);
            this.mealSyncTimeouts.delete(filePath);
          }, 1000);
          
          this.mealSyncTimeouts.set(filePath, timeout);
        }
      })
    );
  }

  async loadSettings() {
    const loadedData = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
    
    if (!this.settings.mealStoragePath) {
      this.settings.mealStoragePath = 'tracker/health/food/meals';
      await this.saveSettings();
    }
    
    if (this.llmService) {
      this.llmService = new LLMService(this.settings);
    }

    if (this.fileService) {
      this.fileService = new FileService(this.app.vault, this.settings);
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
    
    this.llmService = new LLMService(this.settings);
    this.fileService = new FileService(this.app.vault, this.settings);
  }

  private async openTodaysFoodLog() {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const logPath = `${this.settings.logStoragePath}/${today}.md`;
    
    try {
      const file = this.app.vault.getAbstractFileByPath(logPath);
      if (file instanceof TFile) {
        await this.app.workspace.getLeaf().openFile(file);
      } else {
        new Notice(`No food log found for today. Use "Log Food Entry" to create one.`);
      }
    } catch (error) {
      new Notice(`Error opening today's food log: ${error.message}`);
    }
  }
}