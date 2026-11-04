import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { HistoryItem } from '../types';
import History from './History';
import { applyTheme, getCurrentTheme, type Theme } from '../utils/theme';
import {
  ChefHat,
  Clock,
  Eye,
  ListChecks,
  LogOut,
  Moon,
  Sun,
  User as UserIcon,
} from 'lucide-react';

interface ProfileProps {
  user: User;
  userRole: 'user' | 'admin' | null;
  history: HistoryItem[];
  queueCount: number;
  swipedCount: number;
  onRemoveHistory: (id: string) => void;
  onSignOut: () => void;
}

export default function Profile({
  user,
  userRole,
  history,
  queueCount,
  swipedCount,
  onRemoveHistory,
  onSignOut,
}: ProfileProps) {
  const [theme, setTheme] = useState<Theme>(() => getCurrentTheme());

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next, true);
  };

  const name: string =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    'Пользователь';
  const email = user.email ?? '';
  const avatarUrl: string | undefined = user.user_metadata?.avatar_url;
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  const cooked = history.length;
  const totalCookTime = history.reduce((sum, item) => sum + item.recipe.cookTime, 0);

  const stats = [
    { label: 'Приготовлено', value: String(cooked), unit: 'блюд', icon: ChefHat, tone: 'orange' },
    { label: 'Время готовки', value: String(totalCookTime), unit: 'мин', icon: Clock, tone: 'blue' },
    { label: 'В очереди', value: String(queueCount), unit: 'блюд', icon: ListChecks, tone: 'green' },
    { label: 'Просмотрено', value: String(swipedCount), unit: 'рецептов', icon: Eye, tone: 'purple' },
  ];

  const tones: Record<string, { bg: string; text: string }> = {
    orange: { bg: 'bg-orange-50', text: 'text-orange-600' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
    green: { bg: 'bg-green-50', text: 'text-green-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
  };

  return (
    <div className="h-full overflow-y-auto px-4 py-4 pb-24">
      {/* Account */}
      <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-xl font-bold text-orange-600">
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-bold text-gray-900">{name}</h2>
            {userRole === 'admin' && (
              <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-600">
                Админ
              </span>
            )}
          </div>
          {email && <div className="truncate text-xs text-gray-500">{email}</div>}
        </div>
        <UserIcon size={18} className="flex-shrink-0 text-gray-300" />
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {stats.map(({ label, value, unit, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone].bg}`}>
                <Icon size={16} className={tones[tone].text} />
              </span>
              <span className="text-xs text-gray-500">{label}</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">
              {value} <span className="text-sm font-normal text-gray-400">{unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Cooked history */}
      <div className="mt-6">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
          История приготовленных
        </h3>
        <History history={history} onRemove={onRemoveHistory} />
      </div>

      {/* Appearance */}
      <div className="mt-6 flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          {theme === 'dark' ? (
            <Moon size={18} className="text-blue-600" />
          ) : (
            <Sun size={18} className="text-amber-600" />
          )}
          <div>
            <div className="font-medium text-gray-800">Тёмная тема</div>
            <div className="text-xs text-gray-500">
              {theme === 'dark' ? 'Включена' : 'Выключена'}
            </div>
          </div>
        </div>
        <button
          onClick={toggleTheme}
          role="switch"
          aria-checked={theme === 'dark'}
          aria-label="Тёмная тема"
          className={`relative h-6 w-12 rounded-full transition-colors ${
            theme === 'dark' ? 'bg-orange-500' : 'bg-gray-300'
          }`}
        >
          <div
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              theme === 'dark' ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Sign out */}
      <button
        onClick={onSignOut}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 py-3 font-medium text-red-600 transition-colors hover:bg-red-100"
      >
        <LogOut size={16} />
        Выйти из профиля
      </button>
    </div>
  );
}
