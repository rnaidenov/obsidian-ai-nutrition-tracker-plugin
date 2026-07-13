export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
}

export interface FoodItem {
  id?: string;
  food: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  emoji?: string;
  timestamp?: string;
  mealId?: string; // Reference to saved meal if this item is from a meal
}

// A FoodItem persisted in a daily food log's JSON store. Unlike a bare
// FoodItem, the id is required — it's the stable, render-independent key
// used to look up an entry for edit/delete.
export interface FoodLogEntry extends FoodItem {
  id: string;
}

export interface FoodLog {
  date: string;
  entries: FoodLogEntry[];
}

export type ServingUnitType = '100g' | 'piece' | 'serving' | 'custom';

export interface ServingUnit {
  type: ServingUnitType;
  amount: number;
  label: string;
  customUnit?: string;
}

export interface Meal {
  id: string;
  name: string;
  items: FoodItem[];
  description?: string;
  images?: string[]; // Paths to saved images
  createdAt: string;
  updatedAt: string;
  servingUnit?: ServingUnit;
  baselineNutrition?: NutritionData;
  version?: number;
}

export interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

 