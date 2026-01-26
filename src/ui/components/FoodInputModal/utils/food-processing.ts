import { Notice, TFile } from 'obsidian';
import { FoodItem, Meal, ServingUnit, ServingUnitType, MealCategory } from '../../../../types/nutrition';
import { PluginContext } from '../../../../types/plugin-context';
import * as LLM from '../../../../utils/llm';
import * as FoodLogOps from '../../../../utils/food-log/manager';
import * as FileUtils from '../../../../utils/file';
import * as MealOps from '../../../../utils/meal/manager';
import { readMeals, writeMeals } from '../../../../utils/meal/meal-storage';
import { createMeal, createMealPortionEntry } from '../../../../utils/meal/meal-operations';

// Parameters interface
export interface FoodProcessingParams {
  selectedMeals: Meal[];
  mealServings: Map<string, number>;
  description: string;
  images: File[];
  saveAsMeal: boolean;
  mealName: string;
  servingUnitType: ServingUnitType;
  customServingLabel: string;
  initialData?: FoodItem;
  editingContext?: 'foodlog' | 'meal';
  targetMealId?: string;
  selectedDate?: string;
  selectedTime?: string;
  selectedCategory?: MealCategory;
}

// Result interface
export interface FoodProcessingResult {
  success: boolean;
  message?: string;
}

// Main food processing function
export async function processFood(
  ctx: PluginContext,
  params: FoodProcessingParams
): Promise<FoodProcessingResult> {
  const {
    selectedMeals,
    mealServings,
    description,
    images,
    saveAsMeal,
    mealName,
    servingUnitType,
    customServingLabel,
    initialData,
    editingContext,
    targetMealId,
    selectedDate,
    selectedTime,
    selectedCategory
  } = params;

  try {
    // Validate inputs
    const hasSelectedMeals = selectedMeals.length > 0;
    const hasAdditionalInput = description.trim().length > 0 || images.length > 0;

    if (targetMealId) {
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

    if (images.length > 0 && !ctx.settings.openRouterApiKey) {
      return { success: false, message: 'OpenRouter API key not configured. Please check plugin settings.' };
    }

    // Process food items
    const allFoodItems: FoodItem[] = [];

    // Add selected meals (but not when adding to a specific meal to avoid duplication)
    if (hasSelectedMeals && !targetMealId) {
      selectedMeals.forEach(meal => {
        const servings = mealServings.get(meal.id) || 1;
        const mealEntry = createMealPortionEntry(meal, servings);

        // Add timestamp and category if provided
        if (selectedTime) {
          mealEntry.timestamp = selectedTime;
        }
        if (selectedCategory) {
          mealEntry.mealCategory = selectedCategory;
        }

        allFoodItems.push(mealEntry);
      });
    }

    // Process additional input via LLM
    if (hasAdditionalInput) {
      const processingMessage = `🤖 Processing ${description ? 'description' : ''}${description && images.length > 0 ? ' and ' : ''}${images.length > 0 ? `${images.length} image(s)` : ''}...`;
      new Notice(processingMessage);

      const additionalItems = await LLM.processFood(ctx, description, images);
      if (additionalItems.length === 0) {
        return { success: false, message: 'No food items could be processed' };
      }

      // Add timestamp and category to each item
      additionalItems.forEach(item => {
        if (selectedTime) {
          item.timestamp = selectedTime;
        }
        if (selectedCategory) {
          item.mealCategory = selectedCategory;
        }
      });

      allFoodItems.push(...additionalItems);
    }

    // Save images if any
    let savedImagePaths: string[] = [];
    if (images.length > 0) {
      try {
        savedImagePaths = await Promise.all(
          images.map(image => FileUtils.saveImage(ctx, image, ctx.settings.imageStoragePath))
        );
        new Notice(`${savedImagePaths.length} image(s) saved successfully`);
      } catch (error) {
        console.error('Error saving images:', error);
        new Notice('Warning: failed to save some images, but continuing with food processing');
      }
    }

    // Save meal template if requested
    if (saveAsMeal && mealName.trim()) {
      try {
        const servingUnit: ServingUnit = {
          type: servingUnitType,
          amount: servingUnitType === '100g' ? 100 : 1,
          label: getServingUnitLabel(servingUnitType, customServingLabel),
          customUnit: servingUnitType === 'custom' ? customServingLabel : undefined,
        };

        const mealId = FileUtils.generateMealId();
        const meal = createMeal(mealId, mealName, allFoodItems, servingUnit, description, savedImagePaths);

        const meals = await readMeals(ctx.vault, ctx.settings);
        meals.push(meal);
        await writeMeals(ctx.vault, ctx.settings, meals);

        await MealOps.createMealNote(ctx, meal);

        new Notice(`✅ Meal "${mealName}" saved with ${servingUnit.label}`);
      } catch (error) {
        console.error('Error saving meal:', error);
        new Notice('Warning: failed to save meal, but continuing with food processing');
      }
    }

    // Handle editing vs creating
    if (initialData) {
      if (editingContext === 'meal') {
        // Update meal item
        const newItem = allFoodItems[0]; // Use first item for editing
        if (newItem) {
          await MealOps.updateMealItem(ctx, initialData, newItem);
          return { success: true, message: `✅ Meal item updated: ${newItem.food}` };
        }
      } else {
        // Update food log entry
        await FoodLogOps.createOrUpdateFoodLog(ctx, allFoodItems, initialData, selectedDate);
        return { success: true, message: `✅ Food log updated` };
      }
    } else if (targetMealId) {
      // Add items to specific meal
      try {
        await MealOps.addItemsToMeal(ctx, targetMealId, allFoodItems);
        return { success: true, message: `✅ Items added to meal successfully` };
      } catch (error) {
        console.error('Error adding items to meal:', error);
        return { success: false, message: `Failed to add items to meal: ${error.message}` };
      }
    } else {
      // Create new entry
      const result = await FoodLogOps.createOrUpdateFoodLog(ctx, allFoodItems, undefined, selectedDate);
      if (result.createdNewFile) {
        // Open the newly created food log file
        try {
          const file = ctx.app.vault.getAbstractFileByPath(result.filePath);
          if (file instanceof TFile) {
            await ctx.app.workspace.getLeaf().openFile(file);
          }
        } catch (error) {
          console.error('Error opening newly created food log:', error);
        }
      }
      return { success: true, message: `✅ Food log created with ${allFoodItems.length} item(s)` };
    }

    return { success: true };
  } catch (error) {
    console.error('Error processing food:', error);
    return handleError(error);
  }
}

// Helper function: Handle errors
export function handleError(error: unknown): FoodProcessingResult {
  const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
  if (errorMessage.includes('API key')) {
    return { success: false, message: 'API Error: Please check your OpenRouter API key in settings' };
  } else if (errorMessage.includes('quota') || errorMessage.includes('credits')) {
    return { success: false, message: 'API Error: Insufficient credits or quota exceeded' };
  } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return { success: false, message: 'Network Error: Please check your internet connection' };
  } else {
    return { success: false, message: `Error processing food: ${errorMessage}` };
  }
}

// Helper function: Get serving unit label
export function getServingUnitLabel(type: ServingUnitType, customLabel: string): string {
  switch (type) {
    case '100g':
      return 'per 100g';
    case 'piece':
      return 'per piece';
    case 'serving':
      return 'per serving';
    case 'custom':
      return customLabel ? `per ${customLabel}` : 'per serving';
    default:
      return 'per serving';
  }
}
