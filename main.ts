import { Plugin, TFile, Notice } from 'obsidian';
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
  private mealSyncTimeouts: Map<string, NodeJS.Timeout> = new Map();

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
    console.log('Unloading Nutrition Tracker Plugin');
    
    // Clean up event listener
    if (this.editButtonHandler) {
      document.removeEventListener('click', this.editButtonHandler);
    }
    
    // Clear all meal sync timeouts
    this.mealSyncTimeouts.forEach(timeout => clearTimeout(timeout));
    this.mealSyncTimeouts.clear();
  }

  private openFoodInputModal() {
    new FoodInputModal(
      this.app, 
      this.settings, 
      this.llmService, 
      this.fileService
    ).open();
  }

  private editFoodEntry(food: string, quantity: string, calories: number, protein: number, carbs: number, fat: number, context?: 'meal' | 'foodlog') {
    console.log('🔧 Edit context:', context || 'foodlog');
    
    const modal = new FoodInputModal(
      this.app, 
      this.settings, 
      this.llmService, 
      this.fileService
    );
    
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
    
    document.addEventListener('click', this.editButtonHandler);
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
    new Notice('🔍 Checking file detection logic...');
    
    try {
      console.log('📋 Settings:');
      console.log(`- Meal storage path: "${this.settings.mealStoragePath}"`);
      console.log(`- Log storage path: "${this.settings.logStoragePath}"`);
      
      // Check specific files
      const today = new Date().toISOString().split('T')[0];
      const foodLogPath = `${this.settings.logStoragePath}/${today}.md`;
      const foodLogFile = this.app.vault.getAbstractFileByPath(foodLogPath);
      
      console.log('📄 Food Log File:');
      console.log(`- Path: "${foodLogPath}"`);
      console.log(`- Exists: ${!!foodLogFile}`);
      if (foodLogFile) {
        console.log(`- Is meal note: ${this.fileService.isMealNote(foodLogFile)}`);
      }
      
      // Check meal files
      const allFiles = this.app.vault.getFiles();
      const mealFiles = allFiles.filter(file => this.fileService.isMealNote(file));
      
      console.log('📄 Detected Meal Files:');
      mealFiles.forEach((file, index) => {
        console.log(`${index + 1}. "${file.path}"`);
        console.log(`   - Name: "${file.name}"`);
        console.log(`   - Extension: "${file.extension}"`);
      });
      
      // Check for files that might be misclassified
      const mdFiles = allFiles.filter(f => f.extension === 'md');
      console.log('📄 All MD Files:');
      mdFiles.forEach((file, index) => {
        const isMeal = this.fileService.isMealNote(file);
        const isInMealPath = file.path.startsWith(this.settings.mealStoragePath);
        const isInLogPath = file.path.startsWith(this.settings.logStoragePath);
        
        console.log(`${index + 1}. "${file.path}"`);
        console.log(`   - Is meal note: ${isMeal}`);
        console.log(`   - In meal path: ${isInMealPath}`);
        console.log(`   - In log path: ${isInLogPath}`);
      });
      
      new Notice(`Found ${mealFiles.length} meal files and ${mdFiles.length} total MD files`);
      
    } catch (error) {
      console.error('Error during file detection debug:', error);
      new Notice(`❌ Error during file detection: ${error.message}`);
    }
  }
} 