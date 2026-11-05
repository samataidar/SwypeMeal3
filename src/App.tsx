import { useState, useEffect, useRef } from 'react';
import { Heart, List, Sliders, ArrowLeft, UtensilsCrossed, Plus, Wifi, WifiOff, Loader2, User, Shield } from 'lucide-react';
import SwipeView from './components/SwipeView';
import CookQueue from './components/CookQueue';
import Settings from './components/Settings';
import AddRecipe from './components/AddRecipe';
import AdminPanel from './components/AdminPanel';
import LoginPage from './components/LoginPage';
import Profile from './components/Profile';
import { useStore } from './store';
import { useAuth } from './contexts/AuthContext';
import { api } from './api';

type Tab = 'swipe' | 'queue' | 'add' | 'admin' | 'profile';

/** Size diagnostics for mobile layout bugs: open the app with ?diag=1 */
function Diag() {
  const [info, setInfo] = useState('');

  useEffect(() => {
    const update = () => {
      const shell = document.querySelector('.app-shell');
      const main = document.querySelector('main');
      const deck = document.querySelector('[data-deck]');
      const vv = window.visualViewport;
      setInfo([
        `win ${window.innerWidth}x${window.innerHeight}`,
        `vv ${vv ? `${Math.round(vv.width)}x${Math.round(vv.height)}` : '-'}`,
        `dvh ${typeof CSS !== 'undefined' && CSS.supports('height', '100dvh')}`,
        `shell ${shell ? Math.round(shell.getBoundingClientRect().height) : '-'}`,
        `main ${main ? Math.round(main.getBoundingClientRect().height) : '-'}`,
        `deck ${deck ? Math.round(deck.getBoundingClientRect().height) : '-'}`,
        `cards ${document.querySelectorAll('[data-card]').length}`,
        `ua ${navigator.userAgent.slice(0, 90)}`,
      ].join('\n'));
    };
    update();
    const id = window.setInterval(update, 500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <pre className="fixed left-1 top-1 z-[100] max-w-[95vw] whitespace-pre-wrap break-words rounded bg-black/80 p-2 text-[10px] leading-tight text-white">
      {info}
    </pre>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('swipe');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const store = useStore();
  const { user, loading, signOut, userRole } = useAuth();

  // Set user ID in API client and pull fresh data after login.
  // The store itself is mounted before auth resolves, so its initial sync may
  // run without a token. Re-sync once the authenticated user is known.
  const syncedUserRef = useRef<string | null>(null);

  useEffect(() => {
    // Wait until Supabase restores the session: rendering before that looks
    // like "signed out" and would switch the store to the anon namespace.
    if (loading) return;

    if (!user) {
      syncedUserRef.current = null;
      store.setUser('');
      api.setUserId('');
      return;
    }

    api.setUserId(user.id);
    store.setUser(user.id);

    if (syncedUserRef.current !== user.id) {
      syncedUserRef.current = user.id;
      store.syncFromBackend();
    }
  }, [user, loading, store.setUser, store.syncFromBackend]);

  useEffect(() => {
    if (!filtersOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFiltersOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [filtersOpen]);

  // Show loading screen while checking auth
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">Загрузка...</p>
          <a
            href="/diag.html"
            className="mt-4 inline-block text-xs text-blue-600 underline"
          >
            Долго не загружается? Открыть диагностику
          </a>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage />;
  }

  const isAdmin = userRole === 'admin';
  
  const tabs: { id: Tab; icon: any; label: string; badge?: number }[] = [
    { id: 'swipe', icon: Heart, label: 'Свайп' },
    { id: 'queue', icon: List, label: 'Очередь', badge: store.queue.length },
    { id: 'add', icon: Plus, label: 'Добавить' },
    ...(isAdmin ? [{ id: 'admin' as Tab, icon: Shield, label: 'Админ' }] : []),
    { id: 'profile', icon: User, label: 'Профиль' },
  ];

  const SyncIndicator = () => {
    if (store.syncStatus === 'syncing') {
      return (
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-600 text-xs">
          <Loader2 size={12} className="animate-spin" />
          <span className="hidden sm:inline">Синхронизация...</span>
        </div>
      );
    }

    if (store.syncStatus === 'error' || store.backendAvailable === false) {
      return (
        <button
          onClick={store.manualSync}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-600 text-xs hover:bg-amber-100 transition-colors"
          title="Ошибка синхронизации. Нажмите для повтора."
        >
          <WifiOff size={12} />
          <span className="hidden sm:inline">Оффлайн</span>
        </button>
      );
    }

    return (
      <button
        onClick={store.manualSync}
        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 text-green-600 text-xs hover:bg-green-100 transition-colors"
        title={`Синхронизировано. Нажмите для обновления.`}
      >
        <Wifi size={12} />
        <span className="hidden sm:inline">Онлайн</span>
      </button>
    );
  };

  return (
    <div className="app-shell bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
            <UtensilsCrossed size={16} className="text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">SwypeMeal</h1>
        </div>
        <div className="flex items-center gap-1">
          <SyncIndicator />
          <button
            onClick={() => setFiltersOpen(true)}
            className="p-2 text-gray-500 transition-colors hover:text-orange-600"
            title="Фильтры для свайпа"
            aria-label="Фильтры"
          >
            <Sliders size={18} />
          </button>
          {/* User menu: opens the profile tab */}
          <button
            onClick={() => setActiveTab('profile')}
            className="flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-gray-100"
            title="Профиль"
          >
            {user.user_metadata?.avatar_url ? (
              <img 
                src={user.user_metadata.avatar_url} 
                alt="Avatar" 
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <User size={16} className="text-orange-600" />
              </div>
            )}
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'swipe' && (
          <SwipeView
            recipes={store.availableRecipes}
            onLike={async (recipe) => {
              // Add first, then record the swipe. This avoids two concurrent
              // writes racing on the same queue state.
              await store.addToQueue(recipe);
              store.markSwiped(recipe.id, 'like');
            }}
            onDislike={(recipe) => {
              store.markSwiped(recipe.id, 'dislike');
            }}
            onReset={store.resetSwiped}
            onRefresh={store.syncFromBackend}
          />
        )}
        {activeTab === 'queue' && (
          <CookQueue
            queue={store.queue}
            onRemove={store.removeFromQueue}
            onCook={store.moveToHistory}
            onMoveUp={store.moveQueueUp}
            onMoveDown={store.moveQueueDown}
          />
        )}
        {activeTab === 'add' && (
          <AddRecipe
            onSubmit={store.submitRecipe}
            pendingCount={0}
          />
        )}
        {activeTab === 'admin' && isAdmin && (
          <AdminPanel />
        )}
        {activeTab === 'profile' && (
          <Profile
            user={user}
            userRole={userRole}
            history={store.history}
            queueCount={store.queue.length}
            swipedCount={store.swipedIds.length}
            onRemoveHistory={store.removeFromHistory}
            onSignOut={signOut}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-100 px-2 pt-2 flex-shrink-0 safe-bottom">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all ${
                  isActive
                    ? 'text-orange-600 bg-orange-50'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <div className="relative">
                  <Icon size={20} />
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-orange-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Filters (affect the swipe deck only) */}
      {filtersOpen && (
        <div className="absolute inset-0 z-40 flex flex-col bg-gray-50">
          <div className="flex flex-shrink-0 items-center gap-1 border-b border-gray-100 bg-white px-3 py-2">
            <button
              onClick={() => setFiltersOpen(false)}
              className="p-2 text-gray-500 transition-colors hover:text-gray-800"
              aria-label="Назад"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className="text-lg font-bold text-gray-900">Фильтры</h2>
          </div>
          <div className="min-h-0 flex-1">
            <Settings
              preferences={store.preferences}
              onChange={store.setPreferences}
            />
          </div>
        </div>
      )}

      {typeof window !== 'undefined' && window.location.search.includes('diag=1') && <Diag />}
    </div>
  );
}

export default App;
