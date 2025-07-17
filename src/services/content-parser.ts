import { FoodItem, NutritionData, Meal } from '../types/nutrition';

export class ContentParser {
  extractFoodItemsFromContent(content: string): FoodItem[] {
    const items: FoodItem[] = [];
    
    // Try simple layout first (most common - data-food, data-quantity, etc.)
    const simpleRegex = /class="nutrition-food-entry-simple[^"]*"[^>]*data-food="([^"]*)"[^>]*data-quantity="([^"]*)"[^>]*data-calories="([^"]*)"[^>]*data-protein="([^"]*)"[^>]*data-carbs="([^"]*)"[^>]*data-fat="([^"]*)"/g;
    
    // Try card layout (data-ntr-food, data-ntr-quantity, etc.)
    const cardAttributeRegex = /<div[^>]*data-ntr-food="([^"]*)"[^>]*data-ntr-quantity="([^"]*)"[^>]*data-ntr-calories="([\d.]+)"[^>]*data-ntr-protein="([\d.]+)"[^>]*data-ntr-carbs="([\d.]+)"[^>]*data-ntr-fat="([\d.]+)"[^>]*>/g;
    
    // Extract from old HTML card layouts (fallback)
    const htmlCardRegex = /<div style="background: linear-gradient\(135deg,[^"]+\)"[\s\S]*?<h3[^>]*>([^<]+)<\/h3>[\s\S]*?📏 ([^<]+)[\s\S]*?<div style="color: [^"]+; font-weight: bold; font-size: 14px;">([\d.]+)<\/div>[\s\S]*?<div style="color: [^"]+; font-weight: bold; font-size: 14px;">([\d.]+)g<\/div>[\s\S]*?<div style="color: [^"]+; font-weight: bold; font-size: 14px;">([\d.]+)g<\/div>[\s\S]*?<div style="color: [^"]+; font-weight: bold; font-size: 14px;">([\d.]+)g<\/div>/g;
    
    // Try simple layout first (most reliable for new entries)
    let match;
    while ((match = simpleRegex.exec(content)) !== null) {
      items.push({
        food: match[1].replace(/&quot;/g, '"'),
        quantity: match[2].replace(/&quot;/g, '"'),
        calories: parseFloat(match[3]),
        protein: parseFloat(match[4]),
        carbs: parseFloat(match[5]),
        fat: parseFloat(match[6])
      });
    }
    
    // If no simple layout entries found, try card layout
    if (items.length === 0) {
      while ((match = cardAttributeRegex.exec(content)) !== null) {
        // Extract all nutrition data from card data attributes
        const food = match[1].replace(/&quot;/g, '"');
        const quantity = match[2].replace(/&quot;/g, '"');
        const calories = parseFloat(match[3]);
        const protein = parseFloat(match[4]);
        const carbs = parseFloat(match[5]);
        const fat = parseFloat(match[6]);
        
        items.push({
          food,
          quantity,
          calories,
          protein,
          carbs,
          fat
        });
      }
    }
    
    // If still no items found, try old HTML card pattern
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
    // Look for cards with complete nutrition data
    const startPattern = new RegExp(
      `<div[^>]*data-ntr-food="${escapedFood}"[^>]*data-ntr-quantity="${escapedQuantity}"[^>]*data-ntr-calories="${calories}"[^>]*data-ntr-protein="[^"]*"[^>]*data-ntr-carbs="[^"]*"[^>]*data-ntr-fat="[^"]*"[^>]*>`,
      'gi'
    );
    
    const startMatch = startPattern.exec(content);
    if (!startMatch) {
      // Try legacy pattern without complete nutrition data
      const legacyPattern = new RegExp(
        `<div[^>]*data-ntr-food="${escapedFood}"[^>]*data-ntr-quantity="${escapedQuantity}"[^>]*data-ntr-calories="${calories}"[^>]*>`,
        'gi'
      );
      const legacyMatch = legacyPattern.exec(content);
      if (!legacyMatch) {
        return { success: false, startIndex: -1, endIndex: -1 };
      }
      const cardBounds = this.findCardBounds(content, legacyMatch.index);
      return { success: cardBounds.success, startIndex: legacyMatch.index, endIndex: cardBounds.endIndex };
    }
    
    const cardBounds = this.findCardBounds(content, startMatch.index);
    return { success: cardBounds.success, startIndex: startMatch.index, endIndex: cardBounds.endIndex };
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

  replaceCardInPosition(content: string, originalEntry: { food: string, quantity: string, calories: number, protein: number, carbs: number, fat: number }, newCardContent: string): { success: boolean, content: string } {
    // Find the start of the card using data attributes
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
    
    const cardPattern = new RegExp(
      `<div[^>]*data-ntr-food="${escapedFood}"[^>]*data-ntr-quantity="${escapedQuantity}"[^>]*data-ntr-calories="${itemToDelete.calories}"[^>]*data-ntr-protein="${itemToDelete.protein}"[^>]*data-ntr-carbs="${itemToDelete.carbs}"[^>]*data-ntr-fat="${itemToDelete.fat}"[^>]*>`,
      'gi'
    );
    
    let startMatch = cardPattern.exec(content);
    if (!startMatch) {
      // Try legacy card pattern without complete nutrition data
      const legacyCardPattern = new RegExp(
        `<div[^>]*data-ntr-food="${escapedFood}"[^>]*data-ntr-quantity="${escapedQuantity}"[^>]*data-ntr-calories="${itemToDelete.calories}"[^>]*>`,
        'gi'
      );
      startMatch = legacyCardPattern.exec(content);
    }
    
    if (!startMatch) {
      // Try simple layout attributes (data-*)
      const simplePattern = new RegExp(
        `<div[^>]*data-food="${escapedFood}"[^>]*data-quantity="${escapedQuantity}"[^>]*data-calories="${itemToDelete.calories}"[^>]*>`,
        'gi'
      );
      startMatch = simplePattern.exec(content);
      
      if (!startMatch) {
        // Try alternative simple attribute order
        const simplePattern2 = new RegExp(
          `<div[^>]*data-calories="${itemToDelete.calories}"[^>]*data-food="${escapedFood}"[^>]*data-quantity="${escapedQuantity}"[^>]*>`,
          'gi'
        );
        startMatch = simplePattern2.exec(content);
      }
    }
    
    if (!startMatch) {
      return { success: false, content };
    }
    
    // Use the existing extractCompleteCard method which removes the card and returns the cleaned content
    return this.extractCompleteCard(content, startMatch.index);
  }
} 