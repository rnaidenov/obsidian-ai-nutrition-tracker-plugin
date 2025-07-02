import { TFile, Vault, Notice } from 'obsidian';
import { FoodItem, NutritionData } from '../types/nutrition';
import { PluginSettings } from '../types/settings';

export class FileService {
  constructor(private vault: Vault, private settings: PluginSettings) {}

  async createOrUpdateFoodLog(foodItems: FoodItem[], replaceEntry?: { food: string, quantity: string, calories: number, protein: number, carbs: number, fat: number }): Promise<void> {
    const today = this.getTodayString();
    const logPath = `${this.settings.logStoragePath}/${today}.md`;
    
    try {
      // Ensure the directory exists
      await this.ensureDirectoryExists(this.settings.logStoragePath);
      
      // Check if file already exists
      const existingFile = this.vault.getAbstractFileByPath(logPath);
      
      if (existingFile instanceof TFile) {
        if (replaceEntry) {
          // Replace existing entry
          await this.replaceInExistingLog(existingFile, foodItems, replaceEntry);
        } else {
          // Append to existing file
          await this.appendToExistingLog(existingFile, foodItems);
        }
      } else {
        // Create new file
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

  private async replaceInExistingLog(file: TFile, newFoodItems: FoodItem[], originalEntry: { food: string, quantity: string, calories: number, protein: number, carbs: number, fat: number }): Promise<void> {
    const existingContent = await this.vault.read(file);
    
    // Find and replace the card in its original position
    const replacement = this.replaceCardInPosition(existingContent, originalEntry, newFoodItems);
    if (replacement.success) {
      console.log('Successfully replaced entry in original position');
      // Recalculate totals and update summary
      const finalContent = await this.recalculateTotals(replacement.content);
      await this.vault.modify(file, finalContent);
    } else {
      console.warn('Original entry not found for replacement, falling back to append');
      // Fallback to the old append logic
      await this.appendToExistingLog(file, newFoodItems);
    }
  }

  private replaceCardInPosition(content: string, originalEntry: { food: string, quantity: string, calories: number, protein: number, carbs: number, fat: number }, newFoodItems: FoodItem[]): { success: boolean, content: string } {
    // Find the start of the card using data attributes
    const escapedFood = originalEntry.food.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/"/g, '&quot;');
    const escapedQuantity = originalEntry.quantity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/"/g, '&quot;');
    
    const cardPosition = this.findCardPosition(content, escapedFood, escapedQuantity, originalEntry.calories);
    if (!cardPosition.success) {
      return { success: false, content };
    }
    
    // Generate the new card content
    const newCardContent = this.generateCardLayout(newFoodItems);
    
    // Replace the old card with the new card at the exact position
    const beforeCard = content.substring(0, cardPosition.startIndex);
    const afterCard = content.substring(cardPosition.endIndex);
    
    // Clean up any extra whitespace and insert new card
    const cleanedAfter = afterCard.replace(/^\s*\n\s*/, '\n');
    const updatedContent = beforeCard + newCardContent.trim() + cleanedAfter;
    
    return { success: true, content: updatedContent };
  }

  private findCardPosition(content: string, escapedFood: string, escapedQuantity: string, calories: number): { success: boolean, startIndex: number, endIndex: number } {
    const startPattern = new RegExp(
      `<div[^>]*data-ntr-food="${escapedFood}"[^>]*data-ntr-quantity="${escapedQuantity}"[^>]*data-ntr-calories="${calories}"[^>]*>`,
      'gi'
    );
    
    const startMatch = startPattern.exec(content);
    if (!startMatch) {
      // Try alternative attribute order
      const startPattern2 = new RegExp(
        `<div[^>]*data-ntr-calories="${calories}"[^>]*data-ntr-food="${escapedFood}"[^>]*data-ntr-quantity="${escapedQuantity}"[^>]*>`,
        'gi'
      );
      const startMatch2 = startPattern2.exec(content);
      if (!startMatch2) {
        return { success: false, startIndex: -1, endIndex: -1 };
      }
      const cardBounds = this.findCardBounds(content, startMatch2.index);
      return { success: cardBounds.success, startIndex: startMatch2.index, endIndex: cardBounds.endIndex };
    }
    
    const cardBounds = this.findCardBounds(content, startMatch.index);
    return { success: cardBounds.success, startIndex: startMatch.index, endIndex: cardBounds.endIndex };
  }

  private findCardBounds(content: string, startIndex: number): { success: boolean, endIndex: number } {
    let divCount = 0;
    let i = startIndex;
    
    // Find the opening div
    while (i < content.length && content.charAt(i) !== '>') {
      i++;
    }
    i++; // Move past the >
    divCount = 1;
    
    // Count divs to find the matching closing div
    while (i < content.length && divCount > 0) {
      if (content.substring(i, i + 4) === '<div') {
        divCount++;
        i += 4;
      } else if (content.substring(i, i + 6) === '</div>') {
        divCount--;
        if (divCount === 0) {
          return { success: true, endIndex: i + 6 };
        }
        i += 6;
      } else {
        i++;
      }
    }
    
    return { success: false, endIndex: -1 };
  }

  private findAndReplaceCompleteCard(content: string, originalEntry: { food: string, quantity: string, calories: number, protein: number, carbs: number, fat: number }): { success: boolean, content: string } {
    // Find the start of the card using data attributes
    const escapedFood = originalEntry.food.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/"/g, '&quot;');
    const escapedQuantity = originalEntry.quantity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/"/g, '&quot;');
    
    const startPattern = new RegExp(
      `<div[^>]*data-ntr-food="${escapedFood}"[^>]*data-ntr-quantity="${escapedQuantity}"[^>]*data-ntr-calories="${originalEntry.calories}"[^>]*>`,
      'gi'
    );
    
    const startMatch = startPattern.exec(content);
    if (!startMatch) {
      // Try alternative attribute order
      const startPattern2 = new RegExp(
        `<div[^>]*data-ntr-calories="${originalEntry.calories}"[^>]*data-ntr-food="${escapedFood}"[^>]*data-ntr-quantity="${escapedQuantity}"[^>]*>`,
        'gi'
      );
      const startMatch2 = startPattern2.exec(content);
      if (!startMatch2) {
        return { success: false, content };
      }
      return this.extractCompleteCard(content, startMatch2.index);
    }
    
    return this.extractCompleteCard(content, startMatch.index);
  }

  private extractCompleteCard(content: string, startIndex: number): { success: boolean, content: string } {
    let divCount = 0;
    let i = startIndex;
    let cardStart = startIndex;
    let cardEnd = -1;
    
    // Find the opening div
    while (i < content.length && content.charAt(i) !== '>') {
      i++;
    }
    i++; // Move past the >
    divCount = 1;
    
    // Count divs to find the matching closing div
    while (i < content.length && divCount > 0) {
      if (content.substring(i, i + 4) === '<div') {
        divCount++;
        i += 4;
      } else if (content.substring(i, i + 6) === '</div>') {
        divCount--;
        if (divCount === 0) {
          cardEnd = i + 6;
          break;
        }
        i += 6;
      } else {
        i++;
      }
    }
    
    if (cardEnd === -1) {
      return { success: false, content };
    }
    
    // Extract the complete card and remove it
    const beforeCard = content.substring(0, cardStart);
    const afterCard = content.substring(cardEnd);
    
    // Clean up any extra whitespace/newlines
    const cleanedContent = beforeCard + afterCard.replace(/^\s*\n\s*/, '\n');
    
    return { success: true, content: cleanedContent };
  }

  private async generateFoodLogContent(foodItems: FoodItem[], isNewFile: boolean): Promise<string> {
    const today = this.getTodayString();
    const totals = this.calculateTotals(foodItems);
    
    let content = '';
    
    if (isNewFile) {
      content += `# 🍽️ Food Log ${today}\n\n`;
      content += `## 🥗 Today's Meals\n\n`;
    }
    
    // Generate food items based on layout style
    if (this.settings.layoutStyle === 'cards') {
      content += this.generateCardLayout(foodItems);
    } else {
      content += this.generateSimpleLayout(foodItems);
    }
    
    if (isNewFile) {
      content += await this.generateDailySummary(totals);
    }
    
    return content;
  }

  private generateCardLayout(foodItems: FoodItem[]): string {
    let content = '';
    const isDarkTheme = this.getEffectiveTheme() === 'dark';
    
    for (const item of foodItems) {
      const emoji = this.getFoodEmoji(item.food);
      const timeStr = item.timestamp ? 
        new Date(item.timestamp).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }) : '';
      
      if (isDarkTheme) {
        // Sleek dark theme card
        const entryId = `ntr-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        content += `\n<div id="${entryId}" data-ntr-food="${item.food.replace(/"/g, '&quot;')}" data-ntr-quantity="${item.quantity.replace(/"/g, '&quot;')}" data-ntr-calories="${item.calories}" style="background: linear-gradient(135deg, #1e293b, #334155); border-radius: 12px; padding: 14px; margin: 10px 0; box-shadow: 0 4px 20px rgba(0,0,0,0.4); border: 1px solid rgba(148,163,184,0.1); position: relative;">\n`;
        content += `  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">\n`;
        content += `    <div style="display: flex; align-items: center;">\n`;
        content += `      <span style="font-size: 20px; margin-right: 10px;">${emoji}</span>\n`;
        content += `      <div>\n`;
        content += `        <h3 style="color: #f8fafc; margin: 0; font-size: 16px; font-weight: 600;">${item.food}</h3>\n`;
        content += `        <div style="color: #94a3b8; font-size: 12px; margin-top: 2px;">📏 ${item.quantity}</div>\n`;
        content += `      </div>\n`;
        content += `    </div>\n`;
        if (timeStr) {
          content += `    <div style="position: absolute; top: 8px; right: 10px; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 6px; font-size: 10px; color: #cbd5e1;">🕐 ${timeStr}</div>\n`;
        }
        content += `    <button class="nutrition-edit-btn" data-food="${item.food.replace(/"/g, '&quot;')}" data-quantity="${item.quantity.replace(/"/g, '&quot;')}" data-calories="${item.calories}" data-protein="${item.protein}" data-carbs="${item.carbs}" data-fat="${item.fat}" style="background: rgba(148,163,184,0.1); border: 1px solid rgba(148,163,184,0.2); border-radius: 6px; padding: 4px 8px; color: #cbd5e1; font-size: 10px; cursor: pointer; margin-left: 8px;">✏️ Edit</button>\n`;
        content += `  </div>\n`;
        content += `  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">\n`;
        content += `    <div style="text-align: center; padding: 8px; background: rgba(239, 68, 68, 0.12); border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.25);">\n`;
        content += `      <div style="font-size: 16px; margin-bottom: 2px;">🔥</div>\n`;
        content += `      <div style="color: #fecaca; font-weight: bold; font-size: 14px;">${item.calories}</div>\n`;
        content += `      <div style="color: #f87171; font-size: 9px; text-transform: uppercase; font-weight: 500;">kcal</div>\n`;
        content += `    </div>\n`;
        content += `    <div style="text-align: center; padding: 8px; background: rgba(34, 197, 94, 0.12); border-radius: 8px; border: 1px solid rgba(34, 197, 94, 0.25);">\n`;
        content += `      <div style="font-size: 16px; margin-bottom: 2px;">💪</div>\n`;
        content += `      <div style="color: #bbf7d0; font-weight: bold; font-size: 14px;">${item.protein}g</div>\n`;
        content += `      <div style="color: #86efac; font-size: 9px; text-transform: uppercase; font-weight: 500;">protein</div>\n`;
        content += `    </div>\n`;
        content += `    <div style="text-align: center; padding: 8px; background: rgba(251, 191, 36, 0.12); border-radius: 8px; border: 1px solid rgba(251, 191, 36, 0.25);">\n`;
        content += `      <div style="font-size: 16px; margin-bottom: 2px;">🌾</div>\n`;
        content += `      <div style="color: #fde68a; font-weight: bold; font-size: 14px;">${item.carbs}g</div>\n`;
        content += `      <div style="color: #fbbf24; font-size: 9px; text-transform: uppercase; font-weight: 500;">carbs</div>\n`;
        content += `    </div>\n`;
        content += `    <div style="text-align: center; padding: 8px; background: rgba(168, 85, 247, 0.12); border-radius: 8px; border: 1px solid rgba(168, 85, 247, 0.25);">\n`;
        content += `      <div style="font-size: 16px; margin-bottom: 2px;">🥑</div>\n`;
        content += `      <div style="color: #ddd6fe; font-weight: bold; font-size: 14px;">${item.fat}g</div>\n`;
        content += `      <div style="color: #c4b5fd; font-size: 9px; text-transform: uppercase; font-weight: 500;">fat</div>\n`;
        content += `    </div>\n`;
        content += `  </div>\n`;
        content += `</div>\n\n`;
      } else {
        // Sleek light theme card
        const entryId = `ntr-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        content += `\n<div id="${entryId}" data-ntr-food="${item.food.replace(/"/g, '&quot;')}" data-ntr-quantity="${item.quantity.replace(/"/g, '&quot;')}" data-ntr-calories="${item.calories}" style="background: linear-gradient(135deg, #ffffff, #f8fafc); border-radius: 12px; padding: 14px; margin: 10px 0; box-shadow: 0 2px 16px rgba(0,0,0,0.06); border: 1px solid rgba(203,213,225,0.3); position: relative;">\n`;
        content += `  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">\n`;
        content += `    <div style="display: flex; align-items: center;">\n`;
        content += `      <span style="font-size: 20px; margin-right: 10px;">${emoji}</span>\n`;
        content += `      <div>\n`;
        content += `        <h3 style="color: #0f172a; margin: 0; font-size: 16px; font-weight: 600;">${item.food}</h3>\n`;
        content += `        <div style="color: #64748b; font-size: 12px; margin-top: 2px;">📏 ${item.quantity}</div>\n`;
        content += `      </div>\n`;
        content += `    </div>\n`;
        if (timeStr) {
          content += `    <div style="position: absolute; top: 8px; right: 10px; background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 6px; font-size: 10px; color: #64748b;">🕐 ${timeStr}</div>\n`;
        }
        content += `    <button class="nutrition-edit-btn" data-food="${item.food.replace(/"/g, '&quot;')}" data-quantity="${item.quantity.replace(/"/g, '&quot;')}" data-calories="${item.calories}" data-protein="${item.protein}" data-carbs="${item.carbs}" data-fat="${item.fat}" style="background: rgba(100,116,139,0.1); border: 1px solid rgba(203,213,225,0.4); border-radius: 6px; padding: 4px 8px; color: #475569; font-size: 10px; cursor: pointer; margin-left: 8px;">✏️ Edit</button>\n`;
        content += `  </div>\n`;
        content += `  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">\n`;
        content += `    <div style="text-align: center; padding: 8px; background: linear-gradient(135deg, #fee2e2, #fecaca); border-radius: 8px; border: 1px solid #fca5a5; box-shadow: 0 1px 6px rgba(239, 68, 68, 0.08);">\n`;
        content += `      <div style="font-size: 16px; margin-bottom: 2px;">🔥</div>\n`;
        content += `      <div style="color: #dc2626; font-weight: bold; font-size: 14px;">${item.calories}</div>\n`;
        content += `      <div style="color: #ef4444; font-size: 9px; text-transform: uppercase; font-weight: 600;">KCAL</div>\n`;
        content += `    </div>\n`;
        content += `    <div style="text-align: center; padding: 8px; background: linear-gradient(135deg, #dcfce7, #bbf7d0); border-radius: 8px; border: 1px solid #86efac; box-shadow: 0 1px 6px rgba(34, 197, 94, 0.08);">\n`;
        content += `      <div style="font-size: 16px; margin-bottom: 2px;">💪</div>\n`;
        content += `      <div style="color: #16a34a; font-weight: bold; font-size: 14px;">${item.protein}g</div>\n`;
        content += `      <div style="color: #22c55e; font-size: 9px; text-transform: uppercase; font-weight: 600;">PROTEIN</div>\n`;
        content += `    </div>\n`;
        content += `    <div style="text-align: center; padding: 8px; background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 8px; border: 1px solid #fcd34d; box-shadow: 0 1px 6px rgba(251, 191, 36, 0.08);">\n`;
        content += `      <div style="font-size: 16px; margin-bottom: 2px;">🌾</div>\n`;
        content += `      <div style="color: #d97706; font-weight: bold; font-size: 14px;">${item.carbs}g</div>\n`;
        content += `      <div style="color: #f59e0b; font-size: 9px; text-transform: uppercase; font-weight: 600;">CARBS</div>\n`;
        content += `    </div>\n`;
        content += `    <div style="text-align: center; padding: 8px; background: linear-gradient(135deg, #ede9fe, #ddd6fe); border-radius: 8px; border: 1px solid #c4b5fd; box-shadow: 0 1px 6px rgba(168, 85, 247, 0.08);">\n`;
        content += `      <div style="font-size: 16px; margin-bottom: 2px;">🥑</div>\n`;
        content += `      <div style="color: #7c3aed; font-weight: bold; font-size: 14px;">${item.fat}g</div>\n`;
        content += `      <div style="color: #8b5cf6; font-size: 9px; text-transform: uppercase; font-weight: 600;">FAT</div>\n`;
        content += `    </div>\n`;
        content += `  </div>\n`;
        content += `</div>\n\n`;
      }
    }
    
    return content;
  }

  private getEffectiveTheme(): 'light' | 'dark' {
    if (this.settings.displayTheme === 'auto') {
      // Auto-detect Obsidian's theme
      return document.body.classList.contains('theme-dark') ? 'dark' : 'light';
    }
    return this.settings.displayTheme as 'light' | 'dark';
  }

  private generateSimpleLayout(foodItems: FoodItem[]): string {
    let content = '';
    
    for (const item of foodItems) {
      const emoji = this.getFoodEmoji(item.food);
      const entryId = `entry-${item.food.replace(/[^a-zA-Z0-9]/g, '-')}-${item.quantity.replace(/[^a-zA-Z0-9]/g, '-')}-${item.calories}`;
      
      content += `<div id="${entryId}" class="nutrition-food-entry-simple ${entryId}" data-food="${item.food.replace(/"/g, '&quot;')}" data-quantity="${item.quantity.replace(/"/g, '&quot;')}" data-calories="${item.calories}" data-protein="${item.protein}" data-carbs="${item.carbs}" data-fat="${item.fat}">\n\n`;
      content += `### ${emoji} ${item.food}\n\n`;
      
      content += `**${item.quantity}**`;
      if (item.timestamp) {
        const time = new Date(item.timestamp).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        content += ` ・ 🕐 ${time}`;
      }
      content += `\n\n`;
      
      content += `🔥 ${item.calories} kcal ・ `;
      content += `💪 ${item.protein}g protein ・ `;
      content += `🌾 ${item.carbs}g carbs ・ `;
      content += `🥑 ${item.fat}g fat\n\n`;
      
      content += `---\n\n`;
      content += `</div>\n\n`;
    }
    
    return content;
  }

  private async generateDailySummary(totals: NutritionData): Promise<string> {
    const goals = this.settings.nutritionGoals;
    
    let summary = '## 📊 Daily Summary\n\n';
    
    // Beautiful summary cards
    summary += `### 🎯 Totals vs Goals\n\n`;
    
    if (this.settings.progressBarStyle === 'percentage-only') {
      // Simple percentage table
      summary += `| Nutrient | Current | Goal | Progress |\n`;
      summary += `|----------|---------|------|----------|\n`;
      summary += `| 🔥 Calories | **${Math.round(totals.calories)}** kcal | ${goals.calories} kcal | **${this.calculatePercentage(totals.calories, goals.calories)}%** |\n`;
      summary += `| 💪 Protein | **${Math.round(totals.protein)}g** | ${goals.protein}g | **${this.calculatePercentage(totals.protein, goals.protein)}%** |\n`;
      summary += `| 🌾 Carbs | **${Math.round(totals.carbs)}g** | ${goals.carbs}g | **${this.calculatePercentage(totals.carbs, goals.carbs)}%** |\n`;
      summary += `| 🥑 Fat | **${Math.round(totals.fat)}g** | ${goals.fat}g | **${this.calculatePercentage(totals.fat, goals.fat)}%** |\n\n`;
    } else if (this.settings.progressBarStyle === 'modern-bars') {
      // Modern HTML progress bars
      summary += this.generateModernProgressBars(totals, goals);
    } else {
      // Default emoji dots
      summary += `| Nutrient | Current | Goal | Progress |\n`;
      summary += `|----------|---------|------|----------|\n`;
      summary += `| 🔥 Calories | **${Math.round(totals.calories)}** kcal | ${goals.calories} kcal | ${this.getProgressBar(totals.calories, goals.calories)} **${this.calculatePercentage(totals.calories, goals.calories)}%** |\n`;
      summary += `| 💪 Protein | **${Math.round(totals.protein)}g** | ${goals.protein}g | ${this.getProgressBar(totals.protein, goals.protein)} **${this.calculatePercentage(totals.protein, goals.protein)}%** |\n`;
      summary += `| 🌾 Carbs | **${Math.round(totals.carbs)}g** | ${goals.carbs}g | ${this.getProgressBar(totals.carbs, goals.carbs)} **${this.calculatePercentage(totals.carbs, goals.carbs)}%** |\n`;
      summary += `| 🥑 Fat | **${Math.round(totals.fat)}g** | ${goals.fat}g | ${this.getProgressBar(totals.fat, goals.fat)} **${this.calculatePercentage(totals.fat, goals.fat)}%** |\n\n`;
    }
    
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

  private generateModernProgressBars(totals: NutritionData, goals: any): string {
    let content = '';
    
    const nutrients = [
      { name: 'Calories', emoji: '🔥', current: totals.calories, goal: goals.calories, unit: 'kcal' },
      { name: 'Protein', emoji: '💪', current: totals.protein, goal: goals.protein, unit: 'g' },
      { name: 'Carbs', emoji: '🌾', current: totals.carbs, goal: goals.carbs, unit: 'g' },
      { name: 'Fat', emoji: '🥑', current: totals.fat, goal: goals.fat, unit: 'g' }
    ];
    
    for (const nutrient of nutrients) {
      const percentage = this.calculatePercentage(nutrient.current, nutrient.goal);
      const color = this.getProgressColor(percentage);
      
      content += `**${nutrient.emoji} ${nutrient.name}**: ${Math.round(nutrient.current)} / ${nutrient.goal} ${nutrient.unit} (${percentage}%)\n`;
      content += `<div style="width: 100%; background-color: #f0f0f0; border-radius: 10px; height: 20px; margin: 5px 0 15px 0;">\n`;
      content += `  <div style="width: ${Math.min(percentage, 100)}%; background-color: ${color}; height: 100%; border-radius: 10px; transition: width 0.3s ease;"></div>\n`;
      content += `</div>\n\n`;
    }
    
    return content;
  }

  private getProgressColor(percentage: number): string {
    if (percentage >= 100) return '#22c55e'; // Green
    if (percentage >= 80) return '#eab308';  // Yellow
    if (percentage >= 50) return '#f97316';  // Orange
    return '#ef4444'; // Red
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
    
    // Extract from data attributes (most reliable)
    const dataAttributeRegex = /<div[^>]*data-ntr-food="([^"]*)"[^>]*data-ntr-quantity="([^"]*)"[^>]*data-ntr-calories="([\d.]+)"[^>]*>/g;
    
    // Extract from old HTML card layouts (fallback)
    const htmlCardRegex = /<div style="background: linear-gradient\(135deg,[^"]+\)"[\s\S]*?<h3[^>]*>([^<]+)<\/h3>[\s\S]*?📏 ([^<]+)[\s\S]*?<div style="color: [^"]+; font-weight: bold; font-size: 14px;">([\d.]+)<\/div>[\s\S]*?<div style="color: [^"]+; font-weight: bold; font-size: 14px;">([\d.]+)g<\/div>[\s\S]*?<div style="color: [^"]+; font-weight: bold; font-size: 14px;">([\d.]+)g<\/div>[\s\S]*?<div style="color: [^"]+; font-weight: bold; font-size: 14px;">([\d.]+)g<\/div>/g;
    
    // Try extracting from simple layout
    const simpleRegex = /### (?:[^\s]+\s)?(.+?)\n\n\*\*(.+?)\*\*[\s\S]*?🔥 ([\d.]+) kcal[\s\S]*?💪 ([\d.]+)g protein[\s\S]*?🌾 ([\d.]+)g carbs[\s\S]*?🥑 ([\d.]+)g fat/g;
    
    // Try data attributes first (most reliable)
    let match;
    while ((match = dataAttributeRegex.exec(content)) !== null) {
      // For items with data attributes, we need to extract nutrition from the visual content
      const food = match[1].replace(/&quot;/g, '"');
      const quantity = match[2].replace(/&quot;/g, '"');
      const calories = parseFloat(match[3]);
      
      // Find the corresponding nutrition values in the visual content
      const entryStart = match.index;
      const entryEndMatch = content.indexOf('</div>', entryStart);
      const entryContent = content.substring(entryStart, entryEndMatch);
      
      // Extract nutrition from the card content
      const proteinMatch = entryContent.match(/>(\d+(?:\.\d+)?)g<\/div>[\s\S]*?PROTEIN/i);
      const carbsMatch = entryContent.match(/>(\d+(?:\.\d+)?)g<\/div>[\s\S]*?CARBS/i);
      const fatMatch = entryContent.match(/>(\d+(?:\.\d+)?)g<\/div>[\s\S]*?FAT/i);
      
      items.push({
        food,
        quantity,
        calories,
        protein: proteinMatch ? parseFloat(proteinMatch[1]) : 0,
        carbs: carbsMatch ? parseFloat(carbsMatch[1]) : 0,
        fat: fatMatch ? parseFloat(fatMatch[1]) : 0
      });
    }
    
    // If no data attribute entries found, try HTML card pattern
    if (items.length === 0) {
      while ((match = htmlCardRegex.exec(content)) !== null) {
        items.push({
          food: match[1].trim(),
          quantity: match[2].trim(),
          calories: parseFloat(match[3]),
          protein: parseFloat(match[4]),
          carbs: parseFloat(match[5]),
          fat: parseFloat(match[6])
        });
      }
    }
    
    // If still no items found, try simple layout
    if (items.length === 0) {
      while ((match = simpleRegex.exec(content)) !== null) {
        items.push({
          food: match[1],
          quantity: match[2],
          calories: parseFloat(match[3]),
          protein: parseFloat(match[4]),
          carbs: parseFloat(match[5]),
          fat: parseFloat(match[6])
        });
      }
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