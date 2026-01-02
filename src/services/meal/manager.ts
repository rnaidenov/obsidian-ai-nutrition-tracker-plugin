import { TFile, Vault, Notice, TAbstractFile, App, normalizePath } from 'obsidian';
import { FoodItem, Meal } from '../../types/nutrition';
import { PluginSettings } from '../../types/settings';
import { FileUtils } from '../file-utils';
import { LayoutGenerator } from '../layout-generator';
import { ContentParser } from '../content-parser';
import { readMeals, writeMeals, getMealsFilePath, ensureMealDirectoryExists } from './meal-storage';
import { migrateMealToV2, isLegacyMeal } from './meal-operations';

export interface MealDeps {
  vault: Vault;
  app: App;
  settings: PluginSettings;
}

export async function saveMeal(deps: MealDeps, name: string, foodItems: FoodItem[], description?: string, images?: string[]): Promise<Meal> {
  const fileUtils = new FileUtils(deps.vault);

  const meal: Meal = {
    id: fileUtils.generateMealId(),
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
    const meals = await getMeals(deps);
    meals.push(meal);
    await writeMeals(deps.vault, deps.settings, meals);

    const noteResult = await createMealNote(deps, meal);

    if (noteResult.createdNewFile) {
      try {
        const file = deps.vault.getAbstractFileByPath(noteResult.filePath);
        if (file instanceof TFile) {
          await deps.app.workspace.getLeaf().openFile(file);
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

export async function getMeals(deps: MealDeps): Promise<Meal[]> {
  try {
    const meals = await readMeals(deps.vault, deps.settings);

    const needsMigration = meals.some(isLegacyMeal);
    if (needsMigration) {
      const migratedMeals = meals.map(migrateMealToV2);
      await writeMeals(deps.vault, deps.settings, migratedMeals);
      return migratedMeals;
    }

    return meals;
  } catch (_error) {
    return [];
  }
}

export async function updateMeal(deps: MealDeps, mealId: string, updates: Partial<Meal>): Promise<void> {
  try {
    const meals = await getMeals(deps);
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

    await writeMeals(deps.vault, deps.settings, meals);

    await updateMealNote(deps, oldMeal, updatedMeal);

    new Notice(`✅ Meal "${updatedMeal.name}" updated successfully`);
  } catch (error) {
    throw new Error(`Failed to update meal: ${error.message}`);
  }
}

export async function getMealById(deps: MealDeps, mealId: string): Promise<Meal | null> {
  try {
    const meals = await getMeals(deps);
    return meals.find(m => m.id === mealId) || null;
  } catch (_error) {
    return null;
  }
}


export async function createMealNote(deps: MealDeps, meal: Meal): Promise<{ createdNewFile: boolean; filePath: string }> {
  try {
    const fileUtils = new FileUtils(deps.vault);
    const sanitizedName = fileUtils.sanitizeMealName(meal.name);
    const filename = `${sanitizedName}.md`;
    const notePath = normalizePath(`${deps.settings.mealStoragePath}/${filename}`);

    const content = generateMealNoteContent(deps, meal);

    const existingFile = deps.vault.getAbstractFileByPath(notePath);
    let createdNewFile = false;

    if (existingFile && existingFile instanceof TFile) {
      await deps.vault.modify(existingFile, content);
    } else {
      await deps.vault.create(notePath, content)
      createdNewFile = true;
    }

    return { createdNewFile, filePath: notePath };
  } catch (error) {
    new Notice(`Warning: Failed to create meal note: ${error.message}`);
    throw error;
  }
}

async function updateMealNote(deps: MealDeps, oldMeal: Meal, newMeal: Meal): Promise<void> {
  try {
    if (oldMeal.name !== newMeal.name) {
      await deleteMealNote(deps, oldMeal);
    }

    await createMealNote(deps, newMeal);
  } catch (error) {
    new Notice(`Warning: Failed to update meal note: ${error.message}`);
  }
}

async function deleteMealNote(deps: MealDeps, meal: Meal): Promise<void> {
  try {
    const fileUtils = new FileUtils(deps.vault);
    const sanitizedName = fileUtils.sanitizeMealName(meal.name);
    const filename = `${sanitizedName}.md`;
    const notePath = normalizePath(`${deps.settings.mealStoragePath}/${filename}`);

    const existingFile = deps.vault.getAbstractFileByPath(notePath);
    if (existingFile instanceof TFile) {
      await deps.app.fileManager.trashFile(existingFile);
    }
  } catch (error) {
    new Notice(`Warning: Failed to delete meal note: ${error.message}`);
  }
}

function generateMealNoteContent(deps: MealDeps, meal: Meal): string {
  const totalCalories = meal.items.reduce((sum, item) => sum + item.calories, 0);
  const totalProtein = meal.items.reduce((sum, item) => sum + item.protein, 0);
  const totalCarbs = meal.items.reduce((sum, item) => sum + item.carbs, 0);
  const totalFat = meal.items.reduce((sum, item) => sum + item.fat, 0);

  const totals = {
    calories: totalCalories,
    protein: totalProtein,
    carbs: totalCarbs,
    fat: totalFat
  };

  const layoutGenerator = new LayoutGenerator(deps.settings);

  let content = '';
  content += '## 🥗 Meal Items\n\n';
  content += layoutGenerator.generateCardLayout(meal.items, 'meal', meal.id);
  content += layoutGenerator.generateMealProgressSummaryWithId(totals, meal.id);

  return content;
}

export function isMealNote(deps: MealDeps, file: TAbstractFile): boolean {
  const fileUtils = new FileUtils(deps.vault);
  return fileUtils.isMealNote(file, deps.settings.mealStoragePath, deps.settings.logStoragePath);
}

export async function syncMealNoteToJSON(deps: MealDeps, file: TFile): Promise<void> {
  try {
    const content = await deps.vault.read(file);

    if (!content.includes('data-meal-id="')) {
      return;
    }

    const contentParser = new ContentParser();
    const parsedMeal = contentParser.parseMealFromMarkdown(content);

    if (!parsedMeal) {
      return;
    }

    const filename = file.path.split('/').pop()?.replace('.md', '') || '';
    const fileUtils = new FileUtils(deps.vault);
    const mealName = fileUtils.convertFilenameToReadableName(filename);

    const meals = await getMeals(deps);
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
      await writeMeals(deps.vault, deps.settings, meals);

      if (!nameChanged) {
        return;
      }

      await handleMealNameChange(deps, oldMeal, updatedMeal, file);
      new Notice(`✅ Meal updated: "${oldMeal.name}" → "${updatedMeal.name}"`);
    } else {
      new Notice("⚠️ meal not found in storage - this might be an orphaned meal note");
    }

  } catch (error) {
    new Notice(`❌ Failed to sync meal changes: ${error.message}`);
    throw error;
  }
}

export async function updateMealItem(deps: MealDeps, originalItem: { food: string, quantity: string, calories: number, protein: number, carbs: number, fat: number }, newItem: FoodItem): Promise<void> {
  try {
    const meals = await getMeals(deps);
    let mealFound = false;

    for (const meal of meals) {
      const itemIndex = meal.items.findIndex(item =>
        item.food === originalItem.food &&
        item.quantity === originalItem.quantity &&
        item.calories === originalItem.calories
      );

      if (itemIndex >= 0) {
        const { mealId: _mealId, timestamp: _timestamp, ...itemWithoutMealData } = newItem;
        meal.items[itemIndex] = itemWithoutMealData;
        meal.updatedAt = new Date().toISOString();

        await writeMeals(deps.vault, deps.settings, meals);

        await createMealNote(deps, meal);

        const fileUtils = new FileUtils(deps.vault);
        const mealFileName = fileUtils.sanitizeMealName(meal.name) + '.md';
        const mealFilePath = normalizePath(`${deps.settings.mealStoragePath}/${mealFileName}`);
        const mealFile = deps.vault.getAbstractFileByPath(mealFilePath);
        if (mealFile instanceof TFile) {
          window.setTimeout(() => {
            void syncMealNoteToJSON(deps, mealFile);
          }, 100);
        }

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

export async function deleteMealItem(deps: MealDeps, itemToDelete: { food: string, quantity: string, calories: number, protein: number, carbs: number, fat: number }): Promise<void> {
  try {
    const meals = await getMeals(deps);
    let mealFound = false;

    for (const meal of meals) {
      const itemIndex = meal.items.findIndex(item =>
        item.food === itemToDelete.food &&
        item.quantity === itemToDelete.quantity &&
        item.calories === itemToDelete.calories
      );

      if (itemIndex >= 0) {
        meal.items.splice(itemIndex, 1);
        meal.updatedAt = new Date().toISOString();

        await writeMeals(deps.vault, deps.settings, meals);

        await createMealNote(deps, meal);

        const fileUtils = new FileUtils(deps.vault);
        const mealFileName = fileUtils.sanitizeMealName(meal.name) + '.md';
        const mealFilePath = normalizePath(`${deps.settings.mealStoragePath}/${mealFileName}`);
        const mealFile = deps.vault.getAbstractFileByPath(mealFilePath);
        if (mealFile instanceof TFile) {
          window.setTimeout(() => {
            void syncMealNoteToJSON(deps, mealFile);
          }, 100);
        }

        new Notice(`✅ Meal item deleted: ${itemToDelete.food} from "${meal.name}"`);
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

export async function addItemsToMeal(deps: MealDeps, mealId: string, items: FoodItem[]): Promise<void> {
  try {
    const meals = await getMeals(deps);
    const mealIndex = meals.findIndex(m => m.id === mealId);

    if (mealIndex === -1) {
      throw new Error(`Meal with ID ${mealId} not found`);
    }

    const meal = meals[mealIndex];

    const cleanItems = items.map(item => {
      const { mealId: _itemMealId, timestamp: _timestamp, ...cleanItem } = item;
      return cleanItem;
    });

    meal.items.push(...cleanItems);
    meal.updatedAt = new Date().toISOString();

    await writeMeals(deps.vault, deps.settings, meals);

    await createMealNote(deps, meal);

    const fileUtils = new FileUtils(deps.vault);
    const mealFileName = fileUtils.sanitizeMealName(meal.name) + '.md';
    const mealFilePath = normalizePath(`${deps.settings.mealStoragePath}/${mealFileName}`);
    const mealFile = deps.vault.getAbstractFileByPath(mealFilePath);
    if (mealFile instanceof TFile) {
      window.setTimeout(() => {
        void syncMealNoteToJSON(deps, mealFile);
      }, 100);
    }

    new Notice(`✅ ${items.length} item(s) added to meal "${meal.name}"`);

  } catch (error) {
    new Notice(`❌ Failed to add items to meal: ${error.message}`);
    throw error;
  }
}

async function handleMealNameChange(deps: MealDeps, oldMeal: Meal, newMeal: Meal, currentFile: TFile): Promise<void> {
  try {
    const fileUtils = new FileUtils(deps.vault);
    const oldSanitizedName = fileUtils.sanitizeMealName(oldMeal.name);
    const oldFilename = `${oldSanitizedName}.md`;
    const oldNotePath = normalizePath(`${deps.settings.mealStoragePath}/${oldFilename}`);

    const newSanitizedName = fileUtils.sanitizeMealName(newMeal.name);
    const newFilename = `${newSanitizedName}.md`;
    const newNotePath = normalizePath(`${deps.settings.mealStoragePath}/${newFilename}`);

    if (currentFile.path !== newNotePath) {
      const existingNewFile = deps.vault.getAbstractFileByPath(newNotePath);
      if (existingNewFile && existingNewFile !== currentFile) {
        if (existingNewFile instanceof TFile) {
          await deps.app.fileManager.trashFile(existingNewFile);
        }
      }

      await deps.vault.rename(currentFile, newNotePath);

    }

    if (oldNotePath !== currentFile.path) {
      const oldFile = deps.vault.getAbstractFileByPath(oldNotePath);
      if (oldFile instanceof TFile && oldFile !== currentFile) {
        await deps.app.fileManager.trashFile(oldFile);
      }
    }

  } catch (error) {
    new Notice(`Warning: Could not rename meal file: ${error.message}`);
  }
}

export async function handleFileRename(deps: MealDeps, oldPath: string, newPath: string): Promise<void> {
  try {
    const newFilename = newPath.split('/').pop()?.replace('.md', '') || '';

    if (!newPath.startsWith(deps.settings.mealStoragePath) || !oldPath.startsWith(deps.settings.mealStoragePath)) {
      return;
    }

    const file = deps.vault.getAbstractFileByPath(newPath);
    if (!(file instanceof TFile)) {
      return;
    }

    const content = await deps.vault.read(file);
    if (!content.includes('data-meal-id="')) {
      return;
    }

    const contentParser = new ContentParser();
    const parsedMeal = contentParser.parseMealFromMarkdown(content);
    if (!parsedMeal || !parsedMeal.id) {
      return;
    }

    const meals = await getMeals(deps);
    const mealIndex = meals.findIndex(m => m.id === parsedMeal.id);

    if (mealIndex >= 0) {
      const oldMeal = meals[mealIndex];

      const fileUtils = new FileUtils(deps.vault);
      const newMealName = fileUtils.convertFilenameToReadableName(newFilename);

      if (oldMeal.name === newMealName) {
        return;
      }

      const updatedMeal = {
        ...oldMeal,
        name: newMealName,
        updatedAt: new Date().toISOString()
      };

      meals[mealIndex] = updatedMeal;
      await writeMeals(deps.vault, deps.settings, meals);

      await createMealNote(deps, updatedMeal);
    }

  } catch (error) {
    new Notice(`Warning: Could not sync meal name change: ${error.message}`);
  }
}

