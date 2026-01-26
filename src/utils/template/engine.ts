import { FoodItem, NutritionData, NutritionGoals, MealCategory, MEAL_CATEGORIES } from '../../types/nutrition';
import { PluginContext } from '../../types/plugin-context';
import * as LayoutGenerator from '../layout-generator';

export type TemplateType = 'classic-html' | 'simple-text' | 'yaml-frontmatter';

export interface Template {
  name: string;
  type: TemplateType;
  content: string;
  description?: string;
}

export interface CategoryGroup {
  category: MealCategory;
  items: FoodItem[];
  totals: NutritionData;
}

export interface TemplateContext {
  date: string;
  items: FoodItem[];
  totals: NutritionData;
  goals: NutritionGoals;
  itemCount: number;
  categoryGroups?: CategoryGroup[];  // For grouped layout
}

export function renderTemplate(
  template: Template,
  context: TemplateContext,
  ctx: PluginContext
): string {
  switch (template.type) {
    case 'classic-html':
      return renderClassicHTML(context, ctx);
    case 'simple-text':
      return renderSimpleText(template.content, context);
    case 'yaml-frontmatter':
      return renderYAMLFrontmatter(template.content, context);
    default:
      return renderClassicHTML(context, ctx);
  }
}

function renderSimpleText(templateContent: string, context: TemplateContext): string {
  let result = templateContent;

  // Basic variables
  result = result.replace(/\{\{date\}\}/g, context.date);
  result = result.replace(/\{\{item_count\}\}/g, context.itemCount.toString());

  // Nutrition totals
  result = result.replace(/\{\{total_calories\}\}/g, context.totals.calories.toString());
  result = result.replace(/\{\{total_protein\}\}/g, context.totals.protein.toString());
  result = result.replace(/\{\{total_carbs\}\}/g, context.totals.carbs.toString());
  result = result.replace(/\{\{total_fat\}\}/g, context.totals.fat.toString());

  // Nutrition goals
  result = result.replace(/\{\{goal_calories\}\}/g, context.goals.calories.toString());
  result = result.replace(/\{\{goal_protein\}\}/g, context.goals.protein.toString());
  result = result.replace(/\{\{goal_carbs\}\}/g, context.goals.carbs.toString());
  result = result.replace(/\{\{goal_fat\}\}/g, context.goals.fat.toString());

  // Category groups (if enabled)
  if (context.categoryGroups) {
    result = result.replace(
      /\{\{#each_category\}\}([\s\S]*?)\{\{\/each_category\}\}/g,
      (_, categoryTemplate) => {
        return context.categoryGroups!.map(group => {
          const categoryInfo = MEAL_CATEGORIES.find(c => c.id === group.category);
          let categoryContent = categoryTemplate;

          categoryContent = categoryContent.replace(/\{\{category_emoji\}\}/g, categoryInfo?.emoji || '🍽️');
          categoryContent = categoryContent.replace(/\{\{category_name\}\}/g, categoryInfo?.label || 'Meals');
          categoryContent = categoryContent.replace(/\{\{category_calories\}\}/g, group.totals.calories.toString());
          categoryContent = categoryContent.replace(/\{\{category_protein\}\}/g, group.totals.protein.toString());
          categoryContent = categoryContent.replace(/\{\{category_carbs\}\}/g, group.totals.carbs.toString());
          categoryContent = categoryContent.replace(/\{\{category_fat\}\}/g, group.totals.fat.toString());

          // Render items within category
          const itemsHtml = group.items.map(item => {
            let itemContent = '- {{emoji}} **{{food}}** ({{quantity}})';
            if (item.timestamp) {
              itemContent += ' - {{timestamp}}';
            }
            itemContent += '\n  - Calories: {{calories}} kcal | Protein: {{protein}}g | Carbs: {{carbs}}g | Fat: {{fat}}g\n';

            return itemContent
              .replace(/\{\{emoji\}\}/g, item.emoji || '🍽️')
              .replace(/\{\{food\}\}/g, item.food)
              .replace(/\{\{quantity\}\}/g, item.quantity)
              .replace(/\{\{timestamp\}\}/g, item.timestamp || '')
              .replace(/\{\{calories\}\}/g, item.calories.toString())
              .replace(/\{\{protein\}\}/g, item.protein.toString())
              .replace(/\{\{carbs\}\}/g, item.carbs.toString())
              .replace(/\{\{fat\}\}/g, item.fat.toString());
          }).join('\n');

          categoryContent = categoryContent.replace(/\{\{category_items\}\}/g, itemsHtml);

          return categoryContent;
        }).join('\n');
      }
    );
  }

  // Regular items loop (for non-grouped templates)
  result = result.replace(
    /\{\{#each items\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_, itemTemplate) => {
      return context.items.map(item => {
        let itemContent = itemTemplate;
        itemContent = itemContent.replace(/\{\{food\}\}/g, item.food);
        itemContent = itemContent.replace(/\{\{quantity\}\}/g, item.quantity);
        itemContent = itemContent.replace(/\{\{calories\}\}/g, item.calories.toString());
        itemContent = itemContent.replace(/\{\{protein\}\}/g, item.protein.toString());
        itemContent = itemContent.replace(/\{\{carbs\}\}/g, item.carbs.toString());
        itemContent = itemContent.replace(/\{\{fat\}\}/g, item.fat.toString());
        itemContent = itemContent.replace(/\{\{emoji\}\}/g, item.emoji || '🍽️');
        itemContent = itemContent.replace(/\{\{timestamp\}\}/g, item.timestamp || '');
        return itemContent;
      }).join('');
    }
  );

  return result;
}

function renderYAMLFrontmatter(templateContent: string, context: TemplateContext): string {
  const frontmatter = `---
date: ${context.date}
total_calories: ${context.totals.calories}
total_protein: ${context.totals.protein}
total_carbs: ${context.totals.carbs}
total_fat: ${context.totals.fat}
goal_calories: ${context.goals.calories}
goal_protein: ${context.goals.protein}
goal_carbs: ${context.goals.carbs}
goal_fat: ${context.goals.fat}
items: ${context.itemCount}
---

`;

  const body = renderSimpleText(templateContent, context);
  return frontmatter + body;
}

function renderClassicHTML(context: TemplateContext, ctx: PluginContext): string {
  const { date, items, totals, goals, categoryGroups } = context;

  let content = `# 🍽️ Food Log ${date}\n\n`;

  if (categoryGroups && ctx.settings.groupByCategory) {
    // Grouped by category
    categoryGroups.forEach(group => {
      const categoryInfo = MEAL_CATEGORIES.find(c => c.id === group.category);
      content += `## ${categoryInfo?.emoji || '🍽️'} ${categoryInfo?.label || 'Meals'}\n\n`;
      content += LayoutGenerator.generateCardLayout(group.items, goals);

      // Category sub-total
      if (group.items.length > 1) {
        content += `\n<div class="ntr-category-subtotal">`;
        content += `**Subtotal:** ${group.totals.calories} kcal | `;
        content += `P: ${group.totals.protein}g | C: ${group.totals.carbs}g | F: ${group.totals.fat}g`;
        content += `</div>\n\n`;
      }
    });
  } else {
    // Ungrouped (original layout)
    content += `## 🥗 Today's Meals\n\n`;
    content += LayoutGenerator.generateCardLayout(items, goals);
  }

  content += '\n<div class="food-placeholder"></div>\n\n';
  content += LayoutGenerator.generateCTAButtons('foodlog');
  content += LayoutGenerator.generateDailySummary(totals, goals);
  content += '\n\n---\n\n';
  content += '*✨ Generated by AI Nutrition Tracker Plugin*\n';

  return content;
}
