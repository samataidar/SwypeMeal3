import { HistoryItem } from '../types';
import { Clock, Flame, Star, Trash2, Calendar } from 'lucide-react';

interface HistoryProps {
  history: HistoryItem[];
  onRemove: (id: string) => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

export default function History({ history, onRemove }: HistoryProps) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <div className="text-6xl mb-4">📖</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">История пуста</h2>
        <p className="text-gray-500">Здесь будут отображаться блюда, которые вы приготовили</p>
      </div>
    );
  }

  // Stats
  const totalMeals = history.length;
  const ratedItems = history.filter(h => h.rating);
  const avgRating = ratedItems.length > 0
    ? ratedItems.reduce((sum, h) => sum + (h.rating || 0), 0) / ratedItems.length
    : 0;
  const totalCalories = history.reduce((sum, h) => sum + h.recipe.calories, 0);
  const totalTime = history.reduce((sum, h) => sum + h.recipe.cookTime, 0);

  return (
    <div className="px-4 py-4 h-full overflow-y-auto pb-24">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl p-4 text-white">
          <div className="text-sm opacity-80">Приготовлено</div>
          <div className="text-2xl font-bold">{totalMeals} блюд</div>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-4 text-white">
          <div className="text-sm opacity-80">Средняя оценка</div>
          <div className="text-2xl font-bold flex items-center gap-1">
            {avgRating.toFixed(1)}
            <Star size={16} className="fill-white" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl p-4 text-white">
          <div className="text-sm opacity-80">Всего ккал</div>
          <div className="text-2xl font-bold">{totalCalories}</div>
        </div>
        <div className="bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl p-4 text-white">
          <div className="text-sm opacity-80">Время готовки</div>
          <div className="text-2xl font-bold">{totalTime} мин</div>
        </div>
      </div>

      {/* History items */}
      <div className="space-y-3">
        {history.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 transition-all hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-green-50 rounded-xl overflow-hidden">
                <img 
                  src={item.recipe.image} 
                  alt={item.recipe.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-gray-900 truncate">{item.recipe.title}</h3>
                  <button
                    onClick={() => onRemove(item.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar size={12} />
                    {formatDate(item.cookedAt)}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock size={12} />
                    {item.recipe.cookTime} мин
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Flame size={12} />
                    {item.recipe.calories} ккал
                  </span>
                </div>
                {item.rating && (
                  <div className="flex items-center gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={12}
                        className={star <= item.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}
                      />
                    ))}
                  </div>
                )}
                {item.notes && (
                  <p className="text-xs text-gray-500 mt-1 italic line-clamp-2">"{item.notes}"</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
