import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { HistoryItem } from '../types';
import History from './History';
import { api, ApiError } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { applyTheme, getCurrentTheme, type Theme } from '../utils/theme';
import {
  ArrowLeft,
  BookOpen,
  ChefHat,
  ChevronRight,
  Clock,
  Eye,
  ListChecks,
  LogOut,
  Moon,
  Pencil,
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

function plural(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const { profile, setProfile } = useAuth();

  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [savingNickname, setSavingNickname] = useState(false);

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next, true);
  };

  const startEditingNickname = () => {
    setNicknameDraft(profile?.nickname || displayName);
    setNicknameError(null);
    setEditingNickname(true);
  };

  const saveNickname = async (event: React.FormEvent) => {
    event.preventDefault();
    if (savingNickname) return;

    setSavingNickname(true);
    setNicknameError(null);
    try {
      const result = await api.updateNickname(nicknameDraft);
      setProfile({ ...(profile ?? {}), nickname: result.nickname });
      setEditingNickname(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setNicknameError('Этот ник уже занят');
      } else if (error instanceof ApiError && error.status === 400) {
        setNicknameError(error.message);
      } else if (error instanceof ApiError && error.status === 503) {
        setNicknameError('Сервис недоступен, попробуйте позже');
      } else {
        setNicknameError('Не удалось сохранить ник');
      }
    } finally {
      setSavingNickname(false);
    }
  };

  useEffect(() => {
    if (!historyOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setHistoryOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [historyOpen]);

  const displayName: string =
    profile?.nickname ||
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    'Пользователь';
  const name = displayName;
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
    <>
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
          {editingNickname ? (
            <form onSubmit={saveNickname} className="space-y-1">
              <input
                autoFocus
                value={nicknameDraft}
                onChange={(e) => setNicknameDraft(e.target.value)}
                maxLength={24}
                placeholder="Ваш ник"
                className="w-full rounded-lg border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={savingNickname}
                  className="rounded-lg bg-orange-500 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-60"
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  onClick={() => setEditingNickname(false)}
                  className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs text-gray-600"
                >
                  Отмена
                </button>
              </div>
              {nicknameError && <p className="text-xs text-red-600">{nicknameError}</p>}
            </form>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <h2 className="truncate text-lg font-bold text-gray-900">{name}</h2>
                <button
                  onClick={startEditingNickname}
                  className="p-1 text-gray-400 transition-colors hover:text-orange-600"
                  aria-label="Изменить ник"
                  title="Изменить ник"
                >
                  <Pencil size={14} />
                </button>
                {userRole === 'admin' && (
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-600">
                    Админ
                  </span>
                )}
              </div>
              {email && <div className="truncate text-xs text-gray-500">{email}</div>}
              <div className="text-[11px] text-gray-400">Ник виден на ваших рецептах</div>
            </>
          )}
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

      {/* Cooked history — opens on demand */}
      <button
        onClick={() => setHistoryOpen(true)}
        className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-colors hover:bg-gray-50"
      >
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-green-50">
          <BookOpen size={18} className="text-green-600" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-gray-800">История приготовленных</span>
          <span className="block text-xs text-gray-500">
            {history.length > 0
              ? `${history.length} ${plural(history.length, 'блюдо', 'блюда', 'блюд')}`
              : 'Пока пусто'}
          </span>
        </span>
        <ChevronRight size={18} className="flex-shrink-0 text-gray-300" />
      </button>

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

    {/* Full history screen */}
    {historyOpen && (
      <div className="fixed inset-0 z-50 flex justify-center bg-gray-50">
        <div className="flex h-full w-full max-w-lg flex-col bg-gray-50">
          <div className="flex flex-shrink-0 items-center gap-1 border-b border-gray-100 bg-white px-3 py-2">
            <button
              onClick={() => setHistoryOpen(false)}
              className="p-2 text-gray-500 transition-colors hover:text-gray-800"
              aria-label="Назад"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className="text-lg font-bold text-gray-900">История</h2>
            <span className="ml-2 text-xs text-gray-500">
              {history.length > 0
                ? `${history.length} ${plural(history.length, 'блюдо', 'блюда', 'блюд')}`
                : ''}
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <History history={history} onRemove={onRemoveHistory} />
          </div>
        </div>
      </div>
    )}
    </>
  );
}
