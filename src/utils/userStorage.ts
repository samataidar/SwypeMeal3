// Per-user localStorage helpers.
//
// Cached state is scoped by user id (swypemeal:<user_id>:queue), so signing in
// as another account on the same device never mixes data. Old global keys are
// migrated once into the current user's namespace.

export const STORAGE_NAMES = {
  queue: 'queue',
  history: 'history',
  preferences: 'preferences',
  swiped: 'swiped',
  customRecipes: 'custom_recipes',
  remoteRecipes: 'remote_recipes',
  lastSync: 'last_sync',
  syncEnabled: 'sync_enabled',
} as const;

export type StorageName = keyof typeof STORAGE_NAMES;

// Pre-scoping keys, migrated once into the current user's namespace.
export const LEGACY_KEYS: Record<StorageName, string> = {
  queue: 'swypemeal_queue',
  history: 'swypemeal_history',
  preferences: 'swypemeal_preferences',
  swiped: 'swypemeal_swiped',
  customRecipes: 'swypemeal_custom_recipes',
  remoteRecipes: 'swypemeal_remote_recipes',
  lastSync: 'swypemeal_last_sync',
  syncEnabled: 'swypemeal_sync_enabled',
};

export function storageKey(userId: string, name: StorageName): string {
  return `swypemeal:${userId || 'anon'}:${STORAGE_NAMES[name]}`;
}

export function loadScoped<T>(userId: string, name: StorageName, fallback: T): T {
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

export function saveScoped<T>(userId: string, name: StorageName, value: T): void {
  try {
    localStorage.setItem(storageKey(userId, name), JSON.stringify(value));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}
