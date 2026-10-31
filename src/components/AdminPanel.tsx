import { useState, useEffect } from 'react';
import { api } from '../api';
import { Check, X, Clock, MessageSquare, Loader2 } from 'lucide-react';

interface PendingRecipe {
  id: string;
  author_id: string;
  title: string;
  description: string;
  image: string;
  cook_time: number;
  servings: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  ingredients: string[];
  steps: string[];
  tags: string[];
  difficulty: string;
  created_at: string;
}

export default function AdminPanel() {
  const [pendingRecipes, setPendingRecipes] = useState<PendingRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<PendingRecipe | null>(null);

  useEffect(() => {
    loadPendingRecipes();
  }, []);

  const loadPendingRecipes = async () => {
    try {
      setLoading(true);
      const result = await api.getPendingRecipes();
      setPendingRecipes(result.recipes);
    } catch (error) {
      console.error('Error loading pending recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (recipeId: string) => {
    try {
      setActionLoading(recipeId);
      await api.approveRecipe(recipeId, comment || undefined);
      setPendingRecipes(prev => prev.filter(r => r.id !== recipeId));
      setComment('');
      setSelectedRecipe(null);
    } catch (error) {
      console.error('Error approving recipe:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (recipeId: string) => {
    try {
      setActionLoading(recipeId);
      await api.rejectRecipe(recipeId, comment || undefined);
      setPendingRecipes(prev => prev.filter(r => r.id !== recipeId));
      setComment('');
      setSelectedRecipe(null);
    } catch (error) {
      console.error('Error rejecting recipe:', error);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={32} className="animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4 h-full overflow-y-auto pb-24">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-bold text-gray-900">Модерация рецептов</h2>
        <span className="bg-orange-100 text-orange-700 text-xs font-medium px-2 py-1 rounded-full">
          {pendingRecipes.length}
        </span>
      </div>

      {pendingRecipes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Нет рецептов на модерации</h3>
          <p className="text-gray-500">Все отправленные рецепты были обработаны</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingRecipes.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="flex gap-4 p-4">
                <img
                  src={recipe.image}
                  alt={recipe.title}
                  className="w-24 h-24 object-cover rounded-xl flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1">{recipe.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-2">{recipe.description}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {recipe.cook_time} мин
                    </span>
                    <span>{recipe.calories} ккал</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      recipe.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                      recipe.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {recipe.difficulty === 'easy' ? 'Легко' : recipe.difficulty === 'medium' ? 'Средне' : 'Сложно'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 p-4 bg-gray-50">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare size={16} className="text-gray-400" />
                  <input
                    type="text"
                    placeholder="Комментарий (опционально)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(recipe.id)}
                    disabled={actionLoading === recipe.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === recipe.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Check size={16} />
                    )}
                    Одобрить
                  </button>
                  <button
                    onClick={() => handleReject(recipe.id)}
                    disabled={actionLoading === recipe.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === recipe.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <X size={16} />
                    )}
                    Отклонить
                  </button>
                  <button
                    onClick={() => setSelectedRecipe(recipe)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                  >
                    Подробнее
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recipe detail modal */}
      {selectedRecipe && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedRecipe(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <img
                src={selectedRecipe.image}
                alt={selectedRecipe.title}
                className="w-full h-48 object-cover rounded-2xl mb-4"
              />
              <h2 className="text-2xl font-bold mb-2">{selectedRecipe.title}</h2>
              <p className="text-gray-600 mb-4">{selectedRecipe.description}</p>

              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="bg-orange-50 rounded-xl p-3 text-center">
                  <div className="text-xs text-orange-600">Ккал</div>
                  <div className="font-bold text-orange-700">{selectedRecipe.calories}</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <div className="text-xs text-blue-600">Белки</div>
                  <div className="font-bold text-blue-700">{selectedRecipe.protein}г</div>
                </div>
                <div className="bg-yellow-50 rounded-xl p-3 text-center">
                  <div className="text-xs text-yellow-600">Жиры</div>
                  <div className="font-bold text-yellow-700">{selectedRecipe.fat}г</div>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <div className="text-xs text-green-600">Углев.</div>
                  <div className="font-bold text-green-700">{selectedRecipe.carbs}г</div>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="font-bold text-gray-800 mb-2">🧾 Ингредиенты</h3>
                <ul className="space-y-1">
                  {selectedRecipe.ingredients.map((ing, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-orange-400 rounded-full flex-shrink-0"></span>
                      {ing}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-4">
                <h3 className="font-bold text-gray-800 mb-2">👨‍🍳 Приготовление</h3>
                <ol className="space-y-2">
                  {selectedRecipe.steps.map((step, i) => (
                    <li key={i} className="text-sm text-gray-600 flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(selectedRecipe.id)}
                  disabled={actionLoading === selectedRecipe.id}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {actionLoading === selectedRecipe.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  Одобрить
                </button>
                <button
                  onClick={() => handleReject(selectedRecipe.id)}
                  disabled={actionLoading === selectedRecipe.id}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {actionLoading === selectedRecipe.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <X size={16} />
                  )}
                  Отклонить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
