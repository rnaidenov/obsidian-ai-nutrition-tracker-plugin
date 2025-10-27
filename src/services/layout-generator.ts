import { FoodItem, NutritionData } from '../types/nutrition';
import { PluginSettings } from '../types/settings';
import { ThemeUtils } from './theme-utils';
import { ContentParser } from './content-parser';

export class LayoutGenerator {
  private themeUtils: ThemeUtils;
  private contentParser: ContentParser;

  constructor(private settings: PluginSettings) {
    this.themeUtils = new ThemeUtils();
    this.contentParser = new ContentParser();
  }

  generateCardLayout(foodItems: FoodItem[], context?: 'meal' | 'foodlog', mealId?: string): string {
    let content = '';
    
    for (const item of foodItems) {
      const emoji = item.emoji || '🍽️';
      const timeStr = item.timestamp ? 
        new Date(item.timestamp).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }) : '';
      
      const editContext = context || 'foodlog';
      
        const entryId = `ntr-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      content += `\n<div id="${entryId}" class="ntr-food-card" data-ntr-food="${item.food.replace(/"/g, '&quot;')}" data-ntr-quantity="${item.quantity.replace(/"/g, '&quot;')}" data-ntr-calories="${item.calories}" data-ntr-protein="${item.protein}" data-ntr-carbs="${item.carbs}" data-ntr-fat="${item.fat}">\n`;
      content += `  <div class="ntr-food-card-header">\n`;
      content += `    <div class="ntr-food-card-info">\n`;
      content += `      <span class="ntr-food-card-emoji">${emoji}</span>\n`;
      content += `      <div class="ntr-food-card-text">\n`;
      content += `        <h3 class="ntr-food-card-title">${item.food}</h3>\n`;
      content += `        <div class="ntr-food-card-quantity">📏 ${item.quantity}</div>\n`;
        if (timeStr) {
        content += `        <div class="ntr-food-card-timestamp">🕐 ${timeStr}</div>\n`;
        }
        content += `      </div>\n`;
        content += `    </div>\n`;
      content += `    <div class="ntr-food-card-actions">\n`;
      content += `      <button class="nutrition-edit-btn ntr-edit-btn" data-food="${item.food.replace(/"/g, '&quot;')}" data-quantity="${item.quantity.replace(/"/g, '&quot;')}" data-calories="${item.calories}" data-protein="${item.protein}" data-carbs="${item.carbs}" data-fat="${item.fat}" data-edit-context="${editContext}">✏️ Edit</button>\n`;
      content += `      <button class="nutrition-delete-btn ntr-delete-btn" data-food="${item.food.replace(/"/g, '&quot;')}" data-quantity="${item.quantity.replace(/"/g, '&quot;')}" data-calories="${item.calories}" data-protein="${item.protein}" data-carbs="${item.carbs}" data-fat="${item.fat}" data-edit-context="${editContext}" data-entry-id="${entryId}">🗑️ Delete</button>\n`;
        content += `    </div>\n`;
        content += `  </div>\n`;
      
      content += `  <div class="ntr-stats-grid">\n`;
      content += `    <div class="ntr-stat-card ntr-stat-card-calories">\n`;
      content += `      <div class="ntr-stat-emoji ntr-stat-emoji-calories"></div>\n`;
      content += `      <div class="ntr-stat-value">${item.calories}</div>\n`;
      content += `      <div class="ntr-stat-label">kcal</div>\n`;
        content += `    </div>\n`;
      content += `    <div class="ntr-stat-card ntr-stat-card-protein">\n`;
      content += `      <div class="ntr-stat-emoji ntr-stat-emoji-protein"></div>\n`;
      content += `      <div class="ntr-stat-value">${item.protein}g</div>\n`;
      content += `      <div class="ntr-stat-label">protein</div>\n`;
        content += `    </div>\n`;
      content += `    <div class="ntr-stat-card ntr-stat-card-carbs">\n`;
      content += `      <div class="ntr-stat-emoji ntr-stat-emoji-carbs"></div>\n`;
      content += `      <div class="ntr-stat-value">${item.carbs}g</div>\n`;
      content += `      <div class="ntr-stat-label">carbs</div>\n`;
        content += `    </div>\n`;
      content += `    <div class="ntr-stat-card ntr-stat-card-fat">\n`;
      content += `      <div class="ntr-stat-emoji ntr-stat-emoji-fat"></div>\n`;
      content += `      <div class="ntr-stat-value">${item.fat}g</div>\n`;
      content += `      <div class="ntr-stat-label">fat</div>\n`;
        content += `    </div>\n`;
        content += `  </div>\n`;
        content += `</div>\n\n`;
    }
    
    // Add CTA buttons at the end
    if (context) {
      content += this.generateCTAButtons(context, mealId);
    }
    
    return content;
  }

  generateCTAButtons(context: 'meal' | 'foodlog', mealId?: string): string {
    const buttonId = `nutrition-add-cta-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const mealIdAttr = mealId ? ` data-meal-id="${mealId}"` : '';
    
    const buttonText = context === 'meal' ? 
      `➕ Add More Items to Meal` :
      `➕ Add More Items to Food Log`;
    
    const buttonHtml = `<div style="text-align: center; margin: 24px 0 60px; padding: 0px 0;"><button id="${buttonId}" class="nutrition-add-cta-btn" data-context="${context}"${mealIdAttr}>${buttonText}</button></div>`;
    
    return buttonHtml;
  }

  async generateDailySummary(totals: NutritionData): Promise<string> {
    const goals = this.settings.nutritionGoals;
    
    let summary = '';
    
    const overallProgress = Math.round((
      this.contentParser.calculatePercentage(totals.calories, goals.calories) +
      this.contentParser.calculatePercentage(totals.protein, goals.protein) +
      this.contentParser.calculatePercentage(totals.carbs, goals.carbs) +
      this.contentParser.calculatePercentage(totals.fat, goals.fat)
    ) / 4);

    const nutritionRows = this.generateModernProgressBars(totals, goals);
    
    summary += `<div class="ntr-summary-card">
  <h3 class="ntr-summary-title">🎯 Totals vs Goals</h3>
  <div class="ntr-summary-divider"></div>
${nutritionRows}  <div class="ntr-overall-progress">
    <div class="ntr-overall-progress-border">
      <div class="ntr-overall-progress-inner">
        <h3 class="ntr-overall-progress-title">${this.themeUtils.getOverallStatusEmoji(overallProgress)} Overall Progress: ${overallProgress}%</h3>
      </div>
    </div>
  </div>
</div>
`;
    
    return summary;
  }

  generateModernProgressBars(totals: NutritionData, goals: any): string {
    let content = '';
    const isDark = this.themeUtils.getEffectiveTheme() === 'dark';
    
    const nutrients = [
      { name: 'Calories', emojiClass: 'ntr-progress-emoji-calories', current: totals.calories, goal: goals.calories, unit: 'kcal' },
      { name: 'Protein', emojiClass: 'ntr-progress-emoji-protein', current: totals.protein, goal: goals.protein, unit: 'g' },
      { name: 'Carbs', emojiClass: 'ntr-progress-emoji-carbs', current: totals.carbs, goal: goals.carbs, unit: 'g' },
      { name: 'Fat', emojiClass: 'ntr-progress-emoji-fat', current: totals.fat, goal: goals.fat, unit: 'g' }
    ];
    
    for (const nutrient of nutrients) {
      const percentage = this.contentParser.calculatePercentage(nutrient.current, nutrient.goal);
      const { gradient, textColor, borderColor } = this.themeUtils.getProgressGradient(percentage, isDark);
      
      const rgbMatch = gradient.match(/rgba\((\d+),\s*(\d+),\s*(\d+),/);
      const r = rgbMatch ? rgbMatch[1] : '100';
      const g = rgbMatch ? rgbMatch[2] : '100';
      const b = rgbMatch ? rgbMatch[3] : '100';
      
      const baseOpacity = isDark ? 0.45 : 0.3;
      const borderOpacity = isDark ? 0.6 : 0.45;
      
      const shineAndGlow = percentage > 0 
        ? `<div class="ntr-progress-shine"></div><div class="ntr-progress-glow"></div>` 
        : '';
      
      content += `  <div class="ntr-progress-row"><span class="ntr-progress-label"><span class="${nutrient.emojiClass}"></span> ${nutrient.name}:</span> <span class="ntr-progress-values">${Math.round(nutrient.current)} / ${nutrient.goal} ${nutrient.unit}</span> <span class="ntr-progress-percentage" style="color: ${textColor};">(${percentage}%)</span><div class="ntr-progress-track"><div class="ntr-progress-fill" style="width: ${Math.min(percentage, 100)}%; --progress-r: ${r}; --progress-g: ${g}; --progress-b: ${b}; --progress-opacity-base: ${baseOpacity}; --progress-border-opacity: ${borderOpacity};">${shineAndGlow}</div></div></div>
`;
    }
    
    return content;
  }

  async generateMealProgressSummaryWithId(totals: NutritionData, mealId: string): Promise<string> {
    const goals = this.settings.nutritionGoals;
    
    const overallProgress = Math.round((
      this.contentParser.calculatePercentage(totals.calories, goals.calories) +
      this.contentParser.calculatePercentage(totals.protein, goals.protein) +
      this.contentParser.calculatePercentage(totals.carbs, goals.carbs) +
      this.contentParser.calculatePercentage(totals.fat, goals.fat)
    ) / 4);
    
    let nutritionRows = this.generateModernProgressBars(totals, goals);
    
    const summary = `<div class="ntr-summary-card" data-meal-id="${mealId}">
<h3 class="ntr-summary-title">🎯 Meal vs Goals</h3>
<div class="ntr-summary-divider"></div>
${nutritionRows}<div class="ntr-overall-progress">
<div class="ntr-overall-progress-border">
<div class="ntr-overall-progress-inner">
<h3 class="ntr-overall-progress-title">${this.themeUtils.getOverallStatusEmoji(overallProgress)} Overall Progress: ${overallProgress}%</h3>
</div></div></div></div>
`;
    
    return summary;
  }
} 