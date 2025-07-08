import { Notice } from 'obsidian';
import { FoodItem, Meal } from '../../../../types/nutrition';
import { PluginSettings } from '../../../../types/settings';
import { LLMService } from '../../../../services/llm-service';
import { FileService } from '../../../../services/file-service';

export class FoodProcessor {
  constructor(
    private settings: PluginSettings,
    private llmService: LLMService,
    private fileService: FileService
  ) {}

  async processFood(
    selectedMeals: Meal[],
    description: string,
    images: File[],
    saveAsMeal: boolean,
    mealName: string,
    initialData?: FoodItem,
    editingContext?: 'foodlog' | 'meal',
    targetMealId?: string
  ): Promise<{ success: boolean; message?: string }> {
    console.log('🔄 FoodProcessor.processFood called with:', {
      selectedMeals: selectedMeals.length,
      description,
      images: images.length,
      saveAsMeal,
      mealName,
      hasInitialData: !!initialData,
      editingContext,
      targetMealId
    });
    
    try {
      // Validate inputs
      const hasSelectedMeals = selectedMeals.length > 0;
      const hasAdditionalInput = description.trim().length > 0 || images.length > 0;
      
      if (targetMealId) {
        console.log('🎯 Processing for targetMealId:', targetMealId);
        // When adding to a specific meal, we just need additional input
        if (!hasAdditionalInput) {
          return { success: false, message: 'Please add food description or images to add to the meal' };
        }
      } else {
        // Normal flow: need meals or additional input
        if (!hasSelectedMeals && !hasAdditionalInput) {
          return { success: false, message: 'Please select meals or add additional food description/images' };
        }
      }

      if (saveAsMeal && !mealName.trim()) {
        return { success: false, message: 'Please enter a meal name' };
      }

      if (images.length > 0 && !this.settings.openRouterApiKey) {
        return { success: false, message: 'OpenRouter API key not configured. Please check plugin settings.' };
      }

      // Process food items
      let allFoodItems: FoodItem[] = [];
      
      // Add selected meals (but not when adding to a specific meal to avoid duplication)
      if (hasSelectedMeals && !targetMealId) {
        console.log('🍽️ Adding selected meals to food items (not targeting specific meal)');
        selectedMeals.forEach(meal => {
          allFoodItems.push(...meal.items);
        });
      } else if (targetMealId) {
        console.log('🎯 Skipping selected meals because we are targeting meal:', targetMealId);
      }
      
      // Process additional input via LLM
      if (hasAdditionalInput) {
        const processingMessage = `🤖 Processing ${description ? 'description' : ''}${description && images.length > 0 ? ' and ' : ''}${images.length > 0 ? `${images.length} image(s)` : ''}...`;
        new Notice(processingMessage);
        
        const additionalItems = await this.llmService.processFood(description, images);
        if (additionalItems.length === 0) {
          return { success: false, message: 'No food items could be processed' };
        }
        
        allFoodItems.push(...additionalItems);
      }

      // Save images if any
      let savedImagePaths: string[] = [];
      if (images.length > 0) {
        try {
          savedImagePaths = await Promise.all(
            images.map(image => this.fileService.saveImage(image))
          );
          new Notice(`${savedImagePaths.length} image(s) saved successfully`);
        } catch (error) {
          console.error('Error saving images:', error);
          new Notice('Warning: Failed to save some images, but continuing with food processing');
        }
      }

      // Save meal template if requested
      if (saveAsMeal && mealName.trim()) {
        try {
          await this.fileService.saveMeal(mealName, allFoodItems, description, savedImagePaths);
          new Notice(`✅ Meal "${mealName}" saved successfully`);
        } catch (error) {
          console.error('Error saving meal:', error);
          new Notice('Warning: Failed to save meal, but continuing with food processing');
        }
      }

      // Handle editing vs creating
      if (initialData) {
        if (editingContext === 'meal') {
          // Update meal item
          const newItem = allFoodItems[0]; // Use first item for editing
          if (newItem) {
            await this.fileService.updateMealItem(initialData, newItem);
            return { success: true, message: `✅ Meal item updated: ${newItem.food}` };
          }
        } else {
          // Update food log entry
          await this.fileService.createOrUpdateFoodLog(allFoodItems, initialData);
          return { success: true, message: `✅ Food log updated` };
        }
      } else if (targetMealId) {
        // Add items to specific meal
        console.log('🎯 Adding items to specific meal:', targetMealId, 'Items:', allFoodItems.length);
        try {
          await this.fileService.addItemsToMeal(targetMealId, allFoodItems);
          return { success: true, message: `✅ Items added to meal successfully` };
        } catch (error) {
          console.error('Error adding items to meal:', error);
          return { success: false, message: `Failed to add items to meal: ${error.message}` };
        }
      } else {
        // Create new entry
        await this.fileService.createOrUpdateFoodLog(allFoodItems);
        return { success: true, message: `✅ Food log created with ${allFoodItems.length} item(s)` };
      }

      return { success: true };
    } catch (error) {
      console.error('Error processing food:', error);
      return this.handleError(error);
    }
  }

  private handleError(error: any): { success: false; message: string } {
    if (error.message.includes('API key')) {
      return { success: false, message: 'API Error: Please check your OpenRouter API key in settings' };
    } else if (error.message.includes('quota') || error.message.includes('credits')) {
      return { success: false, message: 'API Error: Insufficient credits or quota exceeded' };
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      return { success: false, message: 'Network Error: Please check your internet connection' };
    } else {
      return { success: false, message: `Error processing food: ${error.message}` };
    }
  }
} 