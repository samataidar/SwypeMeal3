import { useState } from 'react';
import { Recipe } from '../types';
import { Plus, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../api';

interface AddRecipeProps {
  onSubmit: (recipe: Omit<Recipe, 'id'>) => Recipe | Promise<Recipe>;
  pendingCount: number;
}

export default function AddRecipe({ onSubmit, pendingCount }: AddRecipeProps) {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    image: '🍽️',
    cookTime: 30,
    servings: 2,
    calories: 400,
    protein: 20,
    fat: 15,
    carbs: 40,
    ingredients: '',
    steps: '',
    tags: '',
    difficulty: 'easy' as 'easy' | 'medium' | 'hard',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim() || !form.description.trim()) {
      return;
    }

    const recipe = {
      title: form.title.trim(),
      description: form.description.trim(),
      image: form.image,
      cook_time: Number(form.cookTime),
      servings: Number(form.servings),
      calories: Number(form.calories),
      protein: Number(form.protein),
      fat: Number(form.fat),
      carbs: Number(form.carbs),
      ingredients: form.ingredients.split('\n').map(s => s.trim()).filter(Boolean),
      steps: form.steps.split('\n').map((s, i) => s.trim()).filter(Boolean),
      tags: form.tags.split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
      difficulty: form.difficulty,
    };

    try {
      await api.submitRecipe(recipe);
      setSubmitted(true);

      // Reset form
      setForm({
        title: '',
        description: '',
        image: '🍽️',
        cookTime: 30,
        servings: 2,
        calories: 400,
        protein: 20,
        fat: 15,
        carbs: 40,
        ingredients: '',
        steps: '',
        tags: '',
        difficulty: 'easy',
      });

      setTimeout(() => setSubmitted(false), 4000);
    } catch (error) {
      console.error('Error submitting recipe:', error);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle size={32} className="text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Рецепт отправлен!</h2>
        <p className="text-gray-500">Ваш рецепт будет проверен модераторами и опубликован после одобрения.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 h-full overflow-y-auto pb-24">
      <div className="flex items-center gap-2 mb-2">
        <Plus size={20} className="text-orange-500" />
        <h2 className="text-xl font-bold text-gray-900">Новый рецепт</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Добавьте свой рецепт. После проверки модераторами он появится в общем каталоге.
      </p>

      {pendingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center gap-2">
          <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />
          <span className="text-sm text-amber-700">
            У вас {pendingCount} рецепт(ов) на модерации
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Название *</label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Например: Паста с морепродуктами"
            className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Описание *</label>
          <textarea
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Краткое описание блюда..."
            className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>

        {/* Image URL */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">URL изображения</label>
          <input
            type="url"
            value={form.image}
            onChange={(e) => setForm({ ...form, image: e.target.value })}
            placeholder="https://example.com/image.jpg"
            className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
          {form.image && (
            <div className="mt-2">
              <img 
                src={form.image} 
                alt="Preview"
                className="w-full h-32 object-cover rounded-xl"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>

        {/* Time, Servings */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Время (мин)</label>
            <input
              type="number"
              min="1"
              max="300"
              value={form.cookTime}
              onChange={(e) => setForm({ ...form, cookTime: Number(e.target.value) })}
              className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Порций</label>
            <input
              type="number"
              min="1"
              max="20"
              value={form.servings}
              onChange={(e) => setForm({ ...form, servings: Number(e.target.value) })}
              className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Сложность</label>
          <div className="flex gap-2">
            {(['easy', 'medium', 'hard'] as const).map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => setForm({ ...form, difficulty: diff })}
                className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                  form.difficulty === diff
                    ? 'bg-orange-100 text-orange-700 border-2 border-orange-300'
                    : 'bg-gray-50 text-gray-500 border-2 border-transparent'
                }`}
              >
                {diff === 'easy' ? '🟢 Легко' : diff === 'medium' ? '🟡 Средне' : '🔴 Сложно'}
              </button>
            ))}
          </div>
        </div>

        {/* Macros */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">КБЖУ</label>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <div className="text-xs text-gray-500 mb-1">Ккал</div>
              <input
                type="number"
                min="0"
                value={form.calories}
                onChange={(e) => setForm({ ...form, calories: Number(e.target.value) })}
                className="w-full p-2 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Белки</div>
              <input
                type="number"
                min="0"
                value={form.protein}
                onChange={(e) => setForm({ ...form, protein: Number(e.target.value) })}
                className="w-full p-2 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Жиры</div>
              <input
                type="number"
                min="0"
                value={form.fat}
                onChange={(e) => setForm({ ...form, fat: Number(e.target.value) })}
                className="w-full p-2 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Углев.</div>
              <input
                type="number"
                min="0"
                value={form.carbs}
                onChange={(e) => setForm({ ...form, carbs: Number(e.target.value) })}
                className="w-full p-2 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
          </div>
        </div>

        {/* Ingredients */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Ингредиенты <span className="text-gray-400 font-normal">(каждый с новой строки)</span>
          </label>
          <textarea
            value={form.ingredients}
            onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
            placeholder={"Мука 200г\nЯйца 3шт\nСахар 100г\nМолоко 300мл"}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>

        {/* Steps */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Шаги приготовления <span className="text-gray-400 font-normal">(каждый с новой строки)</span>
          </label>
          <textarea
            value={form.steps}
            onChange={(e) => setForm({ ...form, steps: e.target.value })}
            placeholder={"Смешайте сухие ингредиенты\nДобавьте жидкие\nВыпекайте 30 минут при 180°C"}
            className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Теги <span className="text-gray-400 font-normal">(через запятую)</span>
          </label>
          <input
            type="text"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="итальянская, паста, быстрая"
            className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full py-3 bg-orange-500 text-white rounded-2xl font-medium hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
        >
          <Send size={18} />
          Отправить на модерацию
        </button>
      </form>
    </div>
  );
}
