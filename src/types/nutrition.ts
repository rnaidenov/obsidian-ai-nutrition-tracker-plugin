export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
}

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
}

export interface Meal {
  id: string;
  name: string;
  items: FoodItem[];
  description?: string;
  images?: string[]; // Paths to saved images
  createdAt: string;
  updatedAt: string;
}

export interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

 