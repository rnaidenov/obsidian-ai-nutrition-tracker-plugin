import { TFile, Vault, Notice } from 'obsidian';
import { FoodItem, NutritionData } from '../types/nutrition';
import { PluginSettings } from '../types/settings';
import { FileUtils } from './file-utils';
import { LayoutGenerator } from './layout-generator';
import { ContentParser } from './content-parser';

export class FoodLogManager {
  private fileUtils: FileUtils;
  private layoutGenerator: LayoutGenerator;
  private contentParser: ContentParser;

  constructor(private vault: Vault, private settings: PluginSettings) {
    this.fileUtils = new FileUtils(vault);
    this.layoutGenerator = new LayoutGenerator(settings);
    this.contentParser = new ContentParser();
  }

  async createOrUpdateFoodLog(foodItems: FoodItem[], replaceEntry?: { food: string, quantity: string, calories: number, protein: number, carbs: number, fat: number }): Promise<void> {
    const today = this.fileUtils.getTodayString();
    const logPath = `${this.settings.logStoragePath}/${today}.md`;
    
    try {
      // Ensure the directory exists
      await this.fileUtils.ensureDirectoryExists(this.settings.logStoragePath);
      
      const existingFile = this.vault.getAbstractFileByPath(logPath);
      
      if (existingFile instanceof TFile) {
        if (replaceEntry) {
          await this.replaceInExistingLog(existingFile, foodItems, replaceEntry);
        } else {
          await this.appendToExistingLog(existingFile, foodItems);
        }
      } else {
        await this.createNewFoodLog(logPath, foodItems);
      }
      
      if (replaceEntry) {
        new Notice(`✏️ Food entry replaced in: ${today}.md`);
      } else {
        new Notice(`Food log updated: ${today}.md`);
      }
    } catch (error) {
      console.error('Error creating/updating food log:', error);
      throw new Error(`Failed to save food log: ${error.message}`);
    }
  }

  async deleteFoodLogItem(itemToDelete: { food: string, quantity: string, calories: number, protein: number, carbs: number, fat: number }): Promise<void> {
    const today = this.fileUtils.getTodayString();
    const logPath = `${this.settings.logStoragePath}/${today}.md`;
    
    try {
      const existingFile = this.vault.getAbstractFileByPath(logPath);
      
      if (!(existingFile instanceof TFile)) {
        throw new Error('Food log file not found for today');
      }
      
      const existingContent = await this.vault.read(existingFile);
      
      const deleteResult = this.contentParser.deleteCardFromContent(existingContent, itemToDelete);
      if (deleteResult.success) {
        const finalContent = await this.recalculateTotals(deleteResult.content);
        await this.vault.modify(existingFile, finalContent);
      } else {
        throw new Error('Item not found in food log');
      }
    } catch (error) {
      console.error('Error deleting food log item:', error);
      throw new Error(`Failed to delete food log item: ${error.message}`);
    }
  }

  private async createNewFoodLog(path: string, foodItems: FoodItem[]): Promise<void> {
    const content = await this.generateFoodLogContent(foodItems, true);
    
    // Add CTA buttons before the daily summary section
    const ctaButtons = this.layoutGenerator.generateCTAButtons('foodlog');
    let contentWithCTA;
    
    if (content.includes('## 📊 Daily Summary')) {
      contentWithCTA = content.replace(
        /(## 📊 Daily Summary)/,
        `${ctaButtons.trim()}\n\n$1`
      );
    } else {
      // Fallback: add CTA buttons before the footer
      contentWithCTA = content.replace(
        /(\n\n---\n\n\*✨ Generated by AI Nutrition Tracker Plugin\*\n)$/,
        `\n${ctaButtons.trim()}\n$1`
      );
    }
    
    await this.vault.create(path, contentWithCTA);
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
      
      // Recalculate totals (this will add the CTA buttons before the new summary)
      const finalContent = await this.recalculateTotals(updatedContent);
      await this.vault.modify(file, finalContent);
    } else {
      // No summary found, just append new entries
      const updatedContent = existingContent + '\n' + newEntries;
      const allFoodItems = this.contentParser.extractFoodItemsFromContent(updatedContent);
      const totals = this.contentParser.calculateTotals(allFoodItems);
      const summary = await this.layoutGenerator.generateDailySummary(totals);
      const ctaButtons = this.layoutGenerator.generateCTAButtons('foodlog');
      const finalContent = updatedContent + '\n' + ctaButtons.trim() + '\n\n' + summary + '\n\n---\n\n*✨ Generated by AI Nutrition Tracker Plugin*\n';
      await this.vault.modify(file, finalContent);
    }
  }

  private async replaceInExistingLog(file: TFile, newFoodItems: FoodItem[], originalEntry: { food: string, quantity: string, calories: number, protein: number, carbs: number, fat: number }): Promise<void> {
    const existingContent = await this.vault.read(file);
    
    const newCardContent = this.layoutGenerator.generateCardLayout(newFoodItems);
    const replacement = this.contentParser.replaceCardInPosition(existingContent, originalEntry, newCardContent);
    
    if (replacement.success) {
      const finalContent = await this.recalculateTotals(replacement.content);
      await this.vault.modify(file, finalContent);
    } else {
      await this.appendToExistingLog(file, newFoodItems);
    }
  }

  private async generateFoodLogContent(foodItems: FoodItem[], isNewFile: boolean): Promise<string> {
    const today = this.fileUtils.getTodayString();
    const totals = this.contentParser.calculateTotals(foodItems);
    
    let content = '';
    
    if (isNewFile) {
      content += `# 🍽️ Food Log ${today}\n\n`;
      content += `## 🥗 Today's Meals\n\n`;
    }
    
    // Generate card layout WITHOUT CTA buttons - they'll be added at the end
    content += this.layoutGenerator.generateCardLayout(foodItems);
    
    if (isNewFile) {
      content += await this.layoutGenerator.generateDailySummary(totals);
      content += '\n\n---\n\n';
      content += '*✨ Generated by AI Nutrition Tracker Plugin*\n';
    }
    
    return content;
  }

  private async recalculateTotals(content: string): Promise<string> {
    const foodItems = this.contentParser.extractFoodItemsFromContent(content);
    const totals = this.contentParser.calculateTotals(foodItems);
    
    const newSummary = await this.layoutGenerator.generateDailySummary(totals);
    
    const ctaButtons = this.layoutGenerator.generateCTAButtons('foodlog');
    
    const ctaRegex = /<div[^>]*>\s*<button[^>]*class="nutrition-add-cta-btn"[^>]*>[\s\S]*?<\/button>\s*<\/div>/g;
    let cleanContent = content.replace(ctaRegex, '');
    
    const summaryRegex = /## 📊 Daily Summary[\s\S]*?(?=\n+---\n\n\*✨ Generated by|$)/;
    const footerRegex = /\n+---\n\n\*✨ Generated by.*?Plugin\*\n*$/;
    
    if (summaryRegex.test(cleanContent)) {
      // Replace existing summary with CTA buttons placed before it
      let updatedContent = cleanContent.replace(summaryRegex, ctaButtons.trim() + '\n\n' + newSummary.trim());
      // Remove any existing footer
      updatedContent = updatedContent.replace(footerRegex, '');
      // Add new footer
      return updatedContent + '\n\n---\n\n*✨ Generated by AI Nutrition Tracker Plugin*\n';
    } else {
      // Add CTA buttons before new summary and footer at the end
      let updatedContent = cleanContent;
      // Remove any existing footer first
      updatedContent = updatedContent.replace(footerRegex, '');
      return updatedContent + '\n' + ctaButtons.trim() + '\n\n' + newSummary.trim() + '\n\n---\n\n*✨ Generated by AI Nutrition Tracker Plugin*\n';
    }
  }
} 