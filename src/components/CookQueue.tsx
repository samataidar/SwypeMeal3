import { useState } from 'react';
import { QueueItem } from '../types';
import { Clock, Flame, Check, Trash2, ChefHat, Star } from 'lucide-react';

interface CookQueueProps {
  queue: QueueItem[];
  onRemove: (id: string) => void;
  onCook: (id: string, rating?: number, notes?: string) => void;
}

export default function CookQueue({ queue, onRemove, onCook }: CookQueueProps) {
  const [cookingId, setCookingId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');

  const handleCookComplete = () => {
    if (cookingId) {
      onCook(cookingId, rating, notes);
      setCookingId(null);
      setRating(0);
      setNotes('');
    }
  };

  const cookingItem = queue.find((q) => q.id === cookingId);

  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <div className="text-6xl mb-4">📋</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Очередь пуста</h2>
        <p className="text-gray-500">Свайпайте рецепты вправо, чтобы добавить их в очередь готовки</p>
      </div>
    );
  }

  const totalCalories = queue.reduce((sum, item) => sum + item.recipe.calories, 0);
  const totalTime = queue.reduce((sum, item) => sum + item.recipe.cookTime, 0);

  return (
    <div className="px-4 py-4 h-full overflow-y-auto pb-24">
      {/* Summary */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 mb-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm opacity-80">В очереди</div>
            <div className="text-2xl font-bold">{queue.length} блюд</div>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-80">Общее время</div>
            <div className="text-2xl font-bold">{totalTime} мин</div>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-white/20 flex items-center gap-2">
          <Flame size={14} />
          <span className="text-sm">Сумма калорий: {totalCalories} ккал</span>
        </div>
      </div>

      {/* Queue items */}
      <div className="space-y-3">
        {queue.map((item, index) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 transition-all hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-2xl">
                {item.recipe.image}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{item.recipe.title}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock size={12} />
                    {item.recipe.cookTime} мин
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Flame size={12} />
                    {item.recipe.calories} ккал
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  #{index + 1} в очереди
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => setCookingId(item.id)}
                  className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors"
                  title="Приготовлено"
                >
                  <ChefHat size={16} />
                </button>
                <button
                  onClick={() => onRemove(item.id)}
                  className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                  title="Удалить"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cooking completion modal */}
      {cookingItem && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setCookingId(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <span className="text-5xl">{cookingItem.recipe.image}</span>
              <h3 className="text-xl font-bold mt-2">{cookingItem.recipe.title}</h3>
              <p className="text-gray-500 text-sm mt-1">Отметьте как приготовленное!</p>
            </div>

            {/* Rating */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Оценка</label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      size={28}
                      className={star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Заметки</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Что получилось? Что изменить в следующий раз?"
                className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCookingId(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-2xl font-medium hover:bg-gray-200 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleCookComplete}
                className="flex-1 py-3 bg-green-500 text-white rounded-2xl font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
              >
                <Check size={18} />
                Готово!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
