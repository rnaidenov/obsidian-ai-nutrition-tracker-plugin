import { TFile, Vault, TAbstractFile, TFolder } from 'obsidian';
import { FoodItem, Meal } from '../types/nutrition';
import { PluginSettings } from '../types/settings';
import { FileUtils } from './file-utils';
import { ContentParser } from './content-parser';
import { LayoutGenerator } from './layout-generator';
import { FoodLogManager } from './food-log-manager';
import { MealManager } from './meal-manager';

export class FileService {
  private fileUtils: FileUtils;
  private contentParser: ContentParser;
  private layoutGenerator: LayoutGenerator;
  private foodLogManager: FoodLogManager;
  private mealManager: MealManager;
  
  constructor(private vault: Vault, private settings: PluginSettings) {
    this.fileUtils = new FileUtils(vault);
    this.contentParser = new ContentParser();
    this.layoutGenerator = new LayoutGenerator(settings);
    this.foodLogManager = new FoodLogManager(vault, settings);
    this.mealManager = new MealManager(vault, settings);
  }

  // Food Log Operations - delegate to FoodLogManager
  async createOrUpdateFoodLog(foodItems: FoodItem[], replaceEntry?: { food: string, quantity: string, calories: number, protein: number, carbs: number, fat: number }): Promise<void> {
    return this.foodLogManager.createOrUpdateFoodLog(foodItems, replaceEntry);
  }

  async deleteFoodLogItem(itemToDelete: { food: string, quantity: string, calories: number, protein: number, carbs: number, fat: number }): Promise<void> {
    return this.foodLogManager.deleteFoodLogItem(itemToDelete);
  }

  // Meal Operations - delegate to MealManager
  async saveMeal(name: string, foodItems: FoodItem[], description?: string, images?: string[]): Promise<Meal> {
    return this.mealManager.saveMeal(name, foodItems, description, images);
  }

  async getMeals(): Promise<Meal[]> {
    return this.mealManager.getMeals();
  }

  async updateMeal(mealId: string, updates: Partial<Meal>): Promise<void> {
    return this.mealManager.updateMeal(mealId, updates);
  }

  async deleteMeal(mealId: string): Promise<void> {
    return this.mealManager.deleteMeal(mealId);
  }

  async deleteMealItem(itemToDelete: { food: string, quantity: string, calories: number, protein: number, carbs: number, fat: number }): Promise<void> {
    return this.mealManager.deleteMealItem(itemToDelete);
  }

  async addItemsToMeal(mealId: string, items: FoodItem[]): Promise<void> {
    return this.mealManager.addItemsToMeal(mealId, items);
  }

  async getMealById(mealId: string): Promise<Meal | null> {
    return this.mealManager.getMealById(mealId);
  }

  isMealNote(file: TAbstractFile): boolean {
    return this.mealManager.isMealNote(file);
  }

  async syncMealNoteToJSON(file: TFile): Promise<void> {
    return this.mealManager.syncMealNoteToJSON(file);
  }

  async regenerateMealNote(mealId: string): Promise<void> {
    return this.mealManager.regenerateMealNote(mealId);
  }

  // Get all meal files from the meal storage directory
  async getMealFiles(): Promise<TFile[]> {
    try {
      const mealStoragePath = this.settings.mealStoragePath;
      const folder = this.vault.getAbstractFileByPath(mealStoragePath);
      
      if (!folder || !(folder instanceof TFolder)) {
        return [];
      }
      
      const isMealNoteFile = (file: TAbstractFile): file is TFile => {
        if (!(file instanceof TFile)) return false;
        if (file.extension !== 'md') return false;
        if (file.name === 'meals.json') return false;
        
        return this.mealManager.isMealNote(file);
      };
      
      const mealFiles = folder.children.filter(isMealNoteFile);
      
      return mealFiles;
      
    } catch (error) {
      return [];
    }
  }

  async updateMealItem(originalItem: { food: string, quantity: string, calories: number, protein: number, carbs: number, fat: number }, newItem: FoodItem): Promise<void> {
    return this.mealManager.updateMealItem(originalItem, newItem);
  }

  async handleMealFileRename(oldPath: string, newPath: string): Promise<void> {
    return this.mealManager.handleFileRename(oldPath, newPath);
  }

  // Convenient method to check if a file path is a meal note before handling rename
  async handleFileRename(oldPath: string, newPath: string): Promise<void> {
    // Only handle meal file renames
    if (oldPath.startsWith(this.settings.mealStoragePath) || newPath.startsWith(this.settings.mealStoragePath)) {
      await this.handleMealFileRename(oldPath, newPath);
    }
  }

  // File Operations - delegate to FileUtils
  async saveImage(imageFile: File): Promise<string> {
    return this.fileUtils.saveImage(imageFile, this.settings.imageStoragePath);
  }


} 