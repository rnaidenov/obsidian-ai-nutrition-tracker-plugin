export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
}

export type MealCategory =
  | 'breakfast'
  | 'post-breakfast'
  | 'lunch'
  | 'post-lunch'
  | 'coffee-tea'
  | 'pre-dinner'
  | 'dinner'
  | 'snacks';

export interface FoodItem {
  food: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  emoji?: string;
  timestamp?: string;
  mealId?: string; // Reference to saved meal if this item is from a meal
  mealCategory?: MealCategory; // Meal category (breakfast, lunch, dinner, etc.)
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

export interface MealCategoryInfo {
  id: MealCategory;
  label: string;
  emoji: string;
  defaultTimeRange?: { start: number; end: number }; // For auto-detect helper
}

export const MEAL_CATEGORIES: MealCategoryInfo[] = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🌅', defaultTimeRange: { start: 5, end: 10 } },
  { id: 'post-breakfast', label: 'Post Breakfast', emoji: '☕', defaultTimeRange: { start: 10, end: 12 } },
  { id: 'lunch', label: 'Lunch', emoji: '🍱', defaultTimeRange: { start: 12, end: 14 } },
  { id: 'post-lunch', label: 'Post Lunch', emoji: '🍵', defaultTimeRange: { start: 14, end: 16 } },
  { id: 'coffee-tea', label: 'Coffee/Tea', emoji: '☕', defaultTimeRange: { start: 16, end: 17 } },
  { id: 'pre-dinner', label: 'Pre Dinner', emoji: '🥗', defaultTimeRange: { start: 17, end: 19 } },
  { id: 'dinner', label: 'Dinner', emoji: '🍽️', defaultTimeRange: { start: 19, end: 22 } },
  { id: 'snacks', label: 'Snacks', emoji: '🍿' }
];

 