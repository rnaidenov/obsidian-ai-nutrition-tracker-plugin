import { FoodItem, NutritionData, Meal } from '../types/nutrition';

export class ContentParser {
  extractFoodItemsFromContent(content: string): FoodItem[] {
    const items: FoodItem[] = [];
    
    // Extract food items using data-ntr-* attributes
    const regex = /<div[^>]*data-ntr-food="([^"]*)"[^>]*data-ntr-quantity="([^"]*)"[^>]*data-ntr-calories="([\d.]+)"[^>]*data-ntr-protein="([\d.]+)"[^>]*data-ntr-carbs="([\d.]+)"[^>]*data-ntr-fat="([\d.]+)"[^>]*>/g;
    
    let match;
    while ((match = regex.exec(content)) !== null) {
      items.push({
        food: match[1].replace(/&quot;/g, '"'),
        quantity: match[2].replace(/&quot;/g, '"'),
        calories: parseFloat(match[3]),
        protein: parseFloat(match[4]),
        carbs: parseFloat(match[5]),
        fat: parseFloat(match[6])
      });
    }
    
    return items;
  }

  calculateTotals(foodItems: FoodItem[]): NutritionData {
    return foodItems.reduce((totals, item) => ({
      calories: totals.calories + (item.calories || 0),
      protein: totals.protein + (item.protein || 0),
      carbs: totals.carbs + (item.carbs || 0),
      fat: totals.fat + (item.fat || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }

  calculatePercentage(current: number, goal: number): number {
    if (goal === 0) return 0;
    return Math.round((current / goal) * 100);
  }

  parseMealFromMarkdown(content: string): Partial<Meal> | null {
    try {
      // Extract meal ID from HTML data attribute
      const mealIdMatch = content.match(/data-meal-id="([^"]+)"/);
      if (!mealIdMatch) {
        return null;
      }
      
      const mealId = mealIdMatch[1];
      
      // Extract description (if exists)
      const descriptionMatch = content.match(/## 📝 Description\n([\s\S]+?)\n\n/);
      const description = descriptionMatch ? descriptionMatch[1].trim() : undefined;
      
      // Extract food items from card layout
      const foodItems = this.extractFoodItemsFromContent(content);
      
      return {
        id: mealId,
        items: foodItems,
        description
      };
    } catch (error) {
      console.error('Error parsing meal from markdown:', error);
      return null;
    }
  }

  findCardPosition(content: string, escapedFood: string, escapedQuantity: string, calories: number): { success: boolean, startIndex: number, endIndex: number } {
    const pattern = new RegExp(
      `<div[^>]*data-ntr-food="${escapedFood}"[^>]*data-ntr-quantity="${escapedQuantity}"[^>]*data-ntr-calories="${calories}"[^>]*data-ntr-protein="[^"]*"[^>]*data-ntr-carbs="[^"]*"[^>]*data-ntr-fat="[^"]*"[^>]*>`,
      'gi'
    );
    
    const match = pattern.exec(content);
    if (!match) {
      return { success: false, startIndex: -1, endIndex: -1 };
    }
    
    const cardBounds = this.findCardBounds(content, match.index);
    return { success: cardBounds.success, startIndex: match.index, endIndex: cardBounds.endIndex };
  }

  findCardBounds(content: string, startIndex: number): { success: boolean, endIndex: number } {
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

  extractCompleteCard(content: string, startIndex: number): { success: boolean, content: string } {
    let divCount = 0;
    let i = startIndex;
    const cardStart = startIndex;
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

  replaceCardInPosition(content: string, originalEntry: { food: string, quantity: string, calories: number, protein: number, carbs: number, fat: number }, newCardContent: string): { success: boolean, content: string } {
    const escapedFood = originalEntry.food.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/"/g, '&quot;');
    const escapedQuantity = originalEntry.quantity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/"/g, '&quot;');
    
    const cardPosition = this.findCardPosition(content, escapedFood, escapedQuantity, originalEntry.calories);
    if (!cardPosition.success) {
      return { success: false, content };
    }
    
    // Replace the old card with the new card at the exact position
    const beforeCard = content.substring(0, cardPosition.startIndex);
    const afterCard = content.substring(cardPosition.endIndex);
    
    // Clean up any extra whitespace and insert new card
    const cleanedAfter = afterCard.replace(/^\s*\n\s*/, '\n');
    const updatedContent = beforeCard + newCardContent.trim() + cleanedAfter;
    
    return { success: true, content: updatedContent };
  }

  deleteCardFromContent(content: string, itemToDelete: { food: string, quantity: string, calories: number, protein: number, carbs: number, fat: number }): { success: boolean, content: string } {
    const escapedFood = itemToDelete.food.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/"/g, '&quot;');
    const escapedQuantity = itemToDelete.quantity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/"/g, '&quot;');
    
    const pattern = new RegExp(
      `<div[^>]*data-ntr-food="${escapedFood}"[^>]*data-ntr-quantity="${escapedQuantity}"[^>]*data-ntr-calories="${itemToDelete.calories}"[^>]*data-ntr-protein="${itemToDelete.protein}"[^>]*data-ntr-carbs="${itemToDelete.carbs}"[^>]*data-ntr-fat="${itemToDelete.fat}"[^>]*>`,
      'gi'
    );
    
    const match = pattern.exec(content);
    if (!match) {
      return { success: false, content };
    }
    
    return this.extractCompleteCard(content, match.index);
  }
} 