import { useState } from 'react';
import { HistoryItem } from '../types';
import { resolveImageUrl } from '../utils/imageUrl';
import RecipeDetail from './RecipeDetail';
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
  const [detailsItem, setDetailsItem] = useState<HistoryItem | null>(null);

  if (history.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white px-6 py-10 text-center shadow-sm">
        <div className="mb-3 text-5xl">📖</div>
        <h3 className="mb-1 text-lg font-semibold text-gray-800">История пуста</h3>
        <p className="text-sm text-gray-500">Здесь будут блюда, которые вы приготовили</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((item) => (
        <div
          key={item.id}
          role="button"
          tabIndex={0}
          onClick={() => setDetailsItem(item)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setDetailsItem(item);
            }
          }}
          className="cursor-pointer rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md"
        >
          <div className="flex items-start gap-3">
            <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-green-50">
              <img
                src={resolveImageUrl(item.recipe.image)}
                alt={item.recipe.title}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between">
                <h3 className="truncate font-semibold text-gray-900">{item.recipe.title}</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(item.id);
                  }}
                  className="flex-shrink-0 p-1.5 text-gray-400 transition-colors hover:text-red-500"
                  aria-label="Удалить из истории"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="mt-1 flex items-center gap-3">
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
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-blue-700">Б {item.recipe.protein}г</span>
                <span className="rounded-md bg-yellow-50 px-1.5 py-0.5 text-yellow-700">Ж {item.recipe.fat}г</span>
                <span className="rounded-md bg-green-50 px-1.5 py-0.5 text-green-700">У {item.recipe.carbs}г</span>
              </div>
              {item.rating && (
                <div className="mt-1 flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={12}
                      className={star <= item.rating! ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}
                    />
                  ))}
                </div>
              )}
              {item.notes && (
                <p className="mt-1 line-clamp-2 text-xs italic text-gray-500">"{item.notes}"</p>
              )}
            </div>
          </div>
        </div>
      ))}

      {detailsItem && (
        <RecipeDetail recipe={detailsItem.recipe} onClose={() => setDetailsItem(null)} />
      )}
    </div>
  );
}
