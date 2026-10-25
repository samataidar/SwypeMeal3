import { useState, useEffect, useCallback, useRef } from 'react';
import { Recipe, QueueItem, HistoryItem, UserPreferences } from './types';
import { recipes as defaultRecipes } from './data';
import { api } from './api';

const STORAGE_KEYS = {
  queue: 'swypemeal_queue',
  history: 'swypemeal_history',
  preferences: 'swypemeal_preferences',
  swiped: 'swypemeal_swiped',
  customRecipes: 'swypemeal_custom_recipes',
  lastSync: 'swypemeal_last_sync',
  syncEnabled: 'swypemeal_sync_enabled',
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

// Map backend recipe to frontend format
function mapBackendRecipe(r: any): Recipe {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    image: r.image,
    cookTime: r.cook_time,
    servings: r.servings,
    calories: r.calories,
    protein: r.protein,
    fat: r.fat,
    carbs: r.carbs,
    ingredients: r.ingredients,
    steps: r.steps,
    tags: r.tags,
    difficulty: r.difficulty,
  };
}

function mapBackendQueueItem(q: any): QueueItem {
  return {
    id: q.id,
    recipe: mapBackendRecipe(q.recipe),
    addedAt: q.added_at,
    plannedDate: q.planned_date,
  };
}

function mapBackendHistoryItem(h: any): HistoryItem {
  return {
    id: h.id,
    recipe: mapBackendRecipe(h.recipe),
    cookedAt: h.cooked_at,
    rating: h.rating,
    notes: h.notes,
  };
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export function useStore() {
  // Local state (source of truth for UI)
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

  // Sync state
  const [syncEnabled, setSyncEnabled] = useState(() => loadFromStorage(STORAGE_KEYS.syncEnabled, true));
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSync, setLastSync] = useState<string | null>(() => loadFromStorage(STORAGE_KEYS.lastSync, null));
  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null);

  // All recipes = default + custom
  const allRecipes = [...defaultRecipes, ...customRecipes];

  // Persist to localStorage
  useEffect(() => saveToStorage(STORAGE_KEYS.queue, queue), [queue]);
  useEffect(() => saveToStorage(STORAGE_KEYS.history, history), [history]);
  useEffect(() => saveToStorage(STORAGE_KEYS.swiped, swipedIds), [swipedIds]);
  useEffect(() => saveToStorage(STORAGE_KEYS.customRecipes, customRecipes), [customRecipes]);
  useEffect(() => saveToStorage(STORAGE_KEYS.preferences, preferences), [preferences]);
  useEffect(() => saveToStorage(STORAGE_KEYS.syncEnabled, syncEnabled), [syncEnabled]);

  // Check backend availability on mount
  useEffect(() => {
    if (!syncEnabled) {
      setBackendAvailable(false);
      return;
    }

    api.healthCheck().then((available) => {
      setBackendAvailable(available);
      if (available) {
        syncFromBackend();
      }
    });
  }, [syncEnabled]);

  // Sync from backend (pull)
  const syncFromBackend = useCallback(async () => {
    if (!syncEnabled) return;

    setSyncStatus('syncing');
    try {
      // Fetch all data from backend in parallel
      const [queueRes, historyRes, prefsRes, customRes] = await Promise.allSettled([
        api.getQueue(),
        api.getHistory(),
        api.getPreferences(),
        api.getCustomRecipes(),
      ]);

      // Update queue
      if (queueRes.status === 'fulfilled') {
        const mapped = queueRes.value.queue.map(mapBackendQueueItem);
        setQueue(mapped);
      }

      // Update history
      if (historyRes.status === 'fulfilled') {
        const mapped = historyRes.value.history.map(mapBackendHistoryItem);
        setHistory(mapped);
      }

      // Update preferences
      if (prefsRes.status === 'fulfilled') {
        const prefs = prefsRes.value;
        setPreferencesState({
          maxCalories: prefs.max_calories,
          maxCookTime: prefs.max_cook_time,
          excludeTags: prefs.exclude_tags,
          preferredDifficulty: prefs.preferred_difficulty,
        });
      }

      // Update custom recipes
      if (customRes.status === 'fulfilled') {
        const mapped = customRes.value.recipes.map(mapBackendRecipe);
        setCustomRecipes(mapped);
      }

      const now = new Date().toISOString();
      setLastSync(now);
      saveToStorage(STORAGE_KEYS.lastSync, now);
      setSyncStatus('idle');
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
    }
  }, [syncEnabled]);

  // Available recipes for swiping
  const availableRecipes = allRecipes.filter(
    (r) =>
      !swipedIds.includes(r.id) &&
      !queue.find((q) => q.recipe.id === r.id) &&
      r.calories <= preferences.maxCalories &&
      r.cookTime <= preferences.maxCookTime &&
      preferences.preferredDifficulty.includes(r.difficulty) &&
      !r.tags.some((t) => preferences.excludeTags.includes(t))
  );

  // Add to queue (FIFO)
  const addToQueue = useCallback(async (recipe: Recipe) => {
    // Optimistic update (local first)
    setQueue((prev) => {
      if (prev.find((item) => item.recipe.id === recipe.id)) return prev;
      const item: QueueItem = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        recipe,
        addedAt: new Date().toISOString(),
      };
      return [...prev, item];
    });

    // Sync to backend
    if (syncEnabled && backendAvailable) {
      try {
        await api.addToQueue(recipe.id);
        // Re-sync to get server-generated ID
        await syncFromBackend();
      } catch (error) {
        console.warn('Failed to sync queue to backend, keeping local state');
      }
    }
  }, [syncEnabled, backendAvailable, syncFromBackend]);

  // Remove from queue
  const removeFromQueue = useCallback(async (id: string) => {
    // Optimistic update
    setQueue((prev) => prev.filter((item) => item.id !== id));

    // Sync to backend
    if (syncEnabled && backendAvailable) {
      try {
        await api.removeFromQueue(id);
      } catch (error) {
        console.warn('Failed to sync removal to backend');
      }
    }
  }, [syncEnabled, backendAvailable]);

  // Move up
  const moveQueueUp = useCallback((id: string) => {
    setQueue((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index <= 0) return prev;
      const newQueue = [...prev];
      [newQueue[index - 1], newQueue[index]] = [newQueue[index], newQueue[index - 1]];
      return newQueue;
    });
    // Note: manual reordering is local-only for now
    // Backend FIFO is preserved, but user's manual order is a UI preference
  }, []);

  // Move down
  const moveQueueDown = useCallback((id: string) => {
    setQueue((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index === -1 || index >= prev.length - 1) return prev;
      const newQueue = [...prev];
      [newQueue[index], newQueue[index + 1]] = [newQueue[index + 1], newQueue[index]];
      return newQueue;
    });
  }, []);

  // Atomic cook transaction
  const moveToHistory = useCallback(async (queueItemId: string, rating?: number, notes?: string) => {
    let cookedRecipe: Recipe | null = null;

    // Optimistic update
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

    // Sync to backend
    if (syncEnabled && backendAvailable && cookedRecipe) {
      try {
        await api.markCooked(queueItemId, rating, notes);
      } catch (error) {
        console.warn('Failed to sync cook to backend');
      }
    }
  }, [syncEnabled, backendAvailable]);

  // Mark swiped
  const markSwiped = useCallback(async (recipeId: string) => {
    setSwipedIds((prev) => {
      if (prev.includes(recipeId)) return prev;
      return [...prev, recipeId];
    });

    if (syncEnabled && backendAvailable) {
      try {
        await api.swipe(recipeId, 'dislike');
      } catch (error) {
        console.warn('Failed to sync swipe to backend');
      }
    }
  }, [syncEnabled, backendAvailable]);

  // Reset swipes
  const resetSwiped = useCallback(async () => {
    setSwipedIds([]);

    if (syncEnabled && backendAvailable) {
      try {
        await api.resetSwipes();
      } catch (error) {
        console.warn('Failed to sync reset to backend');
      }
    }
  }, [syncEnabled, backendAvailable]);

  // Remove from history
  const removeFromHistory = useCallback(async (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));

    if (syncEnabled && backendAvailable) {
      try {
        await api.removeFromHistory(id);
      } catch (error) {
        console.warn('Failed to sync history removal to backend');
      }
    }
  }, [syncEnabled, backendAvailable]);

  // Preferences
  const setPreferences = useCallback(async (prefs: UserPreferences) => {
    setPreferencesState(prefs);

    if (syncEnabled && backendAvailable) {
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
    }
  }, [syncEnabled, backendAvailable]);

  // Submit recipe for moderation
  const submitRecipe = useCallback(async (recipe: Omit<Recipe, 'id'>) => {
    const localRecipe: Recipe = {
      ...recipe,
      id: 'pending_' + Date.now().toString() + Math.random().toString(36).substr(2, 5),
    };

    if (syncEnabled && backendAvailable) {
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
    }

    return localRecipe;
  }, [syncEnabled, backendAvailable]);

  // Toggle sync
  const toggleSync = useCallback(() => {
    setSyncEnabled((prev) => !prev);
  }, []);

  // Manual sync
  const manualSync = useCallback(async () => {
    await syncFromBackend();
  }, [syncFromBackend]);

  return {
    // State
    queue,
    history,
    availableRecipes,
    preferences,
    customRecipes,
    
    // Sync state
    syncEnabled,
    syncStatus,
    lastSync,
    backendAvailable,
    
    // Actions
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
    
    // Sync actions
    toggleSync,
    manualSync,
    syncFromBackend,
  };
}
