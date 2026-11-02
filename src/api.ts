const API_URL = import.meta.env.VITE_API_URL || 'https://swypemeal.onrender.com';

class ApiClient {
  private userId: string = '';

  setUserId(userId: string) {
    this.userId = userId;
  }

  getUserId(): string {
    return this.userId;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

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

    return this.request<any>(`/api/recipes?${searchParams.toString()}`);
  }

  async getQueue() {
    return this.request<any>(`/api/queue/${this.userId}`);
  }

  async addToQueue(recipeId: string) {
    return this.request<any>(`/api/queue/${this.userId}?recipe_id=${recipeId}`, { method: 'POST' });
  }

  async removeFromQueue(itemId: string) {
    return this.request<any>(`/api/queue/${this.userId}/${itemId}`, { method: 'DELETE' });
  }

  async markCooked(queueItemId: string, rating?: number, notes?: string) {
    return this.request<any>(`/api/cook/${this.userId}`, {
      method: 'POST',
      body: JSON.stringify({ queue_item_id: queueItemId, rating, notes }),
    });
  }

  async getHistory() {
    return this.request<any>(`/api/history/${this.userId}`);
  }

  async removeFromHistory(itemId: string) {
    return this.request<any>(`/api/history/${this.userId}/${itemId}`, { method: 'DELETE' });
  }

  async swipe(recipeId: string, action: 'like' | 'dislike') {
    return this.request<any>(`/api/swipe/${this.userId}`, {
      method: 'POST',
      body: JSON.stringify({ recipe_id: recipeId, action }),
    });
  }

  async getPreferences() {
    return this.request<any>(`/api/preferences/${this.userId}`);
  }

  async updatePreferences(preferences: any) {
    return this.request<any>(`/api/preferences/${this.userId}`, {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  }

  async resetSwipes() {
    return this.request<any>(`/api/reset/${this.userId}`, { method: 'POST' });
  }

  async getUserRole() {
    return this.request<any>(`/api/user/role/${this.userId}`);
  }

  async getPendingRecipes() {
    return this.request<any>('/api/recipes/pending');
  }

  async approveRecipe(recipeId: string, comment?: string) {
    return this.request<any>(`/api/recipes/${recipeId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ moderator_id: this.userId, comment }),
    });
  }

  async rejectRecipe(recipeId: string, comment?: string) {
    return this.request<any>(`/api/recipes/${recipeId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ moderator_id: this.userId, comment }),
    });
  }

  async submitRecipe(recipe: any) {
    return this.request<any>('/api/recipes/submit', {
      method: 'POST',
      body: JSON.stringify({ ...recipe, author_id: this.userId }),
    });
  }

  async healthCheck() {
    try {
      const response = await fetch(`${API_URL}/`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const api = new ApiClient();
