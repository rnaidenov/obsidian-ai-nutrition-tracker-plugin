import { TFile, Notice, TAbstractFile, normalizePath } from 'obsidian';
import { FoodItem, Meal } from '../../types/nutrition';
import { PluginContext } from '../../types/plugin-context';
import * as FileUtils from '../file';
import * as LayoutGenerator from '../layout-generator';
import * as ContentParser from '../content-parser';
import { readMeals, writeMeals } from './meal-storage';
import { migrateMealToV2, isLegacyMeal, calculateTotalNutrition } from './meal-operations';

export async function saveMeal(ctx: PluginContext, name: string, foodItems: FoodItem[], description?: string, images?: string[]): Promise<Meal> {
  const meal: Meal = {
    id: FileUtils.generateMealId(),
    name: name.trim(),
    items: foodItems.map(item => {
      const { mealId: _, ...itemWithoutMealId } = item;
      return itemWithoutMealId;
    }),
    description: description?.trim(),
    images: images || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    const meals = await getMeals(ctx);
    meals.push(meal);
    await writeMeals(ctx.vault, ctx.settings, meals);

    const noteResult = await createMealNote(ctx, meal);

    if (noteResult.createdNewFile) {
      try {
        const file = ctx.vault.getAbstractFileByPath(noteResult.filePath);
        if (file instanceof TFile) {
          await ctx.app.workspace.getLeaf().openFile(file);
        }
      } catch (error) {
        console.error('Error opening newly created meal note:', error);
      }
    }

    new Notice(`✅ Meal "${name}" saved successfully`);
    return meal;
  } catch (error) {
    new Notice(`❌ Failed to save meal: ${error.message}`);
    throw new Error(`Failed to save meal: ${error.message}`);
  }
}

export async function getMeals(ctx: PluginContext): Promise<Meal[]> {
  try {
    const meals = await readMeals(ctx.vault, ctx.settings);

    const needsMigration = meals.some(isLegacyMeal);
    if (needsMigration) {
      const migratedMeals = meals.map(migrateMealToV2);
      await writeMeals(ctx.vault, ctx.settings, migratedMeals);
      return migratedMeals;
    }

    return meals;
  } catch (_error) {
    return [];
  }
}

export async function updateMeal(ctx: PluginContext, mealId: string, updates: Partial<Meal>): Promise<void> {
  try {
    const meals = await getMeals(ctx);
    const mealIndex = meals.findIndex(m => m.id === mealId);

    if (mealIndex === -1) {
      throw new Error(`Meal with ID ${mealId} not found`);
    }

    const oldMeal = meals[mealIndex];
    const updatedMeal = {
      ...oldMeal,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    meals[mealIndex] = updatedMeal;

    await writeMeals(ctx.vault, ctx.settings, meals);

    await updateMealNote(ctx, oldMeal, updatedMeal);

    new Notice(`✅ Meal "${updatedMeal.name}" updated successfully`);
  } catch (error) {
    throw new Error(`Failed to update meal: ${error.message}`);
  }
}

export async function getMealById(ctx: PluginContext, mealId: string): Promise<Meal | null> {
  try {
    const meals = await getMeals(ctx);
    return meals.find(m => m.id === mealId) || null;
  } catch (_error) {
    return null;
  }
}


export async function createMealNote(ctx: PluginContext, meal: Meal): Promise<{ createdNewFile: boolean; filePath: string }> {
  try {
    const sanitizedName = FileUtils.sanitizeMealName(meal.name);
    const filename = `${sanitizedName}.md`;
    const notePath = normalizePath(`${ctx.settings.mealStoragePath}/${filename}`);

    const content = generateMealNoteContent(ctx, meal);

    const existingFile = ctx.vault.getAbstractFileByPath(notePath);
    let createdNewFile = false;

    if (existingFile && existingFile instanceof TFile) {
      await ctx.vault.modify(existingFile, content);
    } else {
      await ctx.vault.create(notePath, content)
      createdNewFile = true;
    }

    return { createdNewFile, filePath: notePath };
  } catch (error) {
    new Notice(`Warning: Failed to create meal note: ${error.message}`);
    throw error;
  }
}

async function updateMealNote(ctx: PluginContext, oldMeal: Meal, newMeal: Meal): Promise<void> {
  try {
    if (oldMeal.name !== newMeal.name) {
      await deleteMealNote(ctx, oldMeal);
    }

    await createMealNote(ctx, newMeal);
  } catch (error) {
    new Notice(`Warning: Failed to update meal note: ${error.message}`);
  }
}

async function deleteMealNote(ctx: PluginContext, meal: Meal): Promise<void> {
  try {
    const sanitizedName = FileUtils.sanitizeMealName(meal.name);
    const filename = `${sanitizedName}.md`;
    const notePath = normalizePath(`${ctx.settings.mealStoragePath}/${filename}`);

    const existingFile = ctx.vault.getAbstractFileByPath(notePath);
    if (existingFile instanceof TFile) {
      await ctx.app.fileManager.trashFile(existingFile);
    }
  } catch (error) {
    new Notice(`Warning: Failed to delete meal note: ${error.message}`);
  }
}

function generateMealNoteContent(ctx: PluginContext, meal: Meal): string {
  const totals = calculateTotalNutrition(meal.items);

  const goals = ctx.settings.nutritionGoals;

  let content = '';
  content += '## 🥗 Meal Items\n\n';
  content += LayoutGenerator.generateCardLayout(meal.items, goals, 'meal', meal.id);
  content += LayoutGenerator.generateMealProgressSummaryWithId(totals, goals, meal.id);

  return content;
}

export function isMealNote(ctx: PluginContext, file: TAbstractFile): boolean {
  return FileUtils.isMealNote(file, ctx.settings.mealStoragePath, ctx.settings.logStoragePath);
}

export async function syncMealNoteToJSON(ctx: PluginContext, file: TFile): Promise<void> {
  try {
    const content = await ctx.vault.read(file);

    if (!content.includes('data-meal-id="')) {
      return;
    }

    const parsedMeal = ContentParser.parseMealFromMarkdown(content);

    if (!parsedMeal) {
      return;
    }

    const filename = file.path.split('/').pop()?.replace('.md', '') || '';
    const mealName = FileUtils.convertFilenameToReadableName(filename);

    const meals = await getMeals(ctx);
    const mealIndex = meals.findIndex(m => m.id === parsedMeal.id);

    if (mealIndex >= 0) {
      const oldMeal = meals[mealIndex];

      const nameChanged = oldMeal.name !== mealName;

      const updatedMeal = {
        ...oldMeal,
        name: mealName,
        items: parsedMeal.items || oldMeal.items,
        description: parsedMeal.description !== undefined ? parsedMeal.description : oldMeal.description,
        updatedAt: new Date().toISOString()
      };

      meals[mealIndex] = updatedMeal;
      await writeMeals(ctx.vault, ctx.settings, meals);

      if (!nameChanged) {
        return;
      }

      await handleMealNameChange(ctx, oldMeal, updatedMeal, file);
      new Notice(`✅ Meal updated: "${oldMeal.name}" → "${updatedMeal.name}"`);
    } else {
      new Notice("⚠️ meal not found in storage - this might be an orphaned meal note");
    }

  } catch (error) {
    new Notice(`❌ Failed to sync meal changes: ${error.message}`);
    throw error;
  }
}

export async function updateMealItem(ctx: PluginContext, entryId: string, newItem: FoodItem): Promise<void> {
  try {
    const meals = await getMeals(ctx);
    let mealFound = false;

    for (const meal of meals) {
      const itemIndex = meal.items.findIndex(item => item.id === entryId);

      if (itemIndex >= 0) {
        const { mealId: _mealId, timestamp: _timestamp, ...itemWithoutMealData } = newItem;
        meal.items[itemIndex] = { ...itemWithoutMealData, id: entryId };
        meal.updatedAt = new Date().toISOString();

        await writeMeals(ctx.vault, ctx.settings, meals);
        await createMealNote(ctx, meal);

        new Notice(`✅ Meal item updated: ${newItem.food} in "${meal.name}"`);
        mealFound = true;
        break;
      }
    }

    if (!mealFound) {
      new Notice('⚠️ could not find the meal containing this item');
    }

  } catch (error) {
    new Notice(`❌ Failed to update meal item: ${error.message}`);
    throw error;
  }
}

export async function deleteMealItem(ctx: PluginContext, entryId: string): Promise<void> {
  try {
    const meals = await getMeals(ctx);
    let mealFound = false;

    for (const meal of meals) {
      const itemIndex = meal.items.findIndex(item => item.id === entryId);

      if (itemIndex >= 0) {
        const [deletedItem] = meal.items.splice(itemIndex, 1);
        meal.updatedAt = new Date().toISOString();

        await writeMeals(ctx.vault, ctx.settings, meals);
        await createMealNote(ctx, meal);

        new Notice(`✅ Meal item deleted: ${deletedItem.food} from "${meal.name}"`);
        mealFound = true;
        break;
      }
    }

    if (!mealFound) {
      new Notice('⚠️ could not find the meal containing this item');
    }

  } catch (error) {
    new Notice(`❌ Failed to delete meal item: ${error.message}`);
    throw error;
  }
}

export async function addItemsToMeal(ctx: PluginContext, mealId: string, items: FoodItem[]): Promise<void> {
  try {
    const meals = await getMeals(ctx);
    const mealIndex = meals.findIndex(m => m.id === mealId);

    if (mealIndex === -1) {
      throw new Error(`Meal with ID ${mealId} not found`);
    }

    const meal = meals[mealIndex];

    const cleanItems = items.map(item => {
      const { mealId: _itemMealId, timestamp: _timestamp, ...cleanItem } = item;
      return { ...cleanItem, id: cleanItem.id ?? FileUtils.generateEntryId() };
    });

    meal.items.push(...cleanItems);
    meal.updatedAt = new Date().toISOString();

    await writeMeals(ctx.vault, ctx.settings, meals);

    await createMealNote(ctx, meal);

    new Notice(`✅ ${items.length} item(s) added to meal "${meal.name}"`);

  } catch (error) {
    new Notice(`❌ Failed to add items to meal: ${error.message}`);
    throw error;
  }
}

async function handleMealNameChange(ctx: PluginContext, oldMeal: Meal, newMeal: Meal, currentFile: TFile): Promise<void> {
  try {
    const oldSanitizedName = FileUtils.sanitizeMealName(oldMeal.name);
    const oldFilename = `${oldSanitizedName}.md`;
    const oldNotePath = normalizePath(`${ctx.settings.mealStoragePath}/${oldFilename}`);

    const newSanitizedName = FileUtils.sanitizeMealName(newMeal.name);
    const newFilename = `${newSanitizedName}.md`;
    const newNotePath = normalizePath(`${ctx.settings.mealStoragePath}/${newFilename}`);

    if (currentFile.path !== newNotePath) {
      const existingNewFile = ctx.vault.getAbstractFileByPath(newNotePath);
      if (existingNewFile && existingNewFile !== currentFile) {
        if (existingNewFile instanceof TFile) {
          await ctx.app.fileManager.trashFile(existingNewFile);
        }
      }

      await ctx.vault.rename(currentFile, newNotePath);

    }

    if (oldNotePath !== currentFile.path) {
      const oldFile = ctx.vault.getAbstractFileByPath(oldNotePath);
      if (oldFile instanceof TFile && oldFile !== currentFile) {
        await ctx.app.fileManager.trashFile(oldFile);
      }
    }

  } catch (error) {
    new Notice(`Warning: Could not rename meal file: ${error.message}`);
  }
}

export async function handleFileRename(ctx: PluginContext, oldPath: string, newPath: string): Promise<void> {
  try {
    const newFilename = newPath.split('/').pop()?.replace('.md', '') || '';

    if (!newPath.startsWith(ctx.settings.mealStoragePath) || !oldPath.startsWith(ctx.settings.mealStoragePath)) {
      return;
    }

    const file = ctx.vault.getAbstractFileByPath(newPath);
    if (!(file instanceof TFile)) {
      return;
    }

    const content = await ctx.vault.read(file);
    if (!content.includes('data-meal-id="')) {
      return;
    }

    const parsedMeal = ContentParser.parseMealFromMarkdown(content);
    if (!parsedMeal || !parsedMeal.id) {
      return;
    }

    const meals = await getMeals(ctx);
    const mealIndex = meals.findIndex(m => m.id === parsedMeal.id);

    if (mealIndex >= 0) {
      const oldMeal = meals[mealIndex];

      const newMealName = FileUtils.convertFilenameToReadableName(newFilename);

      if (oldMeal.name === newMealName) {
        return;
      }

      const updatedMeal = {
        ...oldMeal,
        name: newMealName,
        updatedAt: new Date().toISOString()
      };

      meals[mealIndex] = updatedMeal;
      await writeMeals(ctx.vault, ctx.settings, meals);

      await createMealNote(ctx, updatedMeal);
    }

  } catch (error) {
    new Notice(`Warning: Could not sync meal name change: ${error.message}`);
  }
}

