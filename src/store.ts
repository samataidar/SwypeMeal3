import { useState, useEffect, useCallback } from 'react';
import { Recipe, QueueItem, HistoryItem, UserPreferences } from './types';
import { recipes as defaultRecipes } from './data';
import { api } from './api';

const STORAGE_KEYS = {
  queue: 'swypemeal_queue',
  history: 'swypemeal_history',
  preferences: 'swypemeal_preferences',
  swiped: 'swypemeal_swiped',
  customRecipes: 'swypemeal_custom_recipes',
};

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

export function useStore() {
  const userId = api.getUserId();

  const [queue, setQueue] = useState<QueueItem[]>(() => loadFromStorage(STORAGE_KEYS.queue, []));
  const [history, setHistory] = useState<HistoryItem[]>(() => loadFromStorage(STORAGE_KEYS.history, []));
  const [swipedIds, setSwipedIds] = useState<string[]>(() => loadFromStorage(STORAGE_KEYS.swiped, []));
  const [customRecipes, setCustomRecipes] = useState<Recipe[]>(() => loadFromStorage(STORAGE_KEYS.customRecipes, []));
  const [preferences, setPreferencesState] = useState<UserPreferences>(() =>
    loadFromStorage(STORAGE_KEYS.preferences, {
      maxCalories: 800,
      maxCookTime: 60,
      excludeTags: [],
      preferredDifficulty: ['easy', 'medium', 'hard'],
    })
  );

  const allRecipes = [...defaultRecipes, ...customRecipes];

  useEffect(() => saveToStorage(STORAGE_KEYS.queue, queue), [queue]);
  useEffect(() => saveToStorage(STORAGE_KEYS.history, history), [history]);
  useEffect(() => saveToStorage(STORAGE_KEYS.swiped, swipedIds), [swipedIds]);
  useEffect(() => saveToStorage(STORAGE_KEYS.customRecipes, customRecipes), [customRecipes]);
  useEffect(() => saveToStorage(STORAGE_KEYS.preferences, preferences), [preferences]);

  const availableRecipes = allRecipes.filter(
    (r) =>
      !swipedIds.includes(r.id) &&
      !queue.find((q) => q.recipe.id === r.id) &&
      r.calories <= preferences.maxCalories &&
      r.cookTime <= preferences.maxCookTime &&
      preferences.preferredDifficulty.includes(r.difficulty) &&
      !r.tags.some((t) => preferences.excludeTags.includes(t))
  );

  const addToQueue = useCallback(async (recipe: Recipe) => {
    setQueue((prev) => {
      if (prev.find((item) => item.recipe.id === recipe.id)) return prev;
      const item: QueueItem = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        recipe,
        addedAt: new Date().toISOString(),
      };
      return [...prev, item];
    });

    try {
      await api.addToQueue(recipe.id);
    } catch (error) {
      console.warn('Failed to sync queue to backend');
    }
  }, []);

  const removeFromQueue = useCallback(async (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
    try {
      await api.removeFromQueue(id);
    } catch (error) {
      console.warn('Failed to sync removal to backend');
    }
  }, []);

  const moveQueueUp = useCallback((id: string) => {
    setQueue((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index <= 0) return prev;
      const newQueue = [...prev];
      [newQueue[index - 1], newQueue[index]] = [newQueue[index], newQueue[index - 1]];
      return newQueue;
    });
  }, []);

  const moveQueueDown = useCallback((id: string) => {
    setQueue((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index === -1 || index >= prev.length - 1) return prev;
      const newQueue = [...prev];
      [newQueue[index], newQueue[index + 1]] = [newQueue[index + 1], newQueue[index]];
      return newQueue;
    });
  }, []);

  const moveToHistory = useCallback(async (queueItemId: string, rating?: number, notes?: string) => {
    let cookedRecipe: Recipe | null = null;

    setQueue((prevQueue) => {
      const item = prevQueue.find((q) => q.id === queueItemId);
      if (!item) return prevQueue;
      cookedRecipe = item.recipe;

      const historyItem: HistoryItem = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        recipe: item.recipe,
        cookedAt: new Date().toISOString(),
        rating,
        notes,
      };
      setHistory((prevHistory) => [historyItem, ...prevHistory]);
      return prevQueue.filter((q) => q.id !== queueItemId);
    });

    if (cookedRecipe) {
      try {
        await api.markCooked(queueItemId, rating, notes);
      } catch (error) {
        console.warn('Failed to sync cook to backend');
      }
    }
  }, []);

  const markSwiped = useCallback(async (recipeId: string) => {
    setSwipedIds((prev) => {
      if (prev.includes(recipeId)) return prev;
      return [...prev, recipeId];
    });

    try {
      await api.swipe(recipeId, 'dislike');
    } catch (error) {
      console.warn('Failed to sync swipe to backend');
    }
  }, []);

  const resetSwiped = useCallback(async () => {
    setSwipedIds([]);
    try {
      await api.resetSwipes();
    } catch (error) {
      console.warn('Failed to sync reset to backend');
    }
  }, []);

  const removeFromHistory = useCallback(async (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
    try {
      await api.removeFromHistory(id);
    } catch (error) {
      console.warn('Failed to sync history removal to backend');
    }
  }, []);

  const setPreferences = useCallback(async (prefs: UserPreferences) => {
    setPreferencesState(prefs);
    try {
      await api.updatePreferences({
        max_calories: prefs.maxCalories,
        max_cook_time: prefs.maxCookTime,
        exclude_tags: prefs.excludeTags,
        preferred_difficulty: prefs.preferredDifficulty,
      });
    } catch (error) {
      console.warn('Failed to sync preferences to backend');
    }
  }, []);

  const submitRecipe = useCallback(async (recipe: Omit<Recipe, 'id'>) => {
    const localRecipe: Recipe = {
      ...recipe,
      id: 'pending_' + Date.now().toString() + Math.random().toString(36).substr(2, 5),
    };

    try {
      await api.submitRecipe({
        title: recipe.title,
        description: recipe.description,
        image: recipe.image,
        cook_time: recipe.cookTime,
        servings: recipe.servings,
        calories: recipe.calories,
        protein: recipe.protein,
        fat: recipe.fat,
        carbs: recipe.carbs,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        tags: recipe.tags,
        difficulty: recipe.difficulty,
      });
    } catch (error) {
      console.warn('Failed to submit recipe to backend');
    }

    return localRecipe;
  }, []);

  return {
    queue,
    history,
    availableRecipes,
    preferences,
    customRecipes,
    setPreferences,
    addToQueue,
    removeFromQueue,
    moveQueueUp,
    moveQueueDown,
    moveToHistory,
    markSwiped,
    resetSwiped,
    removeFromHistory,
    submitRecipe,
  };
}
