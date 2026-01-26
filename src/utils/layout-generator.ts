import { FoodItem, NutritionData, NutritionGoals, MEAL_CATEGORIES } from '../types/nutrition';
import * as ThemeUtils from './theme';
import * as ContentParser from './content-parser';

export type IdGenerator = (prefix: string) => string;

export const defaultIdGenerator: IdGenerator = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

export function generateCardLayout(
  foodItems: FoodItem[],
  goals: NutritionGoals,
  context?: 'meal' | 'foodlog',
  mealId?: string,
  idGenerator: IdGenerator = defaultIdGenerator
): string {
  let content = '';

  for (const item of foodItems) {
    const emoji = item.emoji || '🍽️';
    const timeStr = item.timestamp ?
      new Date(item.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }) : '';

    const editContext = context || 'foodlog';

    const entryId = idGenerator('ntr');
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
    if (item.mealCategory) {
      const categoryInfo = MEAL_CATEGORIES.find(c => c.id === item.mealCategory);
      if (categoryInfo) {
        content += `        <span class="ntr-category-badge">${categoryInfo.emoji} ${categoryInfo.label}</span>\n`;
      }
    }
    content += `      </div>\n`;
    content += `    </div>\n`;
    content += `    <div class="ntr-food-card-actions">\n`;
    content += `      <button class="nutrition-edit-btn ntr-edit-btn" data-ntr-food="${item.food.replace(/"/g, '&quot;')}" data-ntr-quantity="${item.quantity.replace(/"/g, '&quot;')}" data-ntr-calories="${item.calories}" data-ntr-protein="${item.protein}" data-ntr-carbs="${item.carbs}" data-ntr-fat="${item.fat}" data-ntr-edit-context="${editContext}">✏️ Edit</button>\n`;
    content += `      <button class="nutrition-delete-btn ntr-delete-btn" data-ntr-food="${item.food.replace(/"/g, '&quot;')}" data-ntr-quantity="${item.quantity.replace(/"/g, '&quot;')}" data-ntr-calories="${item.calories}" data-ntr-protein="${item.protein}" data-ntr-carbs="${item.carbs}" data-ntr-fat="${item.fat}" data-ntr-edit-context="${editContext}" data-ntr-entry-id="${entryId}">🗑️ Delete</button>\n`;
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
    content += generateCTAButtons(context, mealId, idGenerator);
  }

  return content;
}

export function generateCTAButtons(
  context: 'meal' | 'foodlog',
  mealId?: string,
  idGenerator: IdGenerator = defaultIdGenerator
): string {
  const buttonId = idGenerator('nutrition-add-cta');
  const mealIdAttr = mealId ? ` data-meal-id="${mealId}"` : '';

  const buttonText = context === 'meal' ?
    `➕ Add More Items to Meal` :
    `➕ Add More Items to Food Log`;

  const buttonHtml = `<div class="nutrition-add-cta-container"><button id="${buttonId}" class="nutrition-add-cta-btn" data-context="${context}"${mealIdAttr}>${buttonText}</button></div>`;

  return buttonHtml;
}

function generateProgressSummary(
  totals: NutritionData,
  goals: NutritionGoals,
  options: { title: string; mealId?: string }
): string {
  const overallProgress = Math.round((
    ContentParser.calculatePercentage(totals.calories, goals.calories) +
    ContentParser.calculatePercentage(totals.protein, goals.protein) +
    ContentParser.calculatePercentage(totals.carbs, goals.carbs) +
    ContentParser.calculatePercentage(totals.fat, goals.fat)
  ) / 4);

  const nutritionRows = generateModernProgressBars(totals, goals);
  const mealIdAttr = options.mealId ? ` data-meal-id="${options.mealId}"` : '';

  return `<div class="ntr-summary-card"${mealIdAttr}>
<h3 class="ntr-summary-title">${options.title}</h3>
<div class="ntr-summary-divider"></div>
${nutritionRows}<div class="ntr-overall-progress">
<div class="ntr-overall-progress-border">
<div class="ntr-overall-progress-inner">
<h3 class="ntr-overall-progress-title">${ThemeUtils.getOverallStatusEmoji(overallProgress)} Overall Progress: ${overallProgress}%</h3>
</div></div></div></div>
`;
}

export function generateDailySummary(
  totals: NutritionData,
  goals: NutritionGoals
): string {
  return generateProgressSummary(totals, goals, { title: '🎯 Totals vs Goals' });
}

export function generateModernProgressBars(
  totals: NutritionData,
  goals: NutritionGoals
): string {
  let content = '';

  const nutrients = [
    { name: 'Calories', emojiClass: 'ntr-progress-emoji-calories', current: totals.calories, goal: goals.calories, unit: 'kcal', key: 'calories' },
    { name: 'Protein', emojiClass: 'ntr-progress-emoji-protein', current: totals.protein, goal: goals.protein, unit: 'g', key: 'protein' },
    { name: 'Carbs', emojiClass: 'ntr-progress-emoji-carbs', current: totals.carbs, goal: goals.carbs, unit: 'g', key: 'carbs' },
    { name: 'Fat', emojiClass: 'ntr-progress-emoji-fat', current: totals.fat, goal: goals.fat, unit: 'g', key: 'fat' }
  ];

  for (const nutrient of nutrients) {
    const percentage = ContentParser.calculatePercentage(nutrient.current, nutrient.goal);

    const colorZone = getColorZone(percentage);

    const shineAndGlow = percentage > 0
      ? `<div class="ntr-progress-shine"></div><div class="ntr-progress-glow"></div>`
      : '';

    content += `  <div class="ntr-progress-row" data-nutrient="${nutrient.key}"><span class="ntr-progress-label"><span class="${nutrient.emojiClass}"></span> ${nutrient.name}:</span> <span class="ntr-progress-values">${Math.round(nutrient.current)} / ${nutrient.goal} ${nutrient.unit}</span> <span class="ntr-progress-percentage ${colorZone}">(${percentage}%)</span><div class="ntr-progress-track"><div class="ntr-progress-fill ${colorZone}" style="--progress-width: ${Math.min(percentage, 100)};">${shineAndGlow}</div></div></div>
`;
  }

  return content;
}

export function getColorZone(percentage: number): string {
  if (percentage < 25) return 'zone-red';
  if (percentage < 50) return 'zone-orange';
  if (percentage < 75) return 'zone-yellow';
  if (percentage < 90) return 'zone-light-green';
  return 'zone-green';
}

export function generateMealProgressSummaryWithId(
  totals: NutritionData,
  goals: NutritionGoals,
  mealId: string
): string {
  return generateProgressSummary(totals, goals, { title: '🎯 Meal vs Goals', mealId });
}
