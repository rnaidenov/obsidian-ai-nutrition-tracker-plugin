import { FoodItem, NutritionData } from '../types/nutrition';
import { PluginSettings } from '../types/settings';
import { ThemeUtils } from './theme-utils';
import { ContentParser } from './content-parser';

export class LayoutGenerator {
  private themeUtils: ThemeUtils;
  private contentParser: ContentParser;

  constructor(private settings: PluginSettings) {
    this.themeUtils = new ThemeUtils(settings);
    this.contentParser = new ContentParser();
  }

  generateCardLayout(foodItems: FoodItem[], context?: 'meal' | 'foodlog', mealId?: string): string {
    console.log('🛠️ generateCardLayout called with:', {
      itemCount: foodItems.length,
      context,
      mealId,
      hasContext: !!context,
      hasMealId: !!mealId
    });
    
    let content = '';
    const isDarkTheme = this.themeUtils.getEffectiveTheme() === 'dark';
    
    for (const item of foodItems) {
      const emoji = item.emoji || '🍽️';
      const timeStr = item.timestamp ? 
        new Date(item.timestamp).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }) : '';
      
      // Add context to identify where the edit originated from
      const editContext = context || 'foodlog';
      
      if (isDarkTheme) {
        // Glassy dark theme card
        const entryId = `ntr-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        content += `\n<div id="${entryId}" data-ntr-food="${item.food.replace(/"/g, '&quot;')}" data-ntr-quantity="${item.quantity.replace(/"/g, '&quot;')}" data-ntr-calories="${item.calories}" data-ntr-protein="${item.protein}" data-ntr-carbs="${item.carbs}" data-ntr-fat="${item.fat}" style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.75), rgba(51, 65, 85, 0.75)); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-radius: 16px; padding: 14px; margin: 10px 0; box-shadow: 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1); border: 1px solid rgba(148,163,184,0.2); position: relative; overflow: hidden;">\n`;
        content += `  <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px;">\n`;
        content += `    <div style="display: flex; align-items: center; flex: 1;">\n`;
        content += `      <span style="font-size: 32px; margin-right: 10px;">${emoji}</span>\n`;
        content += `      <div style="flex: 1;">\n`;
        content += `        <h3 style="color: #f8fafc; margin: 0; font-size: 16px; font-weight: 600;">${item.food}</h3>\n`;
        content += `        <div style="color: #94a3b8; font-size: 12px; margin-top: 2px;">📏 ${item.quantity}</div>\n`;
        if (timeStr) {
          content += `        <div style="color: #94a3b8; font-size: 10px; margin-top: 1px; opacity: 0.8;">🕐 ${timeStr}</div>\n`;
        }
        content += `      </div>\n`;
        content += `    </div>\n`;
        content += `    <div style="display: flex; gap: 8px; align-items: center;">\n`;
        content += `      <button class="nutrition-edit-btn" data-food="${item.food.replace(/"/g, '&quot;')}" data-quantity="${item.quantity.replace(/"/g, '&quot;')}" data-calories="${item.calories}" data-protein="${item.protein}" data-carbs="${item.carbs}" data-fat="${item.fat}" data-edit-context="${editContext}" style="background: linear-gradient(135deg, rgba(148,163,184,0.12), rgba(100,116,139,0.08)); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); border: 1px solid rgba(148,163,184,0.25); border-radius: 8px; padding: 6px 10px; color: #cbd5e1; font-size: 10px; cursor: pointer; box-shadow: 0 2px 8px rgba(148,163,184,0.1), inset 0 1px 0 rgba(255,255,255,0.1); flex-shrink: 0; transition: all 0.2s ease;">✏️ Edit</button>\n`;
        content += `      <button class="nutrition-delete-btn" data-food="${item.food.replace(/"/g, '&quot;')}" data-quantity="${item.quantity.replace(/"/g, '&quot;')}" data-calories="${item.calories}" data-protein="${item.protein}" data-carbs="${item.carbs}" data-fat="${item.fat}" data-edit-context="${editContext}" data-entry-id="${entryId}" style="background: linear-gradient(135deg, rgba(239,68,68,0.12), rgba(185,28,28,0.08)); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); border: 1px solid rgba(239,68,68,0.25); border-radius: 8px; padding: 6px 10px; color: #fca5a5; font-size: 10px; cursor: pointer; box-shadow: 0 2px 8px rgba(239,68,68,0.1), inset 0 1px 0 rgba(255,255,255,0.1); flex-shrink: 0; transition: all 0.2s ease;" onmouseover="this.style.background='linear-gradient(135deg, rgba(239,68,68,0.2), rgba(185,28,28,0.15))';" onmouseout="this.style.background='linear-gradient(135deg, rgba(239,68,68,0.12), rgba(185,28,28,0.08))';">🗑️ Delete</button>\n`;
        content += `    </div>\n`;
        content += `  </div>\n`;
        content += `  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">\n`;
        content += `    <div style="text-align: center; padding: 8px; background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(185, 28, 28, 0.1)); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.25); box-shadow: 0 4px 16px rgba(239, 68, 68, 0.1);">\n`;
        content += `      <div style="font-size: 16px; margin-bottom: 2px;">🔥</div>\n`;
        content += `      <div style="color: #fecaca; font-weight: bold; font-size: 14px;">${item.calories}</div>\n`;
        content += `      <div style="color: #f87171; font-size: 9px; text-transform: uppercase; font-weight: 500;">kcal</div>\n`;
        content += `    </div>\n`;
        content += `    <div style="text-align: center; padding: 8px; background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.1)); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); border-radius: 12px; border: 1px solid rgba(34, 197, 94, 0.25); box-shadow: 0 4px 16px rgba(34, 197, 94, 0.1);">\n`;
        content += `      <div style="font-size: 16px; margin-bottom: 2px;">💪</div>\n`;
        content += `      <div style="color: #bbf7d0; font-weight: bold; font-size: 14px;">${item.protein}g</div>\n`;
        content += `      <div style="color: #86efac; font-size: 9px; text-transform: uppercase; font-weight: 500;">protein</div>\n`;
        content += `    </div>\n`;
        content += `    <div style="text-align: center; padding: 8px; background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(217, 119, 6, 0.1)); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); border-radius: 12px; border: 1px solid rgba(251, 191, 36, 0.25); box-shadow: 0 4px 16px rgba(251, 191, 36, 0.1);">\n`;
        content += `      <div style="font-size: 16px; margin-bottom: 2px;">🌾</div>\n`;
        content += `      <div style="color: #fde68a; font-weight: bold; font-size: 14px;">${item.carbs}g</div>\n`;
        content += `      <div style="color: #fbbf24; font-size: 9px; text-transform: uppercase; font-weight: 500;">carbs</div>\n`;
        content += `    </div>\n`;
        content += `    <div style="text-align: center; padding: 8px; background: linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(124, 58, 237, 0.1)); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); border-radius: 12px; border: 1px solid rgba(168, 85, 247, 0.25); box-shadow: 0 4px 16px rgba(168, 85, 247, 0.1);">\n`;
        content += `      <div style="font-size: 16px; margin-bottom: 2px;">🥑</div>\n`;
        content += `      <div style="color: #ddd6fe; font-weight: bold; font-size: 14px;">${item.fat}g</div>\n`;
        content += `      <div style="color: #c4b5fd; font-size: 9px; text-transform: uppercase; font-weight: 500;">fat</div>\n`;
        content += `    </div>\n`;
        content += `  </div>\n`;
        content += `</div>\n\n`;
      } else {
        // Glassy light theme card
        const entryId = `ntr-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        content += `\n<div id="${entryId}" data-ntr-food="${item.food.replace(/"/g, '&quot;')}" data-ntr-quantity="${item.quantity.replace(/"/g, '&quot;')}" data-ntr-calories="${item.calories}" data-ntr-protein="${item.protein}" data-ntr-carbs="${item.carbs}" data-ntr-fat="${item.fat}" style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.9)); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-radius: 16px; padding: 14px; margin: 10px 0; box-shadow: 0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9); border: 1px solid rgba(255,255,255,0.6); position: relative; overflow: hidden;">\n`;
        content += `  <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px;">\n`;
        content += `    <div style="display: flex; align-items: center; flex: 1;">\n`;
        content += `      <span style="font-size: 32px; margin-right: 10px;">${emoji}</span>\n`;
        content += `      <div style="flex: 1;">\n`;
        content += `        <h3 style="color: #0f172a; margin: 0; font-size: 16px; font-weight: 600;">${item.food}</h3>\n`;
        content += `        <div style="color: #64748b; font-size: 12px; margin-top: 2px;">📏 ${item.quantity}</div>\n`;
        if (timeStr) {
          content += `        <div style="color: #64748b; font-size: 10px; margin-top: 1px; opacity: 0.8;">🕐 ${timeStr}</div>\n`;
        }
        content += `      </div>\n`;
        content += `    </div>\n`;
        content += `    <div style="display: flex; gap: 8px; align-items: center;">\n`;
        content += `      <button class="nutrition-edit-btn" data-food="${item.food.replace(/"/g, '&quot;')}" data-quantity="${item.quantity.replace(/"/g, '&quot;')}" data-calories="${item.calories}" data-protein="${item.protein}" data-carbs="${item.carbs}" data-fat="${item.fat}" data-edit-context="${editContext}" style="background: linear-gradient(135deg, rgba(255,255,255,0.7), rgba(248,250,252,0.5)); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); border: 1px solid rgba(255,255,255,0.6); border-radius: 8px; padding: 6px 10px; color: #475569; font-size: 10px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8); flex-shrink: 0; transition: all 0.2s ease;">✏️ Edit</button>\n`;
        content += `      <button class="nutrition-delete-btn" data-food="${item.food.replace(/"/g, '&quot;')}" data-quantity="${item.quantity.replace(/"/g, '&quot;')}" data-calories="${item.calories}" data-protein="${item.protein}" data-carbs="${item.carbs}" data-fat="${item.fat}" data-edit-context="${editContext}" data-entry-id="${entryId}" style="background: linear-gradient(135deg, rgba(255,255,255,0.7), rgba(254,226,226,0.5)); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); border: 1px solid rgba(252,165,165,0.6); border-radius: 8px; padding: 6px 10px; color: #dc2626; font-size: 10px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8); flex-shrink: 0; transition: all 0.2s ease;" onmouseover="this.style.background='linear-gradient(135deg, rgba(254,226,226,0.8), rgba(252,165,165,0.6))';" onmouseout="this.style.background='linear-gradient(135deg, rgba(255,255,255,0.7), rgba(254,226,226,0.5))';">🗑️ Delete</button>\n`;
        content += `    </div>\n`;
        content += `  </div>\n`;
        content += `  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">\n`;
        content += `    <div style="text-align: center; padding: 8px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(254, 226, 226, 0.9)); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); border-radius: 12px; border: 1px solid rgba(252, 165, 165, 0.3); box-shadow: 0 4px 16px rgba(239, 68, 68, 0.06), inset 0 1px 0 rgba(255,255,255,0.8);">\n`;
        content += `      <div style="font-size: 16px; margin-bottom: 2px;">🔥</div>\n`;
        content += `      <div style="color: #dc2626; font-weight: bold; font-size: 14px;">${item.calories}</div>\n`;
        content += `      <div style="color: #ef4444; font-size: 9px; text-transform: uppercase; font-weight: 600;">KCAL</div>\n`;
        content += `    </div>\n`;
        content += `    <div style="text-align: center; padding: 8px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(220, 252, 231, 0.9)); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); border-radius: 12px; border: 1px solid rgba(134, 239, 172, 0.3); box-shadow: 0 4px 16px rgba(34, 197, 2, 0.06), inset 0 1px 0 rgba(255,255,255,0.8);">\n`;
        content += `      <div style="font-size: 16px; margin-bottom: 2px;">💪</div>\n`;
        content += `      <div style="color: #16a34a; font-weight: bold; font-size: 14px;">${item.protein}g</div>\n`;
        content += `      <div style="color: #22c55e; font-size: 9px; text-transform: uppercase; font-weight: 600;">PROTEIN</div>\n`;
        content += `    </div>\n`;
        content += `    <div style="text-align: center; padding: 8px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(254, 243, 199, 0.9)); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); border-radius: 12px; border: 1px solid rgba(252, 211, 77, 0.3); box-shadow: 0 4px 16px rgba(251, 191, 36, 0.06), inset 0 1px 0 rgba(255,255,255,0.8);">\n`;
        content += `      <div style="font-size: 16px; margin-bottom: 2px;">🌾</div>\n`;
        content += `      <div style="color: #d97706; font-weight: bold; font-size: 14px;">${item.carbs}g</div>\n`;
        content += `      <div style="color: #f59e0b; font-size: 9px; text-transform: uppercase; font-weight: 600;">CARBS</div>\n`;
        content += `    </div>\n`;
        content += `    <div style="text-align: center; padding: 8px; background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(237, 233, 254, 0.9)); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); border-radius: 12px; border: 1px solid rgba(196, 181, 253, 0.3); box-shadow: 0 4px 16px rgba(168, 85, 247, 0.06), inset 0 1px 0 rgba(255,255,255,0.8);">\n`;
        content += `      <div style="font-size: 16px; margin-bottom: 2px;">🥑</div>\n`;
        content += `      <div style="color: #7c3aed; font-weight: bold; font-size: 14px;">${item.fat}g</div>\n`;
        content += `      <div style="color: #8b5cf6; font-size: 9px; text-transform: uppercase; font-weight: 600;">FAT</div>\n`;
        content += `    </div>\n`;
        content += `  </div>\n`;
        content += `</div>\n\n`;
      }
    }
    
    // Add CTA buttons at the end
    if (context) {
      console.log('🛠️ Adding CTA buttons with context:', context, 'and mealId:', mealId);
      content += this.generateCTAButtons(context, mealId);
    }
    
    return content;
  }

  generateCTAButtons(context: 'meal' | 'foodlog', mealId?: string): string {
    const buttonId = `nutrition-add-cta-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const mealIdAttr = mealId ? ` data-meal-id="${mealId}"` : '';
    
    console.log('🎯 generateCTAButtons called with:', {
      context,
      mealId,
      buttonId,
      mealIdAttr,
      willHaveMealId: !!mealId
    });
    
    const buttonText = context === 'meal' ? 
      `➕ Add More Items to Meal` :
      `➕ Add More Items to Food Log`;
    
    // Use single-line HTML format like food item cards for better Obsidian compatibility
    const isDarkTheme = document.body.classList.contains('theme-dark');
    const buttonStyle = isDarkTheme ? 
      'background: linear-gradient(135deg, rgba(10, 10, 20, 0.2), rgba(15, 15, 30, 0.3), rgba(5, 5, 15, 0.1)); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1.5px solid rgba(120, 120, 140, 0.3); border-radius: 16px; padding: 24px 48px; color: #e2e8f0; font-weight: 400; cursor: pointer; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); font-size: 13px; display: inline-flex; align-items: center; gap: 16px; box-shadow: 0 12px 48px rgba(0, 0, 0, 0.2), 0 6px 24px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.02); position: relative; overflow: hidden; letter-spacing: 0.05em; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);' :
      'background: linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(248, 250, 252, 0.7), rgba(241, 245, 249, 0.6)); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1.5px solid rgba(100, 116, 139, 0.4); border-radius: 16px; padding: 24px 48px; color: #475569; font-weight: 400; cursor: pointer; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); font-size: 13px; display: inline-flex; align-items: center; gap: 16px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8), inset 0 -1px 0 rgba(0, 0, 0, 0.03); position: relative; overflow: hidden; letter-spacing: 0.05em;';
    
    const hoverStyleDark = 'this.style.transform="translateY(-2px)"; this.style.background="linear-gradient(135deg, rgba(15, 15, 25, 0.3), rgba(20, 20, 35, 0.4), rgba(10, 10, 20, 0.2))"; this.style.boxShadow="0 16px 64px rgba(0, 0, 0, 0.3), 0 8px 32px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.03)"; this.style.borderColor="rgba(140, 140, 160, 0.5)"; this.style.color="#f1f5f9"; this.style.padding="24px 48px"; this.style.letterSpacing="0.06em";';
    const hoverStyleLight = 'this.style.transform="translateY(-2px)"; this.style.background="linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.8), rgba(241, 245, 249, 0.7))"; this.style.boxShadow="0 16px 64px rgba(0, 0, 0, 0.12), 0 8px 32px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.9), inset 0 -1px 0 rgba(0, 0, 0, 0.05)"; this.style.borderColor="rgba(100, 116, 139, 0.6)"; this.style.padding="24px 48px"; this.style.letterSpacing="0.06em";';
    
    const resetStyleDark = 'this.style.transform="translateY(0)"; this.style.background="linear-gradient(135deg, rgba(10, 10, 20, 0.2), rgba(15, 15, 30, 0.3), rgba(5, 5, 15, 0.1))"; this.style.boxShadow="0 12px 48px rgba(0, 0, 0, 0.2), 0 6px 24px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.02)"; this.style.borderColor="rgba(120, 120, 140, 0.3)"; this.style.color="#e2e8f0"; this.style.padding="24px 48px"; this.style.letterSpacing="0.05em";';
    const resetStyleLight = 'this.style.transform="translateY(0)"; this.style.background="linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(248, 250, 252, 0.7), rgba(241, 245, 249, 0.6))"; this.style.boxShadow="0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8), inset 0 -1px 0 rgba(0, 0, 0, 0.03)"; this.style.borderColor="rgba(100, 116, 139, 0.4)"; this.style.padding="24px 48px"; this.style.letterSpacing="0.05em";';
    
    const buttonHtml = `<div style="text-align: center; margin: 24px 0; padding: 0px 0;"><button id="${buttonId}" class="nutrition-add-cta-btn" data-context="${context}"${mealIdAttr} style="${buttonStyle}" onmouseover="${isDarkTheme ? hoverStyleDark : hoverStyleLight}" onmouseout="${isDarkTheme ? resetStyleDark : resetStyleLight}">${buttonText}</button></div>`;
    
    console.log('🎯 Generated CTA button HTML:', buttonHtml);
    return buttonHtml;
  }

  async generateDailySummary(totals: NutritionData): Promise<string> {
    const goals = this.settings.nutritionGoals;
    const isDark = this.themeUtils.getEffectiveTheme() === 'dark';
    
    let summary = '## 📊 Daily Summary\n\n';
    
    // Create glassy card wrapper similar to food cards but lighter
    const cardStyles = isDark ? {
      background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.6), rgba(30, 41, 59, 0.5))',
      border: '1px solid rgba(148, 163, 184, 0.25)',
      shadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)',
      textColor: '#f8fafc',
      subtleColor: '#cbd5e1',
      footerColor: '#94a3b8'
    } : {
      background: 'linear-gradient(135deg, rgb(240 240 240 / 80%), rgba(248, 250, 252, 0.7))',
      border: '1px solid rgba(255, 255, 255, 0.7)',
      shadow: '0 8px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
      textColor: '#0f172a',
      subtleColor: '#475569',
      footerColor: '#64748b'
    };
    
    // Create the entire card as a single-line HTML structure (like food item cards)
    const nutrients = [
      { name: 'Calories', emoji: '🔥', current: totals.calories, goal: goals.calories, unit: 'kcal' },
      { name: 'Protein', emoji: '💪', current: totals.protein, goal: goals.protein, unit: 'g' },
      { name: 'Carbs', emoji: '🌾', current: totals.carbs, goal: goals.carbs, unit: 'g' },
      { name: 'Fat', emoji: '🥑', current: totals.fat, goal: goals.fat, unit: 'g' }
    ];
    
    // Overall status
    const overallProgress = Math.round((
      this.contentParser.calculatePercentage(totals.calories, goals.calories) +
      this.contentParser.calculatePercentage(totals.protein, goals.protein) +
      this.contentParser.calculatePercentage(totals.carbs, goals.carbs) +
      this.contentParser.calculatePercentage(totals.fat, goals.fat)
    ) / 4);
    

    const nutritionRows = this.generateModernProgressBars(totals, goals).replace(/\n+/g, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    const progressBg = isDark 
      ? 'rgba(255, 255, 255, 0.08)'
      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(248, 248, 248, 0.15))';
    
    const progressBorder = isDark 
      ? 'rgba(255, 255, 255, 0.15)'
      : 'rgba(255, 255, 255, 0.25)';
    
    // Enhanced divider with dark grey/resin color
    const dividerStyle = isDark 
      ? 'background: linear-gradient(90deg, transparent, rgba(60, 60, 60, 0.8), transparent); height: 1px; border: none;'
      : 'background: linear-gradient(90deg, transparent, rgba(80, 80, 80, 0.4), transparent); height: 1px; border: none;';
    
    // Enhanced overall progress border with gradient
    const enhancedProgressBorder = isDark 
      ? 'background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(148, 163, 184, 0.15)); padding: 1px; border-radius: 13px;'
      : 'background: linear-gradient(135deg, rgba(0, 0, 0, 0.15), rgba(100, 100, 100, 0.1)); padding: 1px; border-radius: 13px;';
    
    summary += `<div style="background: ${cardStyles.background}; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-radius: 16px; padding: 20px; margin: 12px 0; box-shadow: ${cardStyles.shadow}; border: ${cardStyles.border};"><h3 style="color: ${cardStyles.textColor}; margin-top: 0; margin-bottom: 16px; font-size: 18px; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: -0.5px;">🎯 Totals vs Goals</h3><div style="${dividerStyle} margin-bottom: 16px;"></div>${nutritionRows}<div style="${enhancedProgressBorder} text-align: center; margin: 32px 0 0;"><div style="background: ${progressBg}; border-radius: 12px; padding: 12px;"><h3 style="color: ${cardStyles.textColor}; margin: 0; font-size: 20px; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: -0.8px;">${this.themeUtils.getOverallStatusEmoji(overallProgress)} Overall Progress: ${overallProgress}%</h3></div></div></div>\n\n`;
    
    return summary;
  }

  generateModernProgressBars(totals: NutritionData, goals: any): string {
    let content = '';
    const isDark = this.themeUtils.getEffectiveTheme() === 'dark';
    
    const nutrients = [
      { name: 'Calories', emoji: '🔥', current: totals.calories, goal: goals.calories, unit: 'kcal' },
      { name: 'Protein', emoji: '💪', current: totals.protein, goal: goals.protein, unit: 'g' },
      { name: 'Carbs', emoji: '🌾', current: totals.carbs, goal: goals.carbs, unit: 'g' },
      { name: 'Fat', emoji: '🥑', current: totals.fat, goal: goals.fat, unit: 'g' }
    ];
    
    for (const nutrient of nutrients) {
      const percentage = this.contentParser.calculatePercentage(nutrient.current, nutrient.goal);
      const { gradient, textColor, borderColor } = this.themeUtils.getProgressGradient(percentage, isDark);
      
      // Ultra-subtle glassy track background with enhanced borders
      const trackBg = isDark 
        ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01))'
        : 'linear-gradient(135deg, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.01))';
      
      const trackBorder = isDark 
        ? 'rgba(255, 255, 255, 0.12)' 
        : 'rgba(0, 0, 0, 0.12)';
      
      const trackShadow = isDark 
        ? 'inset 0 1px 2px rgba(0, 0, 0, 0.1), 0 1px 0 rgba(255, 255, 255, 0.03)'
        : 'inset 0 1px 2px rgba(0, 0, 0, 0.06), 0 1px 0 rgba(255, 255, 255, 0.8)';
      
      content += `<span style="color: ${isDark ? '#e0e0e0' : '#333'}; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; letter-spacing: -0.3px;">${nutrient.emoji} ${nutrient.name}:</span> <span style="color: ${isDark ? '#a0a0a0' : '#666'}; font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace; font-size: 13px; font-weight: 400;">${Math.round(nutrient.current)} / ${nutrient.goal} ${nutrient.unit}</span> `;
      content += `<span style="color: ${textColor}; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px;">(${percentage}%)</span>\n`;
      
      // Ultra-minimalistic glassy progress bar with enhanced visibility
      content += `<div style="width: 100%; background: ${trackBg}; border: 1px solid ${trackBorder}; border-radius: 10px; height: 16px; margin: 6px 0 12px 0; padding: 2px; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); box-shadow: ${trackShadow};">\n`;
      content += `  <div style="width: ${Math.min(percentage, 100)}%; background: ${gradient}; height: 100%; border-radius: 8px; border: 1px solid ${borderColor}; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); position: relative; overflow: hidden; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);">\n`;
      
      // Enhanced glass shine effect with theme adaptation
      if (percentage > 0) {
        const shineOpacity = isDark ? 0.06 : 0.12;
        const shineFade = shineOpacity * 0.3;
        content += `    <div style="position: absolute; top: 0; left: 0; right: 0; height: 50%; background: linear-gradient(180deg, rgba(255,255,255,${shineOpacity}) 0%, rgba(255,255,255,${shineFade}) 70%, transparent 100%); border-radius: 8px 8px 0 0;"></div>\n`;
        
        // Subtle inner glow
        const glowOpacity = isDark ? 0.03 : 0.04;
        content += `    <div style="position: absolute; inset: 0; border-radius: 8px; box-shadow: inset 0 0 8px rgba(255,255,255,${glowOpacity});"></div>\n`;
      }
      
      content += `  </div>\n`;
      content += `</div>\n\n`;
    }
    
    return content;
  }

  async generateMealProgressSummary(totals: NutritionData): Promise<string> {
    const goals = this.settings.nutritionGoals;
    const isDark = this.themeUtils.getEffectiveTheme() === 'dark';
    
    let summary = '## 🎯 Meal vs Goals\n\n';
    
    // Create glassy card wrapper similar to food cards but lighter
    const cardStyles = isDark ? {
      background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.6), rgba(30, 41, 59, 0.5))',
      border: '1px solid rgba(148, 163, 184, 0.25)',
      shadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)',
      textColor: '#f8fafc',
      subtleColor: '#cbd5e1',
      footerColor: '#94a3b8'
    } : {
      background: 'linear-gradient(135deg, rgb(240 240 240 / 80%), rgba(248, 250, 252, 0.7))',
      border: '1px solid rgba(255, 255, 255, 0.7)',
      shadow: '0 8px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
      textColor: '#0f172a',
      subtleColor: '#475569',
      footerColor: '#64748b'
    };
    
    // Create the entire card as a single-line HTML structure (like food item cards)
    const nutrients = [
      { name: 'Calories', emoji: '🔥', current: totals.calories, goal: goals.calories, unit: 'kcal' },
      { name: 'Protein', emoji: '💪', current: totals.protein, goal: goals.protein, unit: 'g' },
      { name: 'Carbs', emoji: '🌾', current: totals.carbs, goal: goals.carbs, unit: 'g' },
      { name: 'Fat', emoji: '🥑', current: totals.fat, goal: goals.fat, unit: 'g' }
    ];
    
    // Overall status
    const overallProgress = Math.round((
      this.contentParser.calculatePercentage(totals.calories, goals.calories) +
      this.contentParser.calculatePercentage(totals.protein, goals.protein) +
      this.contentParser.calculatePercentage(totals.carbs, goals.carbs) +
      this.contentParser.calculatePercentage(totals.fat, goals.fat)
    ) / 4);
    
    // Generate nutrition rows with modern progress bars
    let nutritionRows = '';
    // Get the modern progress bars and strip newlines and fix bold formatting
    nutritionRows = this.generateModernProgressBars(totals, goals).replace(/\n+/g, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Build the entire card as a single line (like food item cards)
    // Create ultra-subtle glassy overall progress section
    const progressBg = isDark 
      ? 'rgba(255, 255, 255, 0.08)'
      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(248, 248, 248, 0.15))';
    
    const progressBorder = isDark 
      ? 'rgba(255, 255, 255, 0.15)'
      : 'rgba(255, 255, 255, 0.25)';
    
    // Enhanced divider with dark grey/resin color
    const dividerStyle = isDark 
      ? 'background: linear-gradient(90deg, transparent, rgba(60, 60, 60, 0.8), transparent); height: 1px; border: none;'
      : 'background: linear-gradient(90deg, transparent, rgba(80, 80, 80, 0.4), transparent); height: 1px; border: none;';
    
    // Enhanced overall progress border with gradient
    const enhancedProgressBorder = isDark 
      ? 'background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(148, 163, 184, 0.15)); padding: 1px; border-radius: 13px;'
      : 'background: linear-gradient(135deg, rgba(0, 0, 0, 0.15), rgba(100, 100, 100, 0.1)); padding: 1px; border-radius: 13px;';
    
    summary += `<div style="background: ${cardStyles.background}; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-radius: 16px; padding: 20px; margin: 12px 0; box-shadow: ${cardStyles.shadow}; border: ${cardStyles.border};"><h3 style="color: ${cardStyles.textColor}; margin-top: 0; margin-bottom: 16px; font-size: 18px; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: -0.5px;">🎯 Meal vs Goals</h3><div style="${dividerStyle} margin-bottom: 16px;"></div>${nutritionRows}<div style="${enhancedProgressBorder} text-align: center; margin: 32px 0 0;"><div style="background: ${progressBg}; border-radius: 12px; padding: 12px;"><h3 style="color: ${cardStyles.textColor}; margin: 0; font-size: 20px; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: -0.8px;">${this.themeUtils.getOverallStatusEmoji(overallProgress)} Overall Progress: ${overallProgress}%</h3></div></div></div>\n\n`;
    
    return summary;
  }

  async generateMealProgressSummaryWithId(totals: NutritionData, mealId: string): Promise<string> {
    const goals = this.settings.nutritionGoals;
    const isDark = this.themeUtils.getEffectiveTheme() === 'dark';
    
    let summary = '## 🎯 Meal vs Goals\n\n';
    
    // Create glassy card wrapper similar to food cards but lighter
    const cardStyles = isDark ? {
      background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.6), rgba(30, 41, 59, 0.5))',
      border: '1px solid rgba(148, 163, 184, 0.25)',
      shadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)',
      textColor: '#f8fafc',
      subtleColor: '#cbd5e1',
      footerColor: '#94a3b8'
    } : {
      background: 'linear-gradient(135deg, rgb(240 240 240 / 80%), rgba(248, 250, 252, 0.7))',
      border: '1px solid rgba(255, 255, 255, 0.7)',
      shadow: '0 8px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
      textColor: '#0f172a',
      subtleColor: '#475569',
      footerColor: '#64748b'
    };
    
    // Create the entire card as a single-line HTML structure (like food item cards)
    const nutrients = [
      { name: 'Calories', emoji: '🔥', current: totals.calories, goal: goals.calories, unit: 'kcal' },
      { name: 'Protein', emoji: '💪', current: totals.protein, goal: goals.protein, unit: 'g' },
      { name: 'Carbs', emoji: '🌾', current: totals.carbs, goal: goals.carbs, unit: 'g' },
      { name: 'Fat', emoji: '🥑', current: totals.fat, goal: goals.fat, unit: 'g' }
    ];
    
    // Overall status
    const overallProgress = Math.round((
      this.contentParser.calculatePercentage(totals.calories, goals.calories) +
      this.contentParser.calculatePercentage(totals.protein, goals.protein) +
      this.contentParser.calculatePercentage(totals.carbs, goals.carbs) +
      this.contentParser.calculatePercentage(totals.fat, goals.fat)
    ) / 4);
    
    // Generate nutrition rows with modern progress bars
    let nutritionRows = '';
    // Get the modern progress bars and strip newlines and fix bold formatting
    nutritionRows = this.generateModernProgressBars(totals, goals).replace(/\n+/g, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Build the entire card as a single line (like food item cards)
    // Create ultra-subtle glassy overall progress section
    const progressBg = isDark 
      ? 'rgba(255, 255, 255, 0.08)'
      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(248, 248, 248, 0.15))';
    
    const progressBorder = isDark 
      ? 'rgba(255, 255, 255, 0.15)'
      : 'rgba(255, 255, 255, 0.25)';
    
    // Enhanced divider with dark grey/resin color
    const dividerStyle = isDark 
      ? 'background: linear-gradient(90deg, transparent, rgba(60, 60, 60, 0.8), transparent); height: 1px; border: none;'
      : 'background: linear-gradient(90deg, transparent, rgba(80, 80, 80, 0.4), transparent); height: 1px; border: none;';
    
    // Enhanced overall progress border with gradient
    const enhancedProgressBorder = isDark 
      ? 'background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(148, 163, 184, 0.15)); padding: 1px; border-radius: 13px;'
      : 'background: linear-gradient(135deg, rgba(0, 0, 0, 0.15), rgba(100, 100, 100, 0.1)); padding: 1px; border-radius: 13px;';
    
    // Include meal ID as data attribute in the main container
    summary += `<div data-meal-id="${mealId}" style="background: ${cardStyles.background}; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-radius: 16px; padding: 20px; margin: 12px 0; box-shadow: ${cardStyles.shadow}; border: ${cardStyles.border};"><h3 style="color: ${cardStyles.textColor}; margin-top: 0; margin-bottom: 16px; font-size: 18px; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: -0.5px;">🎯 Meal vs Goals</h3><div style="${dividerStyle} margin-bottom: 16px;"></div>${nutritionRows}<div style="${enhancedProgressBorder} text-align: center; margin: 32px 0 0;"><div style="background: ${progressBg}; border-radius: 12px; padding: 12px;"><h3 style="color: ${cardStyles.textColor}; margin: 0; font-size: 20px; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: -0.8px;">${this.themeUtils.getOverallStatusEmoji(overallProgress)} Overall Progress: ${overallProgress}%</h3></div></div></div>\n\n`;
    
    return summary;
  }
} 