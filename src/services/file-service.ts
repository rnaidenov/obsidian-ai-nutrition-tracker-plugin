import { TFile, Vault, Notice } from 'obsidian';
import { FoodItem, NutritionData } from '../types/nutrition';
import { PluginSettings } from '../types/settings';

export class FileService {
  constructor(private vault: Vault, private settings: PluginSettings) {}

  async createOrUpdateFoodLog(foodItems: FoodItem[]): Promise<void> {
    const today = this.getTodayString();
    const logPath = `${this.settings.logStoragePath}/${today}.md`;
    
    try {
      // Ensure the directory exists
      await this.ensureDirectoryExists(this.settings.logStoragePath);
      
      // Check if file already exists
      const existingFile = this.vault.getAbstractFileByPath(logPath);
      
      if (existingFile instanceof TFile) {
        // Append to existing file
        await this.appendToExistingLog(existingFile, foodItems);
      } else {
        // Create new file
        await this.createNewFoodLog(logPath, foodItems);
      }
      
      new Notice(`Food log updated: ${today}.md`);
    } catch (error) {
      console.error('Error creating/updating food log:', error);
      throw new Error(`Failed to save food log: ${error.message}`);
    }
  }

  private async createNewFoodLog(path: string, foodItems: FoodItem[]): Promise<void> {
    const content = await this.generateFoodLogContent(foodItems, true);
    await this.vault.create(path, content);
  }

  private async appendToExistingLog(file: TFile, foodItems: FoodItem[]): Promise<void> {
    const existingContent = await this.vault.read(file);
    const newEntries = await this.generateFoodLogContent(foodItems, false);
    
    // Find the position to insert new entries (before the daily summary)
    const summaryRegex = /## 📊 Daily Summary[\s\S]*$/;
    const match = existingContent.match(summaryRegex);
    
    if (match) {
      // Remove the existing summary and insert new entries
      const beforeSummary = existingContent.substring(0, match.index);
      const updatedContent = beforeSummary + newEntries;
      
      // Recalculate totals (this will add the new summary)
      const finalContent = await this.recalculateTotals(updatedContent);
      await this.vault.modify(file, finalContent);
    } else {
      // No summary found, just append new entries and add summary
      const updatedContent = existingContent + '\n' + newEntries;
      const allFoodItems = this.extractFoodItemsFromContent(updatedContent);
      const totals = this.calculateTotals(allFoodItems);
      const summary = await this.generateDailySummary(totals);
      const finalContent = updatedContent + '\n' + summary;
      await this.vault.modify(file, finalContent);
    }
  }

  private async generateFoodLogContent(foodItems: FoodItem[], isNewFile: boolean): Promise<string> {
    const today = this.getTodayString();
    const totals = this.calculateTotals(foodItems);
    
    let content = '';
    
    if (isNewFile) {
      content += `# 🍽️ Food Log ${today}\n\n`;
      content += `## 🥗 Today's Meals\n\n`;
    }
    
    // Add food items with beautiful formatting
    for (const item of foodItems) {
      const emoji = this.getFoodEmoji(item.food);
      content += `### ${emoji} ${item.food}\n\n`;
      
      // Create a beautiful nutrition card
      content += `> **${item.quantity}** ・ `;
      if (item.timestamp) {
        const time = new Date(item.timestamp).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        content += `🕐 ${time}\n`;
      } else {
        content += '\n';
      }
      content += `> \n`;
      content += `> 🔥 **${item.calories}** kcal ・ `;
      content += `💪 **${item.protein}g** protein ・ `;
      content += `🌾 **${item.carbs}g** carbs ・ `;
      content += `🥑 **${item.fat}g** fat\n\n`;
      
      content += `---\n\n`;
    }
    
    if (isNewFile) {
      content += await this.generateDailySummary(totals);
    }
    
    return content;
  }

  private async generateDailySummary(totals: NutritionData): Promise<string> {
    const goals = this.settings.nutritionGoals;
    
    let summary = '## 📊 Daily Summary\n\n';
    
    // Beautiful summary cards
    summary += `### 🎯 Totals vs Goals\n\n`;
    summary += `| Nutrient | Current | Goal | Progress |\n`;
    summary += `|----------|---------|------|----------|\n`;
    summary += `| 🔥 Calories | **${Math.round(totals.calories)}** kcal | ${goals.calories} kcal | ${this.getProgressBar(totals.calories, goals.calories)} **${this.calculatePercentage(totals.calories, goals.calories)}%** |\n`;
    summary += `| 💪 Protein | **${Math.round(totals.protein)}g** | ${goals.protein}g | ${this.getProgressBar(totals.protein, goals.protein)} **${this.calculatePercentage(totals.protein, goals.protein)}%** |\n`;
    summary += `| 🌾 Carbs | **${Math.round(totals.carbs)}g** | ${goals.carbs}g | ${this.getProgressBar(totals.carbs, goals.carbs)} **${this.calculatePercentage(totals.carbs, goals.carbs)}%** |\n`;
    summary += `| 🥑 Fat | **${Math.round(totals.fat)}g** | ${goals.fat}g | ${this.getProgressBar(totals.fat, goals.fat)} **${this.calculatePercentage(totals.fat, goals.fat)}%** |\n\n`;
    
    // Overall status
    const overallProgress = Math.round((
      this.calculatePercentage(totals.calories, goals.calories) +
      this.calculatePercentage(totals.protein, goals.protein) +
      this.calculatePercentage(totals.carbs, goals.carbs) +
      this.calculatePercentage(totals.fat, goals.fat)
    ) / 4);
    
    summary += `### ${this.getOverallStatusEmoji(overallProgress)} Overall Progress: ${overallProgress}%\n\n`;
    
    summary += `---\n`;
    summary += `*✨ Generated by Nutrition Tracker Plugin*\n`;
    
    return summary;
  }

  private async recalculateTotals(content: string): Promise<string> {
    // Extract all nutrition values from the content
    const foodItems = this.extractFoodItemsFromContent(content);
    const totals = this.calculateTotals(foodItems);
    
    // Generate the new summary
    const newSummary = await this.generateDailySummary(totals);
    
    // Check if there's already a summary to replace
    const summaryRegex = /## 📊 Daily Summary[\s\S]*$/;
    if (summaryRegex.test(content)) {
      // Replace existing summary
      return content.replace(summaryRegex, newSummary.trim());
    } else {
      // Add new summary at the end
      return content + '\n' + newSummary.trim();
    }
  }

  private extractFoodItemsFromContent(content: string): FoodItem[] {
    const items: FoodItem[] = [];
    // Updated regex to match the new format with emojis and blockquotes
    const itemRegex = /### (?:🍽️|[^\s]+)\s(.+?)\n\n[\s\S]*?> \*\*(.+?)\*\*[\s\S]*?> 🔥 \*\*([\d.]+)\*\* kcal[\s\S]*?💪 \*\*([\d.]+)g\*\* protein[\s\S]*?🌾 \*\*([\d.]+)g\*\* carbs[\s\S]*?🥑 \*\*([\d.]+)g\*\* fat/g;
    
    let match;
    while ((match = itemRegex.exec(content)) !== null) {
      items.push({
        food: match[1],
        quantity: match[2],
        calories: parseFloat(match[3]),
        protein: parseFloat(match[4]),
        carbs: parseFloat(match[5]),
        fat: parseFloat(match[6])
      });
    }
    
    return items;
  }

  private calculateTotals(foodItems: FoodItem[]): NutritionData {
    return foodItems.reduce((totals, item) => ({
      calories: totals.calories + (item.calories || 0),
      protein: totals.protein + (item.protein || 0),
      carbs: totals.carbs + (item.carbs || 0),
      fat: totals.fat + (item.fat || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }

  private calculatePercentage(current: number, goal: number): number {
    if (goal === 0) return 0;
    return Math.round((current / goal) * 100);
  }

  private getTodayString(): string {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  private async ensureDirectoryExists(path: string): Promise<void> {
    const dirs = path.split('/');
    let currentPath = '';
    
    for (const dir of dirs) {
      currentPath = currentPath ? `${currentPath}/${dir}` : dir;
      
      const exists = this.vault.getAbstractFileByPath(currentPath);
      if (!exists) {
        await this.vault.createFolder(currentPath);
      }
    }
  }

  async saveImage(imageFile: File): Promise<string> {
    try {
      await this.ensureDirectoryExists(this.settings.imageStoragePath);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const extension = imageFile.name.split('.').pop() || 'jpg';
      const filename = `food-image-${timestamp}.${extension}`;
      const imagePath = `${this.settings.imageStoragePath}/${filename}`;
      
      // Convert File to ArrayBuffer
      const arrayBuffer = await imageFile.arrayBuffer();
      await this.vault.createBinary(imagePath, arrayBuffer);
      
      return imagePath;
    } catch (error) {
      console.error('Error saving image:', error);
      throw new Error(`Failed to save image: ${error.message}`);
    }
  }

  private getFoodEmoji(foodName: string): string {
    const food = foodName.toLowerCase();
    
    // Fruits
    if (food.includes('apple')) return '🍎';
    if (food.includes('banana')) return '🍌';
    if (food.includes('orange')) return '🍊';
    if (food.includes('strawberry') || food.includes('berry')) return '🍓';
    if (food.includes('grape')) return '🍇';
    if (food.includes('watermelon') || food.includes('melon')) return '🍉';
    if (food.includes('pineapple')) return '🍍';
    if (food.includes('mango')) return '🥭';
    if (food.includes('peach')) return '🍑';
    if (food.includes('cherry')) return '🍒';
    
    // Vegetables
    if (food.includes('tomato')) return '🍅';
    if (food.includes('eggplant')) return '🍆';
    if (food.includes('avocado')) return '🥑';
    if (food.includes('broccoli')) return '🥦';
    if (food.includes('cucumber')) return '🥒';
    if (food.includes('pepper') || food.includes('bell pepper')) return '🫑';
    if (food.includes('carrot')) return '🥕';
    if (food.includes('corn')) return '🌽';
    if (food.includes('lettuce') || food.includes('leafy') || food.includes('salad')) return '🥬';
    if (food.includes('spinach')) return '🥬';
    if (food.includes('potato')) return '🥔';
    if (food.includes('onion')) return '🧅';
    if (food.includes('garlic')) return '🧄';
    
    // Grains & Bread
    if (food.includes('bread') || food.includes('toast')) return '🍞';
    if (food.includes('rice')) return '🍚';
    if (food.includes('pasta') || food.includes('spaghetti') || food.includes('noodle')) return '🍝';
    if (food.includes('pizza')) return '🍕';
    if (food.includes('bagel')) return '🥯';
    if (food.includes('pretzel')) return '🥨';
    if (food.includes('croissant')) return '🥐';
    if (food.includes('waffle')) return '🧇';
    if (food.includes('pancake')) return '🥞';
    if (food.includes('cereal') || food.includes('oatmeal') || food.includes('oats')) return '🥣';
    
    // Proteins
    if (food.includes('chicken')) return '🍗';
    if (food.includes('meat') || food.includes('steak') || food.includes('beef')) return '🥩';
    if (food.includes('bacon')) return '🥓';
    if (food.includes('fish') || food.includes('salmon') || food.includes('tuna')) return '🐟';
    if (food.includes('shrimp') || food.includes('prawn')) return '🍤';
    if (food.includes('egg')) return '🥚';
    if (food.includes('cheese')) return '🧀';
    
    // Dairy & Drinks
    if (food.includes('milk')) return '🥛';
    if (food.includes('yogurt') || food.includes('yoghurt')) return '🍦';
    if (food.includes('coffee')) return '☕';
    if (food.includes('tea')) return '🍵';
    if (food.includes('water')) return '💧';
    if (food.includes('juice')) return '🧃';
    if (food.includes('smoothie')) return '🥤';
    
    // Snacks & Sweets
    if (food.includes('chocolate') || food.includes('cocoa')) return '🍫';
    if (food.includes('cookie') || food.includes('biscuit')) return '🍪';
    if (food.includes('cake')) return '🍰';
    if (food.includes('donut') || food.includes('doughnut')) return '🍩';
    if (food.includes('ice cream')) return '🍨';
    if (food.includes('candy')) return '🍬';
    if (food.includes('honey')) return '🍯';
    
    // Nuts & Seeds
    if (food.includes('nut') || food.includes('almond') || food.includes('walnut')) return '🥜';
    if (food.includes('coconut')) return '🥥';
    
    // Legumes
    if (food.includes('bean') || food.includes('lentil')) return '🫘';
    
    // Prepared foods
    if (food.includes('soup')) return '🍲';
    if (food.includes('stew')) return '🍲';
    if (food.includes('curry')) return '🍛';
    if (food.includes('sandwich') || food.includes('burger')) return '🥪';
    if (food.includes('taco')) return '🌮';
    if (food.includes('burrito')) return '🌯';
    if (food.includes('sushi')) return '🍣';
    if (food.includes('ramen')) return '🍜';
    
    // Supplements
    if (food.includes('protein powder') || food.includes('whey')) return '🥤';
    if (food.includes('vitamin') || food.includes('supplement')) return '💊';
    
    // Default
    return '🍽️';
  }

  private getProgressBar(current: number, goal: number): string {
    const percentage = this.calculatePercentage(current, goal);
    const filledBlocks = Math.min(10, Math.round(percentage / 10));
    const emptyBlocks = 10 - filledBlocks;
    
    let bar = '';
    
    // Use different colors based on progress
    if (percentage >= 100) {
      bar = '🟢'.repeat(filledBlocks) + '⚪'.repeat(emptyBlocks);
    } else if (percentage >= 80) {
      bar = '🟡'.repeat(filledBlocks) + '⚪'.repeat(emptyBlocks);
    } else if (percentage >= 50) {
      bar = '🟠'.repeat(filledBlocks) + '⚪'.repeat(emptyBlocks);
    } else {
      bar = '🔴'.repeat(filledBlocks) + '⚪'.repeat(emptyBlocks);
    }
    
    return bar;
  }

  private getOverallStatusEmoji(percentage: number): string {
    if (percentage >= 90) return '🎉';
    if (percentage >= 80) return '🔥';
    if (percentage >= 70) return '💪';
    if (percentage >= 60) return '📈';
    if (percentage >= 50) return '⚡';
    if (percentage >= 30) return '🌱';
    return '🏃‍♂️';
  }
} 