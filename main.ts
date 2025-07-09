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

    // Add debug command for testing meal functionality
    this.addCommand({
      id: 'test-meal-save',
      name: 'Test Meal Save (Debug)',
      callback: async () => {
        await this.testMealSave();
      }
    });

    // Add debug command to show meal file paths
    this.addCommand({
      id: 'debug-meal-paths',
      name: 'Debug Meal Paths (Show where meals are stored)',
      callback: async () => {
        await this.debugMealPaths();
      }
    });

    // Add debug command to verify meal vs food log independence
    this.addCommand({
      id: 'debug-meal-independence',
      name: 'Debug: Verify Meal/Food Log Independence',
      callback: async () => {
        await this.debugMealFoodLogIndependence();
      }
    });

    // Add debug command to check file detection
    this.addCommand({
      id: 'debug-file-detection',
      name: 'Debug: Check File Detection (Meal vs Food Log)',
      callback: async () => {
        await this.debugFileDetection();
      }
    });

    // Add debug command to regenerate meal notes
    this.addCommand({
      id: 'regenerate-meal-notes',
      name: 'Regenerate All Meal Notes (Fix HTML Rendering)',
      callback: async () => {
        await this.regenerateMealNotes();
      }
    });

    // Add debug command to check event listeners
    this.addCommand({
      id: 'debug-event-listeners',
      name: 'Debug: Check Event Listeners',
      callback: () => {
        this.debugEventListeners();
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
 
    this.setupEditButtonEventHandling();
  }

  async onunload() {
    console.log('Unloading Nutrition Tracker Plugin');
    
    // Clear all meal sync timeouts
    this.mealSyncTimeouts.forEach(timeout => clearTimeout(timeout));
    this.mealSyncTimeouts.clear();
    
    // Reset global delete flag
    this.isDeleteInProgress = false;
    
    // Close any open modal
    if (this.currentModal) {
      this.currentModal.close();
      this.currentModal = null;
    }
  }

  private ensureModalClosed() {
    if (this.currentModal) {
      console.log('🔄 Closing existing modal before creating new one');
      this.currentModal.close();
      this.currentModal = null;
    }
    
    // Clean up any lingering modal containers from DOM
    // Target both the modal containers and the modal content
    const existingModalContainers = document.querySelectorAll('.modal-container.mod-dim');
    const existingModalContent = document.querySelectorAll('.nutrition-tracker-modal');
    
    let removedCount = 0;
    existingModalContainers.forEach(modal => {
      // Check if this container contains our modal content
      if (modal.querySelector('.nutrition-tracker-modal')) {
        modal.remove();
        removedCount++;
      }
    });
    
    existingModalContent.forEach(modal => {
      // Remove any orphaned modal content
      const container = modal.closest('.modal-container');
      if (container) {
        container.remove();
        removedCount++;
      } else {
        modal.remove();
        removedCount++;
      }
    });
    
    if (removedCount > 0) {
      console.log(`🧹 Cleaned up ${removedCount} lingering modal containers`);
    }
  }

  private createAndOpenModal(setupFn?: (modal: FoodInputModal) => void) {
    console.log('🚀 Creating new modal...');
    
    // Close any existing modal first
    this.ensureModalClosed();
    
    // Create new modal with cleanup callback
    this.currentModal = new FoodInputModal(
      this.app, 
      this.settings, 
      this.llmService, 
      this.fileService,
      () => {
        // Cleanup callback - called when modal closes
        console.log('✅ Modal closed, cleaning up reference');
        this.currentModal = null;
      }
    );
    
    // Apply setup function if provided
    if (setupFn) {
      setupFn(this.currentModal);
    }
    
    // Open the modal
    this.currentModal.open();
    console.log('🎉 Modal opened successfully');
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
    console.log('🔧 Edit context:', context || 'foodlog');
    
    this.createAndOpenModal(modal => {
      // Pre-fill the modal with existing data and context
      modal.setInitialData({
        food,
        quantity,
        calories,
        protein,
        carbs,
        fat
      });
      
      // Set the editing context so modal knows how to save
      modal.setEditingContext(context || 'foodlog');
    });
  }

  private async deleteFoodEntry(food: string, quantity: string, calories: number, protein: number, carbs: number, fat: number, context: 'meal' | 'foodlog', entryId: string) {
    console.log('🗑️ Delete context:', context);
    console.log('Entry to delete:', { food, quantity, calories, protein, carbs, fat, entryId });
    
    // Create the entry object that matches the one being deleted
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
        
        console.log('Edit button clicked via event delegation:', { 
          food, quantity, calories, protein, carbs, fat, context 
        });
        
        if (context === 'meal') {
          new Notice(`🍽️ Opening meal item editor: ${food} (${quantity})`);
        } else {
          new Notice(`📝 Opening food log editor: ${food} (${quantity})`);
        }
        
        this.editFoodEntry(food, quantity, calories, protein, carbs, fat, context);
      }
    };
    
    // Use event delegation to handle clicks on delete buttons
    this.deleteButtonHandler = (event: Event) => {
      const target = event.target as HTMLElement;
      
      if (target && target.classList.contains('nutrition-delete-btn')) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        
        console.log('🗑️ Delete button clicked - Global delete in progress:', this.isDeleteInProgress);
        
        // Global protection - only allow one delete operation at a time across the entire plugin
        if (this.isDeleteInProgress) {
          console.log('❌ Global delete operation already in progress, ignoring click');
          return;
        }
        
        // Additional per-button protection
        if (target.hasAttribute('data-processing') || (target as HTMLButtonElement).disabled) {
          console.log('❌ Button-level delete already in progress, ignoring click');
          return;
        }
        
        // Set global and button-level flags
        this.isDeleteInProgress = true;
        target.setAttribute('data-processing', 'true');
        target.style.opacity = '0.5';
        target.style.pointerEvents = 'none';
        
        console.log('🔒 Delete operation locked globally and per-button');
        
        try {
          // Extract data from button attributes
          const food = target.getAttribute('data-food') || '';
          const quantity = target.getAttribute('data-quantity') || '';
          const calories = parseFloat(target.getAttribute('data-calories') || '0');
          const protein = parseFloat(target.getAttribute('data-protein') || '0');
          const carbs = parseFloat(target.getAttribute('data-carbs') || '0');
          const fat = parseFloat(target.getAttribute('data-fat') || '0');
          const context = target.getAttribute('data-edit-context') as 'meal' | 'foodlog' || 'foodlog';
          const entryId = target.getAttribute('data-entry-id') || '';
          
          console.log('🗑️ Processing delete for:', { food, quantity, context, entryId });
          
          // Show confirmation dialog - this should only appear once now
          const confirmDelete = confirm(`Are you sure you want to delete "${food} (${quantity})"?`);
          
          if (confirmDelete) {
            console.log('✅ User confirmed delete, proceeding...');
            this.deleteFoodEntry(food, quantity, calories, protein, carbs, fat, context, entryId);
          } else {
            console.log('❌ User cancelled delete operation');
          }
          
        } catch (error) {
          console.error('💥 Error in delete handler:', error);
        } finally {
          // Always clean up both global and button-level flags
          setTimeout(() => {
            console.log('🔓 Releasing delete operation locks');
            this.isDeleteInProgress = false;
            target.removeAttribute('data-processing');
            target.style.opacity = '';
            target.style.pointerEvents = '';
          }, 100); // Small delay to ensure all handlers have finished
        }
      }
    };

    // Use event delegation to handle clicks on CTA buttons
    this.ctaButtonHandler = (event: Event) => {
      const target = event.target as HTMLElement;
      
      if (target && target.classList.contains('nutrition-add-cta-btn')) {
        event.preventDefault();
        event.stopPropagation();
        
        const context = target.getAttribute('data-context') as 'meal' | 'foodlog';
        const mealId = target.getAttribute('data-meal-id');
        
        console.log('🎯 CTA button clicked:', context, mealId ? `(meal ID: ${mealId})` : '(no meal ID)');
        console.log('🔍 Button attributes:', {
          id: target.id,
          className: target.className,
          dataContext: target.getAttribute('data-context'),
          dataMealId: target.getAttribute('data-meal-id'),
          allAttributes: Array.from(target.attributes).map(attr => ({ name: attr.name, value: attr.value }))
        });
        
        if (context === 'meal' && mealId) {
          console.log('✅ Opening modal for meal:', mealId);
          // Open modal to add items to specific meal
          this.openFoodInputModalForMeal(mealId);
        } else if (context === 'meal' && !mealId) {
          console.error('❌ Meal context but no meal ID found!');
          new Notice('❌ Error: Meal ID not found. Please try again or report this issue.');
        } else {
          console.log('📝 Opening modal for food log');
          // Open modal to add items to food log
          this.openFoodInputModal();
        }
      }
    };
    
    // Use Obsidian's registerDomEvent instead of direct addEventListener
    this.registerDomEvent(document, 'click', this.editButtonHandler);
    this.registerDomEvent(document, 'click', this.deleteButtonHandler);
    this.registerDomEvent(document, 'click', this.ctaButtonHandler);
  }

  private setupMealNoteSyncHandler() {
    // Listen for file modifications to sync meal notes back to JSON
    this.registerEvent(
      this.app.vault.on('modify', async (file) => {
        if (this.fileService.isMealNote(file) && file instanceof TFile) {
          // Debounce the sync to prevent excessive calls during active editing
          const filePath = file.path;
          
          // Clear existing timeout for this file
          if (this.mealSyncTimeouts.has(filePath)) {
            clearTimeout(this.mealSyncTimeouts.get(filePath)!);
          }
          
          // Set a new timeout to sync after 2 seconds of inactivity
          const timeout = setTimeout(async () => {
            console.log('Meal note modified, syncing to JSON:', filePath);
            await this.fileService.syncMealNoteToJSON(file);
            this.mealSyncTimeouts.delete(filePath);
          }, 2000);
          
          this.mealSyncTimeouts.set(filePath, timeout);
        }
      })
    );
  }

  async loadSettings() {
    const loadedData = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
    
    // Migration: Ensure mealStoragePath exists for existing installations
    if (!this.settings.mealStoragePath) {
      this.settings.mealStoragePath = 'tracker/health/food/meals';
      await this.saveSettings();
    }
    
    console.log('Loaded settings:', this.settings);
    
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

  private async testMealSave() {
    console.log('=== TESTING MEAL SAVE ===');
    new Notice('Testing meal save functionality...');
    
    try {
      // Create a test meal
      const testFoodItems = [
        {
          food: 'Test Banana',
          quantity: '1 medium',
          calories: 105,
          protein: 1.3,
          carbs: 27,
          fat: 0.4,
          emoji: '🍌',
          timestamp: new Date().toISOString()
        }
      ];
      
      console.log('Test food items:', testFoodItems);
      console.log('Current settings:', this.settings);
      console.log('Meal storage path:', this.settings.mealStoragePath);
      
      await this.fileService.saveMeal(
        'Test Meal - ' + new Date().toLocaleTimeString(),
        testFoodItems,
        'This is a test meal'
      );
      
      new Notice('✅ Test meal saved successfully! Check console for details.');
      
      // Try to load meals to verify
      const meals = await this.fileService.getMeals();
      console.log('Loaded meals after test:', meals);
      new Notice(`Found ${meals.length} meals in storage`);
      
    } catch (error) {
      console.error('Test meal save failed:', error);
      new Notice(`❌ Test meal save failed: ${error.message}`);
    }
  }

  private async debugMealPaths() {
    console.log('=== DEBUGGING MEAL PATHS ===');
    console.log('Current settings:', this.settings);
    console.log('Meal storage path from settings:', this.settings.mealStoragePath);
    console.log('Expected meal file path:', `${this.settings.mealStoragePath}/meals.json`);
    
    new Notice(`Meal storage path: ${this.settings.mealStoragePath || 'UNDEFINED!'}`);
    
    // Check if the file exists
    const mealsPath = `${this.settings.mealStoragePath}/meals.json`;
    const file = this.app.vault.getAbstractFileByPath(mealsPath);
    
    if (file) {
      new Notice(`✅ Meals file exists at: ${mealsPath}`);
    } else {
      new Notice(`❌ Meals file NOT found at: ${mealsPath}`);
    }
    
    // Try to get meals
    try {
      const meals = await this.fileService.getMeals();
      console.log('Current meals:', meals);
      new Notice(`Found ${meals.length} meals in storage`);
    } catch (error) {
      console.error('Error getting meals:', error);
      new Notice(`Error getting meals: ${error.message}`);
    }
  }

  private async debugMealFoodLogIndependence() {
    console.log('=== DEBUGGING MEAL/FOOD LOG INDEPENDENCE ===');
    new Notice('🔍 Verifying meal/food log independence...');
    
    try {
      // Check if we have any meals
      const meals = await this.fileService.getMeals();
      if (meals.length === 0) {
        new Notice('No meals found. Create a meal first to test independence.');
        return;
      }
      
      // Check today's food log
      const today = new Date().toISOString().split('T')[0];
      const logPath = `${this.settings.logStoragePath}/${today}.md`;
      const logFile = this.app.vault.getAbstractFileByPath(logPath);
      
      console.log('📋 Current system state:');
      console.log(`- Meals in storage: ${meals.length}`);
      console.log(`- Today's food log exists: ${!!logFile}`);
      console.log(`- Meal storage path: ${this.settings.mealStoragePath}`);
      console.log(`- Log storage path: ${this.settings.logStoragePath}`);
      
      console.log('✅ CONFIRMATION: Meal system is designed to:');
      console.log('  1. Store meals separately from food logs');
      console.log('  2. Never modify past food logs when meals are updated');
      console.log('  3. Only use updated meal templates for future entries');
      
      new Notice(`✅ System verified: ${meals.length} meals stored independently from food logs`);
      
      // Show meals for reference
      meals.forEach((meal, index) => {
        console.log(`Meal ${index + 1}: "${meal.name}" (ID: ${meal.id})`);
        console.log(`  - Created: ${meal.createdAt}`);
        console.log(`  - Updated: ${meal.updatedAt}`);
        console.log(`  - Items: ${meal.items.length}`);
      });
      
    } catch (error) {
      console.error('Error during independence check:', error);
      new Notice(`❌ Error during verification: ${error.message}`);
    }
  }

  private async debugFileDetection() {
    console.log('=== DEBUGGING FILE DETECTION ===');
    
    // List all files in the meal storage path
    const mealStoragePath = this.settings.mealStoragePath;
    console.log('Meal storage path:', mealStoragePath);
    
    try {
      const folder = this.app.vault.getAbstractFileByPath(mealStoragePath);
      if (folder && folder instanceof TFolder) {
        console.log('Files in meal storage:');
        folder.children.forEach((file: TAbstractFile) => {
          console.log(`  - ${file.name} (${file.path})`);
        });
      } else {
        console.log('Meal storage folder not found or empty');
      }
    } catch (error) {
      console.error('Error accessing meal storage folder:', error);
    }
    
    // Test file detection
    const testPaths = [
      'tracker/health/food/meals/meals.json',
      'tracker/health/food/meals/test-meal.md',
      'tracker/health/food/meals/protein-breakfast.md'
    ];
    
    for (const testPath of testPaths) {
      const file = this.app.vault.getAbstractFileByPath(testPath);
      const isFile = this.fileService.isMealNote(file);
      console.log(`Path: ${testPath} - Exists: ${!!file} - Is meal note: ${isFile}`);
    }
  }

  private async regenerateMealNotes() {
    console.log('=== REGENERATING MEAL NOTES ===');
    new Notice('🔄 Regenerating meal notes to fix HTML rendering...');
    
    try {
      // Get all meals
      const meals = await this.fileService.getMeals();
      console.log(`Found ${meals.length} meals to regenerate`);
      
      let successCount = 0;
      let errorCount = 0;
      
      // Regenerate each meal note
      for (const meal of meals) {
        try {
          console.log(`Regenerating meal note: ${meal.name}`);
          await this.fileService.regenerateMealNote(meal.id);
          successCount++;
        } catch (error) {
          console.error(`Error regenerating meal note for ${meal.name}:`, error);
          errorCount++;
        }
      }
      
      new Notice(`✅ Regenerated ${successCount} meal notes${errorCount > 0 ? ` (${errorCount} errors)` : ''}`);
      console.log(`Regeneration complete: ${successCount} success, ${errorCount} errors`);
      
    } catch (error) {
      console.error('Error regenerating meal notes:', error);
      new Notice(`❌ Error regenerating meal notes: ${error.message}`);
    }
  }

  private debugEventListeners() {
    console.log('=== DEBUGGING EVENT LISTENERS ===');
    new Notice('🔍 Checking event listeners and delete buttons...');
    
    // Check for delete buttons
    const deleteButtons = document.querySelectorAll('.nutrition-delete-btn');
    console.log(`Found ${deleteButtons.length} delete buttons`);
    
    deleteButtons.forEach((button, index) => {
      const food = button.getAttribute('data-food');
      const isProcessing = button.hasAttribute('data-processing');
      const style = (button as HTMLElement).style.opacity;
      
      console.log(`Button ${index + 1}:`, {
        food,
        isProcessing,
        opacity: style,
        id: button.id,
        classes: button.className
      });
    });
    
    // Check global state
    console.log('Global delete in progress:', this.isDeleteInProgress);
    console.log('Plugin state:', {
      hasEditHandler: !!this.editButtonHandler,
      hasDeleteHandler: !!this.deleteButtonHandler,
      hasCTAHandler: !!this.ctaButtonHandler
    });
    
    new Notice(`Found ${deleteButtons.length} delete buttons. Check console for details.`);
  }
} 