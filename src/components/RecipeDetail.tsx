import { Recipe } from '../types';
import { resolveImageUrl } from '../utils/imageUrl';
import { X } from 'lucide-react';

interface RecipeDetailProps {
  recipe: Recipe;
  onClose: () => void;
}

export default function RecipeDetail({ recipe, onClose }: RecipeDetailProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="relative text-center mb-4">
            <img
              src={resolveImageUrl(recipe.image)}
              alt={recipe.title}
              className="w-full h-48 object-cover rounded-2xl"
            />
            <button
              onClick={onClose}
              className="absolute top-2 right-2 p-2 bg-white/90 rounded-full text-gray-600 hover:bg-white transition-colors"
              title="Закрыть"
            >
              <X size={18} />
            </button>
            <h2 className="text-2xl font-bold mt-3">{recipe.title}</h2>
            <p className="text-gray-500 mt-1">{recipe.description}</p>
          </div>

          {/* Macros */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            <div className="bg-orange-50 rounded-xl p-3 text-center">
              <div className="text-xs text-orange-600">Ккал</div>
              <div className="font-bold text-orange-700">{recipe.calories}</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <div className="text-xs text-blue-600">Белки</div>
              <div className="font-bold text-blue-700">{recipe.protein}г</div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-3 text-center">
              <div className="text-xs text-yellow-600">Жиры</div>
              <div className="font-bold text-yellow-700">{recipe.fat}г</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <div className="text-xs text-green-600">Углев.</div>
              <div className="font-bold text-green-700">{recipe.carbs}г</div>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-6 text-sm text-gray-600">
            <span>{recipe.cookTime} мин</span>
            <span>{recipe.servings} порц.</span>
            <span>{recipe.difficulty === 'easy' ? 'Легко' : recipe.difficulty === 'medium' ? 'Средне' : 'Сложно'}</span>
          </div>

          {/* Ingredients */}
          <div className="mb-6">
            <h3 className="font-bold text-gray-800 mb-2">🧾 Ингредиенты</h3>
            <ul className="space-y-1">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-orange-400 rounded-full flex-shrink-0"></span>
                  {ing}
                </li>
              ))}
            </ul>
          </div>

          {/* Steps */}
          <div className="mb-6">
            <h3 className="font-bold text-gray-800 mb-2">👨‍🍳 Приготовление</h3>
            <ol className="space-y-2">
              {recipe.steps.map((step, i) => (
                <li key={i} className="text-sm text-gray-600 flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-2xl font-medium hover:bg-gray-200 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
