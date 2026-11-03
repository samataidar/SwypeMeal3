import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LEGACY_KEYS, loadScoped, saveScoped, storageKey } from './userStorage';

class MemoryStorage {
  private data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }

  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }

  get length(): number {
    return this.data.size;
  }
}

const storage = new MemoryStorage();
vi.stubGlobal('localStorage', storage);

describe('userStorage', () => {
  beforeEach(() => {
    storage.clear();
  });

  it('namespaces keys by user id', () => {
    expect(storageKey('user-a', 'queue')).toBe('swypemeal:user-a:queue');
    expect(storageKey('user-b', 'queue')).toBe('swypemeal:user-b:queue');
    expect(storageKey('', 'queue')).toBe('swypemeal:anon:queue');
  });

  it('round-trips values per user without mixing them', () => {
    saveScoped('user-a', 'queue', [{ id: 'a1' }]);
    saveScoped('user-b', 'queue', [{ id: 'b1' }]);

    expect(loadScoped('user-a', 'queue', [])).toEqual([{ id: 'a1' }]);
    expect(loadScoped('user-b', 'queue', [])).toEqual([{ id: 'b1' }]);
    expect(loadScoped('user-c', 'queue', [])).toEqual([]);
  });

  it('migrates the legacy global key once', () => {
    storage.setItem(LEGACY_KEYS.swiped, JSON.stringify(['1', '2']));

    expect(loadScoped('user-a', 'swiped', [])).toEqual(['1', '2']);
    expect(storage.getItem(storageKey('user-a', 'swiped'))).toBe('["1","2"]');
    expect(storage.getItem(LEGACY_KEYS.swiped)).toBeNull();

    // A second user does not inherit the migrated data.
    expect(loadScoped('user-b', 'swiped', [])).toEqual([]);
  });

  it('does not migrate legacy data into the anonymous namespace', () => {
    storage.setItem(LEGACY_KEYS.preferences, JSON.stringify({ maxCalories: 500 }));

    expect(loadScoped('', 'preferences', { maxCalories: 800 })).toEqual({ maxCalories: 800 });
    expect(storage.getItem(LEGACY_KEYS.preferences)).not.toBeNull();
  });

  it('falls back when stored JSON is corrupted', () => {
    storage.setItem(storageKey('user-a', 'history'), '{not json');

    expect(loadScoped('user-a', 'history', [])).toEqual([]);
  });

  it('keeps the scoped key when JSON is corrupted', () => {
    saveScoped('user-a', 'syncEnabled', true);
    expect(loadScoped('user-a', 'syncEnabled', false)).toBe(true);
    expect(loadScoped('user-a', 'lastSync', null)).toBeNull();
  });
});
