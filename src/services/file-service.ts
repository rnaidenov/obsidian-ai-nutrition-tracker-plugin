import { TFile, Vault, Notice, TAbstractFile } from 'obsidian';
import { FoodItem, NutritionData, Meal } from '../types/nutrition';
import { PluginSettings } from '../types/settings';
import { LLMService } from './llm-service';
import { FileUtils } from './file-utils';
import { ThemeUtils } from './theme-utils';
import { ContentParser } from './content-parser';
import { LayoutGenerator } from './layout-generator';
import { FoodLogManager } from './food-log-manager';
import { MealManager } from './meal-manager';

export class FileService {
  private llmService: LLMService;
  private fileUtils: FileUtils;
  private themeUtils: ThemeUtils;
  private contentParser: ContentParser;
  private layoutGenerator: LayoutGenerator;
  private foodLogManager: FoodLogManager;
  private mealManager: MealManager;
  
  constructor(private vault: Vault, private settings: PluginSettings) {
    this.llmService = new LLMService(settings);
    this.fileUtils = new FileUtils(vault);
    this.themeUtils = new ThemeUtils(settings);
    this.contentParser = new ContentParser();
    this.layoutGenerator = new LayoutGenerator(settings);
    this.foodLogManager = new FoodLogManager(vault, settings);
    this.mealManager = new MealManager(vault, settings);
    
    console.log('FileService initialized with settings:', settings);
    console.log('Meal storage path:', settings.mealStoragePath);
  }

  // Food Log Operations - delegate to FoodLogManager
  async createOrUpdateFoodLog(foodItems: FoodItem[], replaceEntry?: { food: string, quantity: string, calories: number, protein: number, carbs: number, fat: number }): Promise<void> {
    return this.foodLogManager.createOrUpdateFoodLog(foodItems, replaceEntry);
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

  // Legacy methods for backward compatibility (these delegate to the new modular approach)
  private getTodayString(): string {
    return this.fileUtils.getTodayString();
  }

  private async ensureDirectoryExists(path: string): Promise<void> {
    return this.fileUtils.ensureDirectoryExists(path);
  }

  private getEffectiveTheme(): 'light' | 'dark' {
    return this.themeUtils.getEffectiveTheme();
  }

  private extractFoodItemsFromContent(content: string): FoodItem[] {
    return this.contentParser.extractFoodItemsFromContent(content);
  }

  private calculateTotals(foodItems: FoodItem[]): NutritionData {
    return this.contentParser.calculateTotals(foodItems);
  }

  private calculatePercentage(current: number, goal: number): number {
    return this.contentParser.calculatePercentage(current, goal);
  }

  private generateCardLayout(foodItems: FoodItem[], context?: 'meal' | 'foodlog'): string {
    return this.layoutGenerator.generateCardLayout(foodItems, context);
  }

  private generateSimpleLayout(foodItems: FoodItem[], context?: 'meal' | 'foodlog'): string {
    return this.layoutGenerator.generateSimpleLayout(foodItems, context);
  }

  private async generateDailySummary(totals: NutritionData): Promise<string> {
    return this.layoutGenerator.generateDailySummary(totals);
  }

  private getProgressBar(current: number, goal: number): string {
    return this.themeUtils.getProgressBar(current, goal);
  }

  private getOverallStatusEmoji(percentage: number): string {
    return this.themeUtils.getOverallStatusEmoji(percentage);
  }

  private generateModernProgressBars(totals: NutritionData, goals: any): string {
    return this.layoutGenerator.generateModernProgressBars(totals, goals);
  }

  private getProgressGradient(percentage: number, isDark: boolean): { gradient: string, textColor: string, borderColor: string } {
    return this.themeUtils.getProgressGradient(percentage, isDark);
  }

  private async generateMealProgressSummary(totals: NutritionData): Promise<string> {
    return this.layoutGenerator.generateMealProgressSummary(totals);
  }

  // Content parsing and manipulation methods
  private findCardPosition(content: string, escapedFood: string, escapedQuantity: string, calories: number): { success: boolean, startIndex: number, endIndex: number } {
    return this.contentParser.findCardPosition(content, escapedFood, escapedQuantity, calories);
  }

  private findCardBounds(content: string, startIndex: number): { success: boolean, endIndex: number } {
    return this.contentParser.findCardBounds(content, startIndex);
  }

  private findAndReplaceCompleteCard(content: string, originalEntry: { food: string, quantity: string, calories: number, protein: number, carbs: number, fat: number }): { success: boolean, content: string } {
    return this.contentParser.findAndReplaceCompleteCard(content, originalEntry);
  }

  private extractCompleteCard(content: string, startIndex: number): { success: boolean, content: string } {
    return this.contentParser.extractCompleteCard(content, startIndex);
  }

  private replaceCardInPosition(content: string, originalEntry: { food: string, quantity: string, calories: number, protein: number, carbs: number, fat: number }, newFoodItems: FoodItem[]): { success: boolean, content: string } {
    const newCardContent = this.generateCardLayout(newFoodItems);
    return this.contentParser.replaceCardInPosition(content, originalEntry, newCardContent);
  }

  private parseMealFromMarkdown(content: string): Partial<Meal> | null {
    return this.contentParser.parseMealFromMarkdown(content);
  }
} 