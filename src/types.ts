export interface Recipe {
  id: string;
  title: string;
  description: string;
  image: string;
  cookTime: number; // minutes
  servings: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  ingredients: string[];
  steps: string[];
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QueueItem {
  id: string;
  recipe: Recipe;
  addedAt: string;
  plannedDate?: string;
}

export interface HistoryItem {
  id: string;
  recipe: Recipe;
  cookedAt: string;
  rating?: number;
  notes?: string;
}

export interface UserPreferences {
  maxCalories: number;
  maxCookTime: number;
  excludeTags: string[];
  preferredDifficulty: ('easy' | 'medium' | 'hard')[];
}
