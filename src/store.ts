import { useState, useEffect, useCallback, useRef } from 'react';
import { Recipe, QueueItem, HistoryItem, UserPreferences } from './types';
import { recipes as defaultRecipes } from './data';
import { api } from './api';

// Cached state is scoped per user: keys look like
//   swypemeal:<user_id>:queue
// so signing in as another account on the same device never mixes data.
const STORAGE_NAMES = {
  queue: 'queue',
  history: 'history',
  preferences: 'preferences',
  swiped: 'swiped',
  customRecipes: 'custom_recipes',
  remoteRecipes: 'remote_recipes',
  lastSync: 'last_sync',
  syncEnabled: 'sync_enabled',
} as const;

type StorageName = keyof typeof STORAGE_NAMES;

// Pre-scoping keys, migrated once into the current user's namespace.
const LEGACY_KEYS: Record<StorageName, string> = {
  queue: 'swypemeal_queue',
  history: 'swypemeal_history',
  preferences: 'swypemeal_preferences',
  swiped: 'swypemeal_swiped',
  customRecipes: 'swypemeal_custom_recipes',
  remoteRecipes: 'swypemeal_remote_recipes',
  lastSync: 'swypemeal_last_sync',
  syncEnabled: 'swypemeal_sync_enabled',
};

const DEFAULT_PREFERENCES: UserPreferences = {
  maxCalories: 800,
  maxCookTime: 60,
  excludeTags: [],
  preferredDifficulty: ['easy', 'medium', 'hard'],
};

function storageKey(userId: string, name: StorageName): string {
  return `swypemeal:${userId || 'anon'}:${STORAGE_NAMES[name]}`;
}

function loadScoped<T>(userId: string, name: StorageName, fallback: T): T {
  try {
    const key = storageKey(userId, name);
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      return JSON.parse(raw) as T;
    }
    // One-time migration of the old global cache into this user's namespace.
    if (userId) {
      const legacy = localStorage.getItem(LEGACY_KEYS[name]);
      if (legacy !== null) {
        localStorage.setItem(key, legacy);
        localStorage.removeItem(LEGACY_KEYS[name]);
        return JSON.parse(legacy) as T;
      }
    }
  } catch {
    // Corrupted entry: fall back to the default.
  }
  return fallback;
}

function saveScoped<T>(userId: string, name: StorageName, value: T): void {
  try {
    localStorage.setItem(storageKey(userId, name), JSON.stringify(value));
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
  // Storage namespace follows the signed-in user.
  const [storageUserId, setStorageUserId] = useState(() => api.getUserId());
  const storageUserIdRef = useRef(storageUserId);

  // Local state (source of truth for UI)
  const [queue, setQueue] = useState<QueueItem[]>(() => loadScoped(storageUserId, 'queue', []));
  const [history, setHistory] = useState<HistoryItem[]>(() => loadScoped(storageUserId, 'history', []));
  const [swipedIds, setSwipedIds] = useState<string[]>(() => loadScoped(storageUserId, 'swiped', []));
  const [customRecipes, setCustomRecipes] = useState<Recipe[]>(() => loadScoped(storageUserId, 'customRecipes', []));
  // Full recipe catalog from the backend (recipes table + built-ins). Backend
  // rows override the bundled ones, so edits in Supabase show up in the app.
  const [remoteRecipes, setRemoteRecipes] = useState<Recipe[]>(() => loadScoped(storageUserId, 'remoteRecipes', []));
  const [preferences, setPreferencesState] = useState<UserPreferences>(() =>
    loadScoped(storageUserId, 'preferences', DEFAULT_PREFERENCES)
  );

  // Sync state
  const [syncEnabled, setSyncEnabled] = useState(() => loadScoped(storageUserId, 'syncEnabled', true));
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSync, setLastSync] = useState<string | null>(() => loadScoped(storageUserId, 'lastSync', null));
  const [backendAvailable, setBackendAvailable] = useState<boolean | null>(null);

  // All recipes: bundled defaults, overridden by backend catalog, plus custom.
  const allRecipes = (() => {
    const byId = new Map<string, Recipe>();
    defaultRecipes.forEach((r) => byId.set(r.id, r));
    remoteRecipes.forEach((r) => byId.set(r.id, r));
    customRecipes.forEach((r) => byId.set(r.id, r));
    return [...byId.values()];
  })();

  // Switch the storage namespace. Called when the signed-in user changes so a
  // new account never inherits the previous one's cached queue/history/swipes.
  const setUser = useCallback((nextUserId: string) => {
    const normalized = nextUserId || '';
    if (storageUserIdRef.current === normalized) return;

    storageUserIdRef.current = normalized;
    setStorageUserId(normalized);
    setQueue(loadScoped(normalized, 'queue', []));
    setHistory(loadScoped(normalized, 'history', []));
    setSwipedIds(loadScoped(normalized, 'swiped', []));
    setCustomRecipes(loadScoped(normalized, 'customRecipes', []));
    setRemoteRecipes(loadScoped(normalized, 'remoteRecipes', []));
    setPreferencesState(loadScoped(normalized, 'preferences', DEFAULT_PREFERENCES));
    setSyncEnabled(loadScoped(normalized, 'syncEnabled', true));
    setLastSync(loadScoped(normalized, 'lastSync', null));
    setSyncStatus('idle');
    setBackendAvailable(null);
  }, []);

  // Persist to localStorage (per user)
  useEffect(() => saveScoped(storageUserId, 'queue', queue), [storageUserId, queue]);
  useEffect(() => saveScoped(storageUserId, 'history', history), [storageUserId, history]);
  useEffect(() => saveScoped(storageUserId, 'swiped', swipedIds), [storageUserId, swipedIds]);
  useEffect(() => saveScoped(storageUserId, 'customRecipes', customRecipes), [storageUserId, customRecipes]);
  useEffect(() => saveScoped(storageUserId, 'remoteRecipes', remoteRecipes), [storageUserId, remoteRecipes]);
  useEffect(() => saveScoped(storageUserId, 'preferences', preferences), [storageUserId, preferences]);
  useEffect(() => saveScoped(storageUserId, 'syncEnabled', syncEnabled), [storageUserId, syncEnabled]);

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
      const results = await Promise.allSettled([
        api.getQueue(),
        api.getHistory(),
        api.getPreferences(),
        api.getCustomRecipes(),
        api.getRecipes({ includeAll: true }),
        api.getSwipedIds(),
      ]);
      const [queueRes, historyRes, prefsRes, customRes, catalogRes, swipedRes] = results;

      // If every request failed, report an error instead of a false "synced".
      if (results.every((result) => result.status === 'rejected')) {
        console.error('Sync failed: all requests rejected');
        setSyncStatus('error');
        return;
      }

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

      // Update swiped recipes (server is authoritative so swipes sync across devices)
      if (swipedRes.status === 'fulfilled') {
        setSwipedIds(swipedRes.value.swiped_ids);
      }

      // Update the recipe catalog (authoritative titles, steps, images…)
      if (catalogRes.status === 'fulfilled') {
        const mapped = catalogRes.value.recipes.map(mapBackendRecipe);
        setRemoteRecipes(mapped);
      }

      const now = new Date().toISOString();
      setLastSync(now);
      saveScoped(api.getUserId(), 'lastSync', now);
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

  // Persist the manual order (server ignores ids it does not know yet).
  const persistQueueOrder = useCallback((items: QueueItem[]) => {
    if (!syncEnabled || !backendAvailable) return;
    api.reorderQueue(items.map((item) => item.id)).catch(() => {
      console.warn('Failed to persist queue order');
    });
  }, [syncEnabled, backendAvailable]);

  // Move up
  const moveQueueUp = useCallback((id: string) => {
    const index = queue.findIndex((item) => item.id === id);
    if (index <= 0) return;
    const newQueue = [...queue];
    [newQueue[index - 1], newQueue[index]] = [newQueue[index], newQueue[index - 1]];
    setQueue(newQueue);
    persistQueueOrder(newQueue);
  }, [queue, persistQueueOrder]);

  // Move down
  const moveQueueDown = useCallback((id: string) => {
    const index = queue.findIndex((item) => item.id === id);
    if (index === -1 || index >= queue.length - 1) return;
    const newQueue = [...queue];
    [newQueue[index], newQueue[index + 1]] = [newQueue[index + 1], newQueue[index]];
    setQueue(newQueue);
    persistQueueOrder(newQueue);
  }, [queue, persistQueueOrder]);

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
  const markSwiped = useCallback(async (
    recipeId: string,
    action: 'like' | 'dislike' = 'dislike'
  ) => {
    setSwipedIds((prev) => {
      if (prev.includes(recipeId)) return prev;
      return [...prev, recipeId];
    });

    if (syncEnabled && backendAvailable) {
      try {
        await api.swipe(recipeId, action);
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
    setUser,
  };
}
