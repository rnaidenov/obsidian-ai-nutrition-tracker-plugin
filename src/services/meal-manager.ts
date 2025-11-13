import { TFile, Vault, Notice, TAbstractFile, App, normalizePath } from 'obsidian';
import { FoodItem, Meal } from '../types/nutrition';
import { PluginSettings } from '../types/settings';
import { FileUtils } from './file-utils';
import { LayoutGenerator } from './layout-generator';
import { ContentParser } from './content-parser';

export class MealManager {
  private fileUtils: FileUtils;
  private layoutGenerator: LayoutGenerator;
  private contentParser: ContentParser;

  constructor(private app: App, private vault: Vault, private settings: PluginSettings) {
    this.fileUtils = new FileUtils(vault);
    this.layoutGenerator = new LayoutGenerator(settings);
    this.contentParser = new ContentParser();
  }

  private getMealsFilePath(): string {
    return normalizePath(`${this.settings.mealStoragePath}/meals.json`);
  }

  async saveMeal(name: string, foodItems: FoodItem[], description?: string, images?: string[]): Promise<Meal> {
    const meal: Meal = {
      id: this.fileUtils.generateMealId(),
      name: name.trim(),
      items: foodItems.map(item => {
        const { mealId, ...itemWithoutMealId } = item;
        return itemWithoutMealId;
      }),
      description: description?.trim(),
      images: images || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      // Save to JSON storage
      const meals = await this.getMeals();
      meals.push(meal);
      await this.saveMealsToFile(meals);
      
      // Create individual markdown note for the meal
      const noteResult = await this.createMealNote(meal);

      // Open the newly created meal note
      if (noteResult.createdNewFile) {
        try {
          const file = this.vault.getAbstractFileByPath(noteResult.filePath);
          if (file instanceof TFile) {
            await this.app.workspace.getLeaf().openFile(file);
          }
        } catch (error) {
          console.error('Error opening newly created meal note:', error);
        }
      }

      new Notice(`✅ Meal "${name}" saved successfully`);
      return meal;
    } catch (error) {
      new Notice(`❌ Failed to save meal: ${error.message}`);
      throw new Error(`Failed to save meal: ${error.message}`);
    }
  }

  async getMeals(): Promise<Meal[]> {
    try {
      const mealsPath = this.getMealsFilePath();
      const mealsFile = this.vault.getAbstractFileByPath(mealsPath);
      
      if (!mealsFile || !(mealsFile instanceof TFile)) {
        // File doesn't exist, return empty array
        return [];
      }

      const content = await this.vault.read(mealsFile);
      const meals = JSON.parse(content);
      
      // Validate meals format
      if (!Array.isArray(meals)) {
        return [];
      }

      return meals;
    } catch (error) {
      return [];
    }
  }

  async updateMeal(mealId: string, updates: Partial<Meal>): Promise<void> {
    try {
      const meals = await this.getMeals();
      const mealIndex = meals.findIndex(m => m.id === mealId);
      
      if (mealIndex === -1) {
        throw new Error(`Meal with ID ${mealId} not found`);
      }

      const oldMeal = meals[mealIndex];
      const updatedMeal = {
        ...oldMeal,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      meals[mealIndex] = updatedMeal;

      await this.saveMealsToFile(meals);
      
      // Update the markdown note
      await this.updateMealNote(oldMeal, updatedMeal);
      
      new Notice(`✅ Meal "${updatedMeal.name}" updated successfully`);
    } catch (error) {
      throw new Error(`Failed to update meal: ${error.message}`);
    }
  }

  async getMealById(mealId: string): Promise<Meal | null> {
    try {
      const meals = await this.getMeals();
      return meals.find(m => m.id === mealId) || null;
    } catch (error) {
      return null;
    }
  }

  private async saveMealsToFile(meals: Meal[]): Promise<void> {
    try {
      const mealsPath = this.getMealsFilePath();
      
      await this.fileUtils.ensureDirectoryExists(this.settings.mealStoragePath);
      
      const content = JSON.stringify(meals, null, 2);
      
      const existingFile = this.vault.getAbstractFileByPath(mealsPath);
      
      if (existingFile instanceof TFile) {
        this.vault.modify(existingFile, content);
      } else {
        await this.vault.create(mealsPath, content);
      }
    } catch (error) {
      throw error;
    }
  }

  private async createMealNote(meal: Meal): Promise<{ createdNewFile: boolean; filePath: string }> {
    try {
      const sanitizedName = this.fileUtils.sanitizeMealName(meal.name);
      const filename = `${sanitizedName}.md`;
      const notePath = normalizePath(`${this.settings.mealStoragePath}/${filename}`);

      const content = this.generateMealNoteContent(meal);

      const existingFile = this.vault.getAbstractFileByPath(notePath);
      let createdNewFile = false;

      if (existingFile && existingFile instanceof TFile) {
        this.vault.modify(existingFile, content);
      } else {
        await this.vault.create(notePath, content);
        createdNewFile = true;
      }

      return { createdNewFile, filePath: notePath };
    } catch (error) {
      new Notice(`Warning: Failed to create meal note: ${error.message}`);
      throw error;
    }
  }

  private async updateMealNote(oldMeal: Meal, newMeal: Meal): Promise<void> {
    try {
      if (oldMeal.name !== newMeal.name) {
        await this.deleteMealNote(oldMeal);
      }

      await this.createMealNote(newMeal);
    } catch (error) {
      new Notice(`Warning: Failed to update meal note: ${error.message}`);
    }
  }

  private async deleteMealNote(meal: Meal): Promise<void> {
    try {
      const sanitizedName = this.fileUtils.sanitizeMealName(meal.name);
      const filename = `${sanitizedName}.md`;
      const notePath = normalizePath(`${this.settings.mealStoragePath}/${filename}`);
      
      const existingFile = this.vault.getAbstractFileByPath(notePath);
      if (existingFile instanceof TFile) {
        await this.app.fileManager.trashFile(existingFile);
      }
    } catch (error) {
      new Notice(`Warning: Failed to delete meal note: ${error.message}`);
    }
  }

  private generateMealNoteContent(meal: Meal): string {
    const totalCalories = meal.items.reduce((sum, item) => sum + item.calories, 0);
    const totalProtein = meal.items.reduce((sum, item) => sum + item.protein, 0);
    const totalCarbs = meal.items.reduce((sum, item) => sum + item.carbs, 0);
    const totalFat = meal.items.reduce((sum, item) => sum + item.fat, 0);
    
    const totals = {
      calories: totalCalories,
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat
    };
    
    let content = '';
    content += '## 🥗 Meal Items\n\n';
    content += this.layoutGenerator.generateCardLayout(meal.items, 'meal', meal.id);
    content += this.layoutGenerator.generateMealProgressSummaryWithId(totals, meal.id);
    
    return content;
  }

  // Methods for syncing meal notes back to JSON
  isMealNote(file: TAbstractFile): boolean {
    return this.fileUtils.isMealNote(file, this.settings.mealStoragePath, this.settings.logStoragePath);
  }

  async syncMealNoteToJSON(file: TFile): Promise<void> {
    try {
      const content = await this.vault.read(file);
      
      // Double-check that this is actually a meal note by looking for meal ID
      if (!content.includes('data-meal-id="')) {
        return;
      }
      
      const parsedMeal = this.contentParser.parseMealFromMarkdown(content);
      
      if (!parsedMeal) {
        return;
      }

      // Extract meal name from filename instead of content
      const filename = file.path.split('/').pop()?.replace('.md', '') || '';
      const mealName = this.convertFilenameToMealName(filename);
      
      // IMPORTANT: Only update the meal template in JSON storage
      // This will NOT affect any existing food logs that used this meal
      const meals = await this.getMeals();
      const mealIndex = meals.findIndex(m => m.id === parsedMeal.id);
      
      if (mealIndex >= 0) {
        const oldMeal = meals[mealIndex];
        
        // Check if name changed (file was renamed)
        const nameChanged = oldMeal.name !== mealName;
        
        // Update existing meal template
        const updatedMeal = {
          ...oldMeal,
          name: mealName,
          items: parsedMeal.items || oldMeal.items, // Fallback to old items if parsing failed
          description: parsedMeal.description !== undefined ? parsedMeal.description : oldMeal.description,
          updatedAt: new Date().toISOString()
        };
        
        meals[mealIndex] = updatedMeal;
        await this.saveMealsToFile(meals);

        if (!nameChanged) {
          return;
        }

        await this.handleMealNameChange(oldMeal, updatedMeal, file);
        new Notice(`✅ Meal updated: "${oldMeal.name}" → "${updatedMeal.name}"`);
      } else {
        new Notice(`⚠️ Meal not found in storage - this might be an orphaned meal note`);
      }
      
    } catch (error) {
      new Notice(`❌ Failed to sync meal changes: ${error.message}`);
      throw error;
    }
  }

  async updateMealItem(originalItem: { food: string, quantity: string, calories: number, protein: number, carbs: number, fat: number }, newItem: FoodItem): Promise<void> {
    try {
      const meals = await this.getMeals();
      let mealFound = false;
      
      // Find the meal that contains this item
      for (const meal of meals) {
        const itemIndex = meal.items.findIndex(item => 
          item.food === originalItem.food &&
          item.quantity === originalItem.quantity &&
          item.calories === originalItem.calories
        );
        
        if (itemIndex >= 0) {
          // Update the item in the meal
          const { mealId, timestamp, ...itemWithoutMealData } = newItem;
          meal.items[itemIndex] = itemWithoutMealData;
          meal.updatedAt = new Date().toISOString();
          
          // Save updated meals to JSON
          await this.saveMealsToFile(meals);
          
          // Regenerate the meal note to reflect changes
          await this.createMealNote(meal);
          
          // Force immediate sync from file back to JSON to ensure consistency
          const mealFileName = this.fileUtils.sanitizeMealName(meal.name) + '.md';
          const mealFilePath = normalizePath(`${this.settings.mealStoragePath}/${mealFileName}`);
          const mealFile = this.vault.getAbstractFileByPath(mealFilePath);
          if (mealFile instanceof TFile) {
            // Small delay to ensure file write is complete
            window.setTimeout(async () => {
              await this.syncMealNoteToJSON(mealFile);
            }, 100);
          }
          
          new Notice(`✅ Meal item updated: ${newItem.food} in "${meal.name}"`);
          mealFound = true;
          break;
        }
      }
      
      if (!mealFound) {
        new Notice('⚠️ Could not find the meal containing this item');
      }
      
    } catch (error) {
      new Notice(`❌ Failed to update meal item: ${error.message}`);
      throw error;
    }
  }

  // Method to delete a specific item from a meal template
  async deleteMealItem(itemToDelete: { food: string, quantity: string, calories: number, protein: number, carbs: number, fat: number }): Promise<void> {
    try {
      const meals = await this.getMeals();
      let mealFound = false;
      
      // Find the meal that contains this item
      for (const meal of meals) {
        const itemIndex = meal.items.findIndex(item => 
          item.food === itemToDelete.food &&
          item.quantity === itemToDelete.quantity &&
          item.calories === itemToDelete.calories
        );
        
        if (itemIndex >= 0) {
          // Remove the item from the meal
          meal.items.splice(itemIndex, 1);
          meal.updatedAt = new Date().toISOString();
          
          // Save updated meals to JSON
          await this.saveMealsToFile(meals);
          
          // Regenerate the meal note to reflect changes
          await this.createMealNote(meal);
          
          // Force immediate sync from file back to JSON to ensure consistency
          const mealFileName = this.fileUtils.sanitizeMealName(meal.name) + '.md';
          const mealFilePath = normalizePath(`${this.settings.mealStoragePath}/${mealFileName}`);
          const mealFile = this.vault.getAbstractFileByPath(mealFilePath);
          if (mealFile instanceof TFile) {
            // Small delay to ensure file write is complete
            window.setTimeout(async () => {
              await this.syncMealNoteToJSON(mealFile);
            }, 100);
          }
          
          new Notice(`✅ Meal item deleted: ${itemToDelete.food} from "${meal.name}"`);
          mealFound = true;
          break;
        }
      }
      
      if (!mealFound) {
        new Notice('⚠️ Could not find the meal containing this item');
      }
      
    } catch (error) {
      new Notice(`❌ Failed to delete meal item: ${error.message}`);
      throw error;
    }
  }

  // Method to add new items to a specific meal template
  async addItemsToMeal(mealId: string, items: FoodItem[]): Promise<void> {
    try {
      const meals = await this.getMeals();
      const mealIndex = meals.findIndex(m => m.id === mealId);
      
      if (mealIndex === -1) {
        throw new Error(`Meal with ID ${mealId} not found`);
      }
      
      const meal = meals[mealIndex];
      
      // Clean items to remove any meal-specific data
      const cleanItems = items.map(item => {
        const { mealId: itemMealId, timestamp, ...cleanItem } = item;
        return cleanItem;
      });
      
      // Add the new items to the meal
      meal.items.push(...cleanItems);
      meal.updatedAt = new Date().toISOString();
      
      // Save updated meals to JSON
      await this.saveMealsToFile(meals);
      
      // Regenerate the meal note to reflect changes
      await this.createMealNote(meal);
      
      // Force immediate sync from file back to JSON to ensure consistency
      const mealFileName = this.fileUtils.sanitizeMealName(meal.name) + '.md';
      const mealFilePath = normalizePath(`${this.settings.mealStoragePath}/${mealFileName}`);
      const mealFile = this.vault.getAbstractFileByPath(mealFilePath);
      if (mealFile instanceof TFile) {
        window.setTimeout(async () => {
          await this.syncMealNoteToJSON(mealFile);
        }, 100);
      }
      
      new Notice(`✅ ${items.length} item(s) added to meal "${meal.name}"`);
      
    } catch (error) {
      new Notice(`❌ Failed to add items to meal: ${error.message}`);
      throw error;
    }
  }

  // Handle when a meal's name has changed via file rename
  private async handleMealNameChange(oldMeal: Meal, newMeal: Meal, currentFile: TFile): Promise<void> {
    try {
      // Calculate what the old filename should have been
      const oldSanitizedName = this.fileUtils.sanitizeMealName(oldMeal.name);
      const oldFilename = `${oldSanitizedName}.md`;
      const oldNotePath = normalizePath(`${this.settings.mealStoragePath}/${oldFilename}`);
      
      // Calculate what the new filename should be
      const newSanitizedName = this.fileUtils.sanitizeMealName(newMeal.name);
      const newFilename = `${newSanitizedName}.md`;
      const newNotePath = normalizePath(`${this.settings.mealStoragePath}/${newFilename}`);
      
      // If the current file doesn't match the expected new filename, rename it
      if (currentFile.path !== newNotePath) {
        // Check if a file with the new name already exists
        const existingNewFile = this.vault.getAbstractFileByPath(newNotePath);
        if (existingNewFile && existingNewFile !== currentFile) {
          if (existingNewFile instanceof TFile) {
            await this.app.fileManager.trashFile(existingNewFile);
          }
        }
        
        // Rename the file to match the new meal name
        const newFileBasename = newFilename.replace('.md', '');
        await this.vault.rename(currentFile, newNotePath);
        
      }
      
      // Clean up old file if it exists and is different from current file
      if (oldNotePath !== currentFile.path) {
        const oldFile = this.vault.getAbstractFileByPath(oldNotePath);
        if (oldFile instanceof TFile && oldFile !== currentFile) {
          await this.app.fileManager.trashFile(oldFile);
        }
      }
      
    } catch (error) {
      // Don't throw here - the meal data has already been updated successfully
      new Notice(`Warning: Could not rename meal file: ${error.message}`);
    }
  }

  async handleFileRename(oldPath: string, newPath: string): Promise<void> {
    try {
      const newFilename = newPath.split('/').pop()?.replace('.md', '') || '';
      
      // Skip if not in meal storage path
      if (!newPath.startsWith(this.settings.mealStoragePath) || !oldPath.startsWith(this.settings.mealStoragePath)) {
        return;
      }
      
      // Read the file to get the meal ID
      const file = this.vault.getAbstractFileByPath(newPath);
      if (!(file instanceof TFile)) {
        return;
      }
      
      const content = await this.vault.read(file);
      if (!content.includes('data-meal-id="')) {
        return;
      }
      
      const parsedMeal = this.contentParser.parseMealFromMarkdown(content);
      if (!parsedMeal || !parsedMeal.id) {
        return;
      }
      
      // Find the meal in JSON storage
      const meals = await this.getMeals();
      const mealIndex = meals.findIndex(m => m.id === parsedMeal.id);
      
      if (mealIndex >= 0) {
        const oldMeal = meals[mealIndex];
        
        // Convert filename back to a readable name (reverse sanitization as much as possible)
        const newMealName = this.convertFilenameToMealName(newFilename);
        
        // Only proceed if the name actually changed
        if (oldMeal.name === newMealName) {
          return;
        }
        
        // Update the meal name in JSON storage
        const updatedMeal = {
          ...oldMeal,
          name: newMealName,
          updatedAt: new Date().toISOString()
        };
        
        meals[mealIndex] = updatedMeal;
        await this.saveMealsToFile(meals);
        
        // Regenerate the entire file content with the new name in the heading
        await this.createMealNote(updatedMeal);
      }
      
    } catch (error) {
      new Notice(`Warning: Could not sync meal name change: ${error.message}`);
    }
  }

  // Convert a sanitized filename back to a readable meal name
  private convertFilenameToMealName(filename: string): string {
    // Replace hyphens with spaces and capitalize words
    return filename
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
      .trim();
  }
} 