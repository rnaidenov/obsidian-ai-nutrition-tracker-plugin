import { Meal, FoodItem, NutritionData, ServingUnit } from '../../types/nutrition';

export function calculateTotalNutrition(items: FoodItem[]): NutritionData {
  return items.reduce(
    (totals, item) => ({
      calories: totals.calories + item.calories,
      protein: totals.protein + item.protein,
      carbs: totals.carbs + item.carbs,
      fat: totals.fat + item.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export function scaleNutrition(nutrition: NutritionData, multiplier: number): NutritionData {
  return {
    calories: Math.round(nutrition.calories * multiplier * 10) / 10,
    protein: Math.round(nutrition.protein * multiplier * 10) / 10,
    carbs: Math.round(nutrition.carbs * multiplier * 10) / 10,
    fat: Math.round(nutrition.fat * multiplier * 10) / 10,
  };
}

export function estimateTotalGrams(items: FoodItem[]): number {
  let totalGrams = 0;

  items.forEach(item => {
    const gramsMatch = item.quantity.match(/(\d+(?:\.\d+)?)\s*g/i);
    if (gramsMatch) {
      totalGrams += parseFloat(gramsMatch[1]);
    } else {
      totalGrams += 100;
    }
  });

  return totalGrams || 100;
}

export function normalizeMealToUnit(
  items: FoodItem[],
  targetUnit: ServingUnit
): { normalizedItems: FoodItem[]; baselineNutrition: NutritionData } {
  const totalNutrition = calculateTotalNutrition(items);

  if (targetUnit.type === '100g') {
    const estimatedGrams = estimateTotalGrams(items);
    const scaleFactor = 100 / estimatedGrams;

    return {
      normalizedItems: items.map(item => ({
        ...item,
        calories: Math.round(item.calories * scaleFactor * 10) / 10,
        protein: Math.round(item.protein * scaleFactor * 10) / 10,
        carbs: Math.round(item.carbs * scaleFactor * 10) / 10,
        fat: Math.round(item.fat * scaleFactor * 10) / 10,
      })),
      baselineNutrition: scaleNutrition(totalNutrition, scaleFactor),
    };
  }

  return {
    normalizedItems: items,
    baselineNutrition: totalNutrition,
  };
}

export function calculateMealPortionNutrition(
  meal: Meal,
  servings: number
): NutritionData {
  if (!meal.baselineNutrition) {
    return scaleNutrition(calculateTotalNutrition(meal.items), servings);
  }

  return scaleNutrition(meal.baselineNutrition, servings);
}

export function createMealPortionEntry(
  meal: Meal,
  servings: number,
  timestamp?: string
): FoodItem {
  const nutrition = calculateMealPortionNutrition(meal, servings);

  let quantityStr = `${servings} serving${servings !== 1 ? 's' : ''}`;
  if (meal.servingUnit) {
    if (meal.servingUnit.type === '100g') {
      const totalGrams = servings * meal.servingUnit.amount;
      quantityStr = `${totalGrams}g`;
    } else if (meal.servingUnit.type === 'piece') {
      quantityStr = `${servings} ${meal.servingUnit.customUnit || 'piece'}${servings !== 1 ? 's' : ''}`;
    } else {
      quantityStr = `${servings} ${meal.servingUnit.label}`;
    }
  }

  const itemCount = meal.items.length;
  const itemsDesc = itemCount === 1
    ? meal.items[0].food
    : `${itemCount} items: ${meal.items.slice(0, 3).map(i => i.food).join(', ')}${itemCount > 3 ? '...' : ''}`;

  return {
    food: `${meal.name} (${itemsDesc})`,
    quantity: quantityStr,
    calories: nutrition.calories,
    protein: nutrition.protein,
    carbs: nutrition.carbs,
    fat: nutrition.fat,
    emoji: meal.items[0]?.emoji || '🍽️',
    timestamp: timestamp || new Date().toISOString(),
    mealId: meal.id,
  };
}

export function isLegacyMeal(meal: Meal): boolean {
  return !meal.version || meal.version === 1;
}

export function migrateMealToV2(meal: Meal): Meal {
  if (!isLegacyMeal(meal)) {
    return meal;
  }

  const servingUnit: ServingUnit = {
    type: 'serving',
    amount: 1,
    label: 'per serving',
  };

  const baselineNutrition = calculateTotalNutrition(meal.items);

  return {
    ...meal,
    servingUnit,
    baselineNutrition,
    version: 2,
    updatedAt: new Date().toISOString(),
  };
}

export function migrateMealsToV2(meals: Meal[]): Meal[] {
  return meals.map(migrateMealToV2);
}

export function createMeal(
  id: string,
  name: string,
  items: FoodItem[],
  servingUnit: ServingUnit,
  description?: string,
  images?: string[]
): Meal {
  const { normalizedItems, baselineNutrition } = normalizeMealToUnit(items, servingUnit);

  return {
    id,
    name: name.trim(),
    items: normalizedItems,
    description: description?.trim(),
    images: images || [],
    servingUnit,
    baselineNutrition,
    version: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
