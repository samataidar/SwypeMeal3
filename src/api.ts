/**
 * API клиент для SwypeMeal Backend
 * Синхронизирует данные между frontend и backend
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://swypemeal.onrender.com';

class ApiClient {
  private userId: string;

  constructor(userId: string = 'guest_' + this.generateGuestId()) {
    this.userId = localStorage.getItem('swypemeal_user_id') || userId;
    localStorage.setItem('swypemeal_user_id', this.userId);
  }

  private generateGuestId(): string {
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Recipes
  async getRecipes(params?: {
    maxCalories?: number;
    maxCookTime?: number;
    difficulty?: string;
    excludeTags?: string[];
  }) {
    const searchParams = new URLSearchParams({ user_id: this.userId });
    
    if (params?.maxCalories) searchParams.append('max_calories', params.maxCalories.toString());
    if (params?.maxCookTime) searchParams.append('max_cook_time', params.maxCookTime.toString());
    if (params?.difficulty) searchParams.append('difficulty', params.difficulty);
    if (params?.excludeTags?.length) searchParams.append('exclude_tags', params.excludeTags.join(','));

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
        body: JSON.stringify({
          ...recipe,
          author_id: this.userId,
        }),
      }
    );
  }

  async getCustomRecipes() {
    return this.request<{ recipes: any[]; count: number }>('/api/recipes/custom');
  }

  // Telegram
  async telegramInit() {
    return this.request<{
      user_id: string;
      queue_count: number;
      history_count: number;
      available_recipes: number;
    }>(`/api/telegram/init?user_id=${this.userId}`);
  }

  // Health check
  async healthCheck() {
    try {
      const response = await fetch(`${API_URL}/`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const api = new ApiClient();

// Export class for testing
export { ApiClient };
