import { UserPreferences } from '../types';
import { Sliders, Clock, Flame, Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface SettingsProps {
  preferences: UserPreferences;
  onChange: (prefs: UserPreferences) => void;
  syncEnabled: boolean;
  onToggleSync: () => void;
  backendAvailable: boolean | null;
  lastSync: string | null;
  onManualSync: () => void;
}

const allTags = ['итальянская', 'тайская', 'мексиканская', 'индийская', 'японская', 'восточная', 'здоровая', 'мясо', 'рыба', 'веганская', 'вегетарианская', 'десерт', 'суп', 'завтрак', 'быстрая', 'паста', 'морепродукты', 'острая', 'высокобелковая', 'бобовые', 'гриль', 'без выпечки', 'рис', 'боул', 'курица'];

const difficulties = [
  { value: 'easy' as const, label: 'Легко', emoji: '🟢' },
  { value: 'medium' as const, label: 'Средне', emoji: '🟡' },
  { value: 'hard' as const, label: 'Сложно', emoji: '🔴' },
];

export default function Settings({ 
  preferences, 
  onChange,
  syncEnabled,
  onToggleSync,
  backendAvailable,
  lastSync,
  onManualSync,
}: SettingsProps) {
  const toggleTag = (tag: string) => {
    const newExclude = preferences.excludeTags.includes(tag)
      ? preferences.excludeTags.filter((t) => t !== tag)
      : [...preferences.excludeTags, tag];
    onChange({ ...preferences, excludeTags: newExclude });
  };

  const toggleDifficulty = (diff: 'easy' | 'medium' | 'hard') => {
    const newDiff = preferences.preferredDifficulty.includes(diff)
      ? preferences.preferredDifficulty.filter((d) => d !== diff)
      : [...preferences.preferredDifficulty, diff];
    onChange({ ...preferences, preferredDifficulty: newDiff });
  };

  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return 'Никогда';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ч назад`;
    return date.toLocaleDateString('ru-RU');
  };

  return (
    <div className="px-4 py-4 h-full overflow-y-auto pb-24">
      <div className="flex items-center gap-2 mb-6">
        <Sliders size={20} className="text-orange-500" />
        <h2 className="text-xl font-bold text-gray-900">Настройки</h2>
      </div>

      {/* Sync Settings */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {syncEnabled && backendAvailable ? (
              <Wifi size={16} className="text-green-500" />
            ) : (
              <WifiOff size={16} className="text-gray-400" />
            )}
            <span className="font-medium text-gray-800">Синхронизация</span>
          </div>
          <button
            onClick={onToggleSync}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              syncEnabled ? 'bg-orange-500' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                syncEnabled ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
        
        <div className="text-xs text-gray-500 mb-3">
          {syncEnabled ? (
            <>
              {backendAvailable ? (
                <span className="text-green-600">✓ Подключено к серверу</span>
              ) : (
                <span className="text-amber-600">⚠ Сервер недоступен</span>
              )}
            </>
          ) : (
            <span>Данные сохраняются только в этом браузере</span>
          )}
        </div>

        {syncEnabled && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              Последняя синхронизация: {formatLastSync(lastSync)}
            </div>
            <button
              onClick={onManualSync}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
            >
              <RefreshCw size={12} />
              Обновить
            </button>
          </div>
        )}
      </div>

      {/* Max calories */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Flame size={16} className="text-red-500" />
          <span className="font-medium text-gray-800">Макс. калорий на блюдо</span>
        </div>
        <input
          type="range"
          min="200"
          max="1000"
          step="50"
          value={preferences.maxCalories}
          onChange={(e) => onChange({ ...preferences, maxCalories: Number(e.target.value) })}
          className="w-full accent-orange-500"
        />
        <div className="flex justify-between text-sm text-gray-500 mt-1">
          <span>200</span>
          <span className="font-bold text-orange-600">{preferences.maxCalories} ккал</span>
          <span>1000</span>
        </div>
      </div>

      {/* Max cook time */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} className="text-blue-500" />
          <span className="font-medium text-gray-800">Макс. время готовки</span>
        </div>
        <input
          type="range"
          min="10"
          max="120"
          step="5"
          value={preferences.maxCookTime}
          onChange={(e) => onChange({ ...preferences, maxCookTime: Number(e.target.value) })}
          className="w-full accent-orange-500"
        />
        <div className="flex justify-between text-sm text-gray-500 mt-1">
          <span>10</span>
          <span className="font-bold text-orange-600">{preferences.maxCookTime} мин</span>
          <span>120</span>
        </div>
      </div>

      {/* Difficulty */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
        <span className="font-medium text-gray-800 block mb-3">Сложность</span>
        <div className="flex gap-2">
          {difficulties.map((diff) => (
            <button
              key={diff.value}
              onClick={() => toggleDifficulty(diff.value)}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                preferences.preferredDifficulty.includes(diff.value)
                  ? 'bg-orange-100 text-orange-700 border-2 border-orange-300'
                  : 'bg-gray-50 text-gray-500 border-2 border-transparent'
              }`}
            >
              {diff.emoji} {diff.label}
            </button>
          ))}
        </div>
      </div>

      {/* Exclude tags */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
        <span className="font-medium text-gray-800 block mb-3">Исключить категории</span>
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                preferences.excludeTags.includes(tag)
                  ? 'bg-red-100 text-red-700 line-through'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Reset */}
      <button
        onClick={() => onChange({
          maxCalories: 800,
          maxCookTime: 60,
          excludeTags: [],
          preferredDifficulty: ['easy', 'medium', 'hard'],
        })}
        className="w-full py-3 bg-gray-100 text-gray-700 rounded-2xl font-medium hover:bg-gray-200 transition-colors"
      >
        Сбросить настройки
      </button>
    </div>
  );
}
