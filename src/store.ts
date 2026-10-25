import { useState, useEffect, useCallback } from 'react';
import { Recipe, QueueItem, HistoryItem, UserPreferences } from './types';
import { recipes as defaultRecipes } from './data';

const STORAGE_KEYS = {
  queue: 'swypemeal_queue',
  history: 'swypemeal_history',
  preferences: 'swypemeal_preferences',
  swiped: 'swypemeal_swiped',
  customRecipes: 'swypemeal_custom_recipes',
  pendingRecipes: 'swypemeal_pending_recipes',
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
  localStorage.setItem(key, JSON.stringify(value));
}

export function useStore() {
  const [queue, setQueue] = useState<QueueItem[]>(() => loadFromStorage(STORAGE_KEYS.queue, []));
  const [history, setHistory] = useState<HistoryItem[]>(() => loadFromStorage(STORAGE_KEYS.history, []));
  const [swipedIds, setSwipedIds] = useState<string[]>(() => loadFromStorage(STORAGE_KEYS.swiped, []));
  const [customRecipes, setCustomRecipes] = useState<Recipe[]>(() => loadFromStorage(STORAGE_KEYS.customRecipes, []));
  const [pendingRecipes, setPendingRecipes] = useState<Recipe[]>(() => loadFromStorage(STORAGE_KEYS.pendingRecipes, []));
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    loadFromStorage(STORAGE_KEYS.preferences, {
      maxCalories: 800,
      maxCookTime: 60,
      excludeTags: [],
      preferredDifficulty: ['easy', 'medium', 'hard'],
    })
  );

  // All available recipes = default + approved custom
  const allRecipes = [...defaultRecipes, ...customRecipes];

  useEffect(() => saveToStorage(STORAGE_KEYS.queue, queue), [queue]);
  useEffect(() => saveToStorage(STORAGE_KEYS.history, history), [history]);
  useEffect(() => saveToStorage(STORAGE_KEYS.swiped, swipedIds), [swipedIds]);
  useEffect(() => saveToStorage(STORAGE_KEYS.customRecipes, customRecipes), [customRecipes]);
  useEffect(() => saveToStorage(STORAGE_KEYS.pendingRecipes, pendingRecipes), [pendingRecipes]);
  useEffect(() => saveToStorage(STORAGE_KEYS.preferences, preferences), [preferences]);

  // Available recipes for swiping:
  // - Not swiped yet
  // - Not already in queue (no duplicates)
  // - Match filters
  const availableRecipes = allRecipes.filter(
    (r) =>
      !swipedIds.includes(r.id) &&
      !queue.find((q) => q.recipe.id === r.id) && // No duplicates in queue
      r.calories <= preferences.maxCalories &&
      r.cookTime <= preferences.maxCookTime &&
      preferences.preferredDifficulty.includes(r.difficulty) &&
      !r.tags.some((t) => preferences.excludeTags.includes(t))
  );

  // Add to queue (FIFO: push to end, check for duplicates)
  const addToQueue = useCallback((recipe: Recipe) => {
    setQueue((prev) => {
      // Check for duplicates — one recipe = one entry
      if (prev.find((item) => item.recipe.id === recipe.id)) {
        return prev;
      }
      const item: QueueItem = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        recipe,
        addedAt: new Date().toISOString(),
      };
      return [...prev, item]; // FIFO: new items go to the end
    });
  }, []);

  // Remove from queue — positions are recalculated automatically (no gaps)
  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Move item up in queue
  const moveQueueUp = useCallback((id: string) => {
    setQueue((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index <= 0) return prev;
      const newQueue = [...prev];
      [newQueue[index - 1], newQueue[index]] = [newQueue[index], newQueue[index - 1]];
      return newQueue;
    });
  }, []);

  // Move item down in queue
  const moveQueueDown = useCallback((id: string) => {
    setQueue((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index === -1 || index >= prev.length - 1) return prev;
      const newQueue = [...prev];
      [newQueue[index], newQueue[index + 1]] = [newQueue[index + 1], newQueue[index]];
      return newQueue;
    });
  }, []);

  // Atomic transaction: cook = remove from queue + add to history
  const moveToHistory = useCallback((queueItemId: string, rating?: number, notes?: string) => {
    setQueue((prevQueue) => {
      const item = prevQueue.find((q) => q.id === queueItemId);
      if (!item) return prevQueue;

      // Add to history atomically
      const historyItem: HistoryItem = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        recipe: item.recipe,
        cookedAt: new Date().toISOString(),
        rating,
        notes,
      };
      setHistory((prevHistory) => [historyItem, ...prevHistory]);

      // Remove from queue (positions auto-recalculated)
      return prevQueue.filter((q) => q.id !== queueItemId);
    });
  }, []);

  const markSwiped = useCallback((recipeId: string) => {
    setSwipedIds((prev) => {
      if (prev.includes(recipeId)) return prev;
      return [...prev, recipeId];
    });
  }, []);

  const resetSwiped = useCallback(() => {
    setSwipedIds([]);
  }, []);

  const removeFromHistory = useCallback((id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Submit a new recipe for moderation
  const submitRecipe = useCallback((recipe: Omit<Recipe, 'id'>) => {
    const newRecipe: Recipe = {
      ...recipe,
      id: 'pending_' + Date.now().toString() + Math.random().toString(36).substr(2, 5),
    };
    setPendingRecipes((prev) => [...prev, newRecipe]);
    return newRecipe;
  }, []);

  // Approve a pending recipe (moderator action)
  const approveRecipe = useCallback((recipeId: string) => {
    setPendingRecipes((prev) => {
      const recipe = prev.find((r) => r.id === recipeId);
      if (recipe) {
        // Move to custom recipes with a clean ID
        const approvedRecipe = { ...recipe, id: 'custom_' + Date.now().toString() };
        setCustomRecipes((prevCustom) => [...prevCustom, approvedRecipe]);
      }
      return prev.filter((r) => r.id !== recipeId);
    });
  }, []);

  // Reject a pending recipe
  const rejectRecipe = useCallback((recipeId: string) => {
    setPendingRecipes((prev) => prev.filter((r) => r.id !== recipeId));
  }, []);

  return {
    queue,
    history,
    availableRecipes,
    preferences,
    setPreferences,
    customRecipes,
    pendingRecipes,
    addToQueue,
    removeFromQueue,
    moveQueueUp,
    moveQueueDown,
    moveToHistory,
    markSwiped,
    resetSwiped,
    removeFromHistory,
    submitRecipe,
    approveRecipe,
    rejectRecipe,
  };
}
