import { TFile, Vault, Notice, TAbstractFile } from 'obsidian';
import { FoodItem, Meal } from '../types/nutrition';
import { PluginSettings } from '../types/settings';
import { FileUtils } from './file-utils';
import { LayoutGenerator } from './layout-generator';
import { ContentParser } from './content-parser';

export class MealManager {
  private fileUtils: FileUtils;
  private layoutGenerator: LayoutGenerator;
  private contentParser: ContentParser;

  constructor(private vault: Vault, private settings: PluginSettings) {
    this.fileUtils = new FileUtils(vault);
    this.layoutGenerator = new LayoutGenerator(settings);
    this.contentParser = new ContentParser();
  }

  private getMealsFilePath(): string {
    return `${this.settings.mealStoragePath}/meals.json`;
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
      await this.createMealNote(meal);
      
      new Notice(`✅ Meal "${name}" saved successfully`);
      return meal;
    } catch (error) {
      console.error('Error saving meal:', error);
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
        console.warn('Invalid meals file format, returning empty array');
        return [];
      }

      return meals;
    } catch (error) {
      console.error('Error loading meals:', error);
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
      console.error('Error updating meal:', error);
      throw new Error(`Failed to update meal: ${error.message}`);
    }
  }

  async deleteMeal(mealId: string): Promise<void> {
    try {
      const meals = await this.getMeals();
      const mealIndex = meals.findIndex(m => m.id === mealId);
      
      if (mealIndex === -1) {
        throw new Error(`Meal with ID ${mealId} not found`);
      }

      const mealToDelete = meals[mealIndex];
      meals.splice(mealIndex, 1);
      
      await this.saveMealsToFile(meals);
      
      // Delete the markdown note
      await this.deleteMealNote(mealToDelete);
      
      new Notice(`✅ Meal "${mealToDelete.name}" deleted successfully`);
    } catch (error) {
      console.error('Error deleting meal:', error);
      throw new Error(`Failed to delete meal: ${error.message}`);
    }
  }

  async getMealById(mealId: string): Promise<Meal | null> {
    try {
      const meals = await this.getMeals();
      return meals.find(m => m.id === mealId) || null;
    } catch (error) {
      console.error('Error getting meal by ID:', error);
      return null;
    }
  }

  private async saveMealsToFile(meals: Meal[]): Promise<void> {
    try {
      const mealsPath = this.getMealsFilePath();
      console.log('Saving meals to file path:', mealsPath);
      
      // Ensure directory exists
      console.log('Ensuring directory exists for:', this.settings.mealStoragePath);
      await this.fileUtils.ensureDirectoryExists(this.settings.mealStoragePath);
      
      const content = JSON.stringify(meals, null, 2);
      console.log('Meals content to save:', content);
      
      const existingFile = this.vault.getAbstractFileByPath(mealsPath);
      console.log('Existing file found:', !!existingFile);
      
      if (existingFile instanceof TFile) {
        console.log('Modifying existing file...');
        await this.vault.modify(existingFile, content);
        console.log('Successfully modified existing file');
      } else {
        console.log('Creating new file...');
        await this.vault.create(mealsPath, content);
        console.log('Successfully created new file');
      }
      
      // Verify file was created/updated
      const verifyFile = this.vault.getAbstractFileByPath(mealsPath);
      console.log('Verification: File exists after save:', !!verifyFile);
      
    } catch (error) {
      console.error('Error saving meals to file:', error);
      console.error('Meals path:', this.getMealsFilePath());
      console.error('Storage path:', this.settings.mealStoragePath);
      console.error('Full error:', error);
      throw error;
    }
  }

  private async createMealNote(meal: Meal): Promise<void> {
    try {
      // Sanitize meal name for filename
      const sanitizedName = this.fileUtils.sanitizeMealName(meal.name);
      const timestamp = new Date(meal.createdAt).toISOString().split('T')[0]; // YYYY-MM-DD
      const filename = `${timestamp}-${sanitizedName}.md`;
      const notePath = `${this.settings.mealStoragePath}/${filename}`;
      
      // Generate meal note content
      const content = await this.generateMealNoteContent(meal);
      
      // Check if file already exists
      const existingFile = this.vault.getAbstractFileByPath(notePath);
      if (existingFile) {
        // File exists, modify it
        await this.vault.modify(existingFile as TFile, content);
      } else {
        // Create new file
        await this.vault.create(notePath, content);
      }
      
      console.log(`Created meal note: ${notePath}`);
    } catch (error) {
      console.error('Error creating meal note:', error);
      // Don't throw here - we don't want to fail the whole meal save if note creation fails
      new Notice(`Warning: Failed to create meal note: ${error.message}`);
    }
  }

  private async updateMealNote(oldMeal: Meal, newMeal: Meal): Promise<void> {
    try {
      // Delete old note if name changed
      if (oldMeal.name !== newMeal.name) {
        await this.deleteMealNote(oldMeal);
      }
      
      // Create/update new note
      await this.createMealNote(newMeal);
      
      console.log(`Updated meal note for: ${newMeal.name}`);
    } catch (error) {
      console.error('Error updating meal note:', error);
      new Notice(`Warning: Failed to update meal note: ${error.message}`);
    }
  }

  private async deleteMealNote(meal: Meal): Promise<void> {
    try {
      const sanitizedName = this.fileUtils.sanitizeMealName(meal.name);
      const timestamp = new Date(meal.createdAt).toISOString().split('T')[0]; // YYYY-MM-DD
      const filename = `${timestamp}-${sanitizedName}.md`;
      const notePath = `${this.settings.mealStoragePath}/${filename}`;
      
      const existingFile = this.vault.getAbstractFileByPath(notePath);
      if (existingFile instanceof TFile) {
        await this.vault.delete(existingFile);
        console.log(`Deleted meal note: ${notePath}`);
      }
    } catch (error) {
      console.error('Error deleting meal note:', error);
      new Notice(`Warning: Failed to delete meal note: ${error.message}`);
    }
  }

  private async generateMealNoteContent(meal: Meal): Promise<string> {
    const createdDate = new Date(meal.createdAt).toLocaleDateString();
    const totalCalories = meal.items.reduce((sum, item) => sum + item.calories, 0);
    const totalProtein = meal.items.reduce((sum, item) => sum + item.protein, 0);
    const totalCarbs = meal.items.reduce((sum, item) => sum + item.carbs, 0);
    const totalFat = meal.items.reduce((sum, item) => sum + item.fat, 0);
    
    // Create totals object for progress summary
    const totals = {
      calories: totalCalories,
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat
    };
    
    let content = `# 🍽️ ${meal.name}\n\n`;
    content += `**Created:** ${createdDate}\n`;
    content += `**Items:** ${meal.items.length}\n`;
    content += `**Total Calories:** ${totalCalories} kcal\n\n`;
    
    // Add editing instructions
    content += `> **✏️ Editing Instructions:**\n`;
    content += `> - Edit this meal by modifying the food items below\n`;
    content += `> - Changes will update the meal template for **future use only**\n`;
    content += `> - **Past food logs will NOT be affected** - they remain as logged\n`;
    content += `> - Save this file to sync changes back to meal storage\n\n`;
    
    if (meal.description) {
      content += `## 📝 Description\n${meal.description}\n\n`;
    }
    
    content += `## 🥗 Meal Items\n\n`;
    
    // Generate food items using the same card layout as food logs but with meal context
    content += this.layoutGenerator.generateCardLayout(meal.items, 'meal');
    
    // Add beautiful progress summary instead of simple table
    content += await this.layoutGenerator.generateMealProgressSummary(totals);
    
    // Add meal metadata
    content += `---\n\n`;
    content += `**Meal ID:** \`${meal.id}\`\n`;
    content += `**Created:** ${meal.createdAt}\n`;
    content += `**Last Updated:** ${meal.updatedAt}\n\n`;
    content += `*✨ Generated by AI Nutrition Tracker Plugin*\n`;
    
    return content;
  }

  // Methods for syncing meal notes back to JSON
  isMealNote(file: TAbstractFile): boolean {
    return this.fileUtils.isMealNote(file, this.settings.mealStoragePath, this.settings.logStoragePath);
  }

  async syncMealNoteToJSON(file: TFile): Promise<void> {
    try {
      console.log('🔄 Syncing meal note to JSON (MEAL TEMPLATE ONLY):', file.path);
      console.log('📋 This will NOT affect any past food logs - only future uses of this meal');
      
      const content = await this.vault.read(file);
      
      // Double-check that this is actually a meal note by looking for meal ID
      if (!content.includes('**Meal ID:**')) {
        console.warn('❌ File does not contain meal ID - this is NOT a meal note, skipping sync:', file.path);
        console.warn('File content preview:', content.substring(0, 200) + '...');
        return;
      }
      
      const parsedMeal = this.contentParser.parseMealFromMarkdown(content);
      
      if (!parsedMeal) {
        console.warn('Could not parse meal from markdown:', file.path);
        return;
      }
      
      // IMPORTANT: Only update the meal template in JSON storage
      // This will NOT affect any existing food logs that used this meal
      const meals = await this.getMeals();
      const mealIndex = meals.findIndex(m => m.id === parsedMeal.id);
      
      if (mealIndex >= 0) {
        const oldMeal = meals[mealIndex];
        
        // Update existing meal template
        const updatedMeal = {
          ...oldMeal,
          name: parsedMeal.name,
          items: parsedMeal.items,
          description: parsedMeal.description,
          updatedAt: new Date().toISOString()
        };
        
        meals[mealIndex] = updatedMeal;
        await this.saveMealsToFile(meals);
        
        console.log('✅ Meal TEMPLATE updated in JSON:', updatedMeal.name);
        console.log('📝 Past food logs using this meal remain unchanged');
        console.log('🔮 Future uses of this meal will use the updated version');
        
        new Notice(`✅ Meal template "${updatedMeal.name}" updated for future use`);
      } else {
        console.warn('Meal not found in JSON storage:', parsedMeal.id);
        new Notice(`⚠️ Meal not found in storage - this might be an orphaned meal note`);
      }
    } catch (error) {
      console.error('Error syncing meal note to JSON:', error);
      new Notice(`❌ Failed to sync meal: ${error.message}`);
    }
  }

  // Method to regenerate meal note after sync (to update totals)
  async regenerateMealNote(mealId: string): Promise<void> {
    try {
      const meal = await this.getMealById(mealId);
      if (meal) {
        await this.createMealNote(meal);
        console.log('✅ Meal note regenerated:', meal.name);
      }
    } catch (error) {
      console.error('Error regenerating meal note:', error);
    }
  }

  // Method to update a specific item within a meal template
  async updateMealItem(originalItem: { food: string, quantity: string, calories: number, protein: number, carbs: number, fat: number }, newItem: FoodItem): Promise<void> {
    try {
      console.log('🔄 Updating meal item:', originalItem.food, '→', newItem.food);
      
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
          console.log('✅ Found item in meal:', meal.name);
          
          // Update the item in the meal
          const { mealId, timestamp, ...itemWithoutMealData } = newItem;
          meal.items[itemIndex] = itemWithoutMealData;
          meal.updatedAt = new Date().toISOString();
          
          // Save updated meals
          await this.saveMealsToFile(meals);
          
          // Regenerate the meal note
          await this.createMealNote(meal);
          
          new Notice(`✅ Meal item updated: ${newItem.food} in "${meal.name}"`);
          mealFound = true;
          break;
        }
      }
      
      if (!mealFound) {
        console.warn('⚠️ Could not find meal containing the item to update');
        new Notice('⚠️ Could not find the meal containing this item');
      }
      
    } catch (error) {
      console.error('Error updating meal item:', error);
      new Notice(`❌ Failed to update meal item: ${error.message}`);
      throw error;
    }
  }
} 