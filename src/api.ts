/**
 * API клиент для SwypeMeal Backend
 * Синхронизирует данные между frontend и backend
 */

import { supabase } from './lib/supabase';

// Avoid a storm of signOut calls when several requests fail with 401 at once.
let signOutScheduled = false;

// In production all API requests go to the same origin:
//   browser -> swypemeal.ru/api -> Vercel rewrite -> Render
// This keeps the app working from networks where onrender.com is blocked.
// In development Vite proxies /api to the local backend (see vite.config.js).
const API_URL = import.meta.env.DEV
  ? (import.meta.env.VITE_API_URL || 'http://localhost:8000')
  : '';
const REQUEST_TIMEOUT_MS = 60000;

class ApiClient {
  private userId: string;

  constructor() {
    this.userId = localStorage.getItem('swypemeal_user_id') || '';
  }

  setUserId(userId: string) {
    this.userId = userId;
    localStorage.setItem('swypemeal_user_id', userId);
  }

  getUserId(): string {
    return this.userId;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {};
  }

  private async request<T>(endpoint: string, options?: RequestInit, isRetry = false): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const authHeaders = await this.getAuthHeaders();
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...options?.headers,
        },
      });

      // A 401 usually means the access token was revoked or the session expired.
      // Try one silent refresh, and if that fails, drop the dead session so the
      // app returns to the login screen instead of silently losing data.
      if (response.status === 401) {
        if (!isRetry) {
          const { data } = await supabase.auth.refreshSession();
          if (data.session) {
            return this.request<T>(endpoint, options, true);
          }
        }
        if (!signOutScheduled) {
          signOutScheduled = true;
          supabase.auth.signOut().catch(() => undefined);
        }
        throw new Error('API Error: 401 Unauthorized');
      }

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Recipes
  async getRecipes(params?: {
    maxCalories?: number;
    maxCookTime?: number;
    difficulty?: string;
    excludeTags?: string[];
    includeAll?: boolean;
  }) {
    const searchParams = new URLSearchParams();
    
    if (params?.maxCalories) searchParams.append('max_calories', params.maxCalories.toString());
    if (params?.maxCookTime) searchParams.append('max_cook_time', params.maxCookTime.toString());
    if (params?.difficulty) searchParams.append('difficulty', params.difficulty);
    if (params?.excludeTags?.length) searchParams.append('exclude_tags', params.excludeTags.join(','));
    if (params?.includeAll) searchParams.append('include_all', 'true');

    return this.request<{ recipes: any[]; count: number }>(
      `/api/recipes?${searchParams.toString()}`
    );
  }

  async getRecipe(recipeId: string) {
    return this.request<any>(`/api/recipes/${recipeId}`);
  }

  // Queue
  async getQueue() {
    return this.request<{ queue: any[]; count: number }>(`/api/queue/${this.userId}`);
  }

  async addToQueue(recipeId: string) {
    return this.request<{ message: string; item: any }>(
      `/api/queue/${this.userId}?recipe_id=${recipeId}`,
      { method: 'POST' }
    );
  }

  async removeFromQueue(itemId: string) {
    return this.request<{ message: string }>(
      `/api/queue/${this.userId}/${itemId}`,
      { method: 'DELETE' }
    );
  }

  async reorderQueue(itemIds: string[]) {
    return this.request<{ message: string }>(
      `/api/queue/${this.userId}/reorder`,
      {
        method: 'POST',
        body: JSON.stringify({ item_ids: itemIds }),
      }
    );
  }

  // Cook
  async markCooked(queueItemId: string, rating?: number, notes?: string) {
    return this.request<{ message: string; item: any }>(
      `/api/cook/${this.userId}`,
      {
        method: 'POST',
        body: JSON.stringify({
          queue_item_id: queueItemId,
          rating,
          notes,
        }),
      }
    );
  }

  // History
  async getHistory() {
    return this.request<{ history: any[]; count: number }>(`/api/history/${this.userId}`);
  }

  async removeFromHistory(itemId: string) {
    return this.request<{ message: string }>(
      `/api/history/${this.userId}/${itemId}`,
      { method: 'DELETE' }
    );
  }

  // Swipe
  async swipe(recipeId: string, action: 'like' | 'dislike') {
    return this.request<{ message: string; swiped_count: number }>(
      `/api/swipe/${this.userId}`,
      {
        method: 'POST',
        body: JSON.stringify({ recipe_id: recipeId, action }),
      }
    );
  }

  async getSwipedIds() {
    return this.request<{ swiped_ids: string[]; count: number }>(
      `/api/swiped/${this.userId}`
    );
  }

  // Preferences
  async getPreferences() {
    return this.request<any>(`/api/preferences/${this.userId}`);
  }

  async updatePreferences(preferences: any) {
    return this.request<{ message: string; preferences: any }>(
      `/api/preferences/${this.userId}`,
      {
        method: 'PUT',
        body: JSON.stringify(preferences),
      }
    );
  }

  // Reset
  async resetSwipes() {
    return this.request<{ message: string }>(
      `/api/reset/${this.userId}`,
      { method: 'POST' }
    );
  }

  // Stats
  async getStats() {
    return this.request<{
      total_meals: number;
      total_calories: number;
      total_cook_time: number;
      average_rating: number;
      queue_size: number;
      swiped_count: number;
    }>(`/api/stats/${this.userId}`);
  }

  // Custom Recipes
  async submitRecipe(recipe: any) {
    return this.request<{ message: string; recipe_id: string }>(
      '/api/recipes/submit',
      {
        method: 'POST',
        body: JSON.stringify(recipe),
      }
    );
  }

  async getCustomRecipes() {
    return this.request<{ recipes: any[]; count: number }>('/api/recipes/custom');
  }

  // User role
  async getUserRole() {
    return this.request<{ role: string }>(`/api/user/role/${this.userId}`);
  }

  // Profile (name/email/avatar from the Supabase token)
  async syncProfile() {
    return this.request<{ id: string; full_name: string; email: string; avatar_url: string }>(
      '/api/me',
      { method: 'POST' }
    );
  }

  // Admin - Pending recipes
  async getPendingRecipes() {
    return this.request<{ recipes: any[]; count: number }>('/api/recipes/pending');
  }

  async approveRecipe(recipeId: string, comment?: string) {
    return this.request<{ message: string }>(
      `/api/recipes/${recipeId}/approve`,
      {
        method: 'POST',
        body: JSON.stringify({ comment }),
      }
    );
  }

  async rejectRecipe(recipeId: string, comment?: string) {
    return this.request<{ message: string }>(
      `/api/recipes/${recipeId}/reject`,
      {
        method: 'POST',
        body: JSON.stringify({ comment }),
      }
    );
  }

  // Health check
  async healthCheck() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${API_URL}/api/health`, { signal: controller.signal });
      if (!response.ok) return false;
      // The API can answer 200 with status "unhealthy" (e.g. misconfigured
      // storage key). Treat that as offline so local data is not overwritten.
      const data = await response.json().catch(() => null);
      return data?.status === 'healthy';
    } catch {
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// Singleton instance
export const api = new ApiClient();

// Export class for testing
export { ApiClient };
