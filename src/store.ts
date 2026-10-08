import { useState, useEffect, useCallback } from 'react';
import { Recipe, QueueItem, HistoryItem, UserPreferences } from './types';
import { recipes } from './data';

const STORAGE_KEYS = {
  queue: 'swypemeal_queue',
  history: 'swypemeal_history',
  preferences: 'swypemeal_preferences',
  swiped: 'swypemeal_swiped',
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
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    loadFromStorage(STORAGE_KEYS.preferences, {
      maxCalories: 800,
      maxCookTime: 60,
      excludeTags: [],
      preferredDifficulty: ['easy', 'medium', 'hard'],
    })
  );

  useEffect(() => saveToStorage(STORAGE_KEYS.queue, queue), [queue]);
  useEffect(() => saveToStorage(STORAGE_KEYS.history, history), [history]);
  useEffect(() => saveToStorage(STORAGE_KEYS.swiped, swipedIds), [swipedIds]);
  useEffect(() => saveToStorage(STORAGE_KEYS.preferences, preferences), [preferences]);

  const availableRecipes = recipes.filter(
    (r) =>
      !swipedIds.includes(r.id) &&
      !queue.find((q) => q.recipe.id === r.id) &&
      r.calories <= preferences.maxCalories &&
      r.cookTime <= preferences.maxCookTime &&
      preferences.preferredDifficulty.includes(r.difficulty) &&
      !r.tags.some((t) => preferences.excludeTags.includes(t))
  );

  const addToQueue = useCallback((recipe: Recipe) => {
    const item: QueueItem = {
      id: Date.now().toString(),
      recipe,
      addedAt: new Date().toISOString(),
    };
    setQueue((prev) => [...prev, item]);
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const moveToHistory = useCallback((queueItemId: string, rating?: number, notes?: string) => {
    const item = queue.find((q) => q.id === queueItemId);
    if (item) {
      const historyItem: HistoryItem = {
        id: Date.now().toString(),
        recipe: item.recipe,
        cookedAt: new Date().toISOString(),
        rating,
        notes,
      };
      setHistory((prev) => [historyItem, ...prev]);
      setQueue((prev) => prev.filter((q) => q.id !== queueItemId));
    }
  }, [queue]);

  const markSwiped = useCallback((recipeId: string) => {
    setSwipedIds((prev) => [...prev, recipeId]);
  }, []);

  const resetSwiped = useCallback(() => {
    setSwipedIds([]);
  }, []);

  const removeFromHistory = useCallback((id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return {
    queue,
    history,
    availableRecipes,
    preferences,
    setPreferences,
    addToQueue,
    removeFromQueue,
    moveToHistory,
    markSwiped,
    resetSwiped,
    removeFromHistory,
  };
}
