import { useState, useEffect } from 'react';
import { Heart, List, History as HistoryIcon, Settings as SettingsIcon, UtensilsCrossed, Plus, Wifi, WifiOff, RefreshCw, Loader2, LogOut, User } from 'lucide-react';
import SwipeView from './components/SwipeView';
import CookQueue from './components/CookQueue';
import History from './components/History';
import Settings from './components/Settings';
import AddRecipe from './components/AddRecipe';
import LoginPage from './components/LoginPage';
import { useStore } from './store';
import { useAuth } from './contexts/AuthContext';
import { api } from './api';

type Tab = 'swipe' | 'queue' | 'history' | 'settings' | 'add';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('swipe');
  const store = useStore();
  const { user, loading, signOut } = useAuth();

  // Set user ID in API client when user changes
  useEffect(() => {
    if (user) {
      api.setUserId(user.id);
    }
  }, [user]);

  // Show loading screen while checking auth
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-500">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage />;
  }

  const tabs: { id: Tab; icon: any; label: string; badge?: number }[] = [
    { id: 'swipe', icon: Heart, label: 'Свайп' },
    { id: 'queue', icon: List, label: 'Очередь', badge: store.queue.length },
    { id: 'history', icon: HistoryIcon, label: 'История', badge: store.history.length },
    { id: 'add', icon: Plus, label: 'Добавить' },
    { id: 'settings', icon: SettingsIcon, label: 'Фильтры' },
  ];

  const SyncIndicator = () => {
    if (!store.syncEnabled) {
      return (
        <button
          onClick={store.toggleSync}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 text-gray-500 text-xs hover:bg-gray-200 transition-colors"
          title="Синхронизация отключена. Нажмите для включения."
        >
          <WifiOff size={12} />
          <span className="hidden sm:inline">Локально</span>
        </button>
      );
    }

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
    <div className="h-screen flex flex-col bg-gray-50 max-w-lg mx-auto relative overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
            <UtensilsCrossed size={16} className="text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">SwypeMeal</h1>
        </div>
        <div className="flex items-center gap-2">
          <SyncIndicator />
          <div className="text-xs text-gray-400">
            {store.availableRecipes.length} рецептов
          </div>
          {/* User menu */}
          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200">
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
            <button
              onClick={signOut}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Выйти"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'swipe' && (
          <SwipeView
            recipes={store.availableRecipes}
            onLike={(recipe) => {
              store.addToQueue(recipe);
              store.markSwiped(recipe.id);
            }}
            onDislike={(recipe) => {
              store.markSwiped(recipe.id);
            }}
            onReset={store.resetSwiped}
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
        {activeTab === 'history' && (
          <History
            history={store.history}
            onRemove={store.removeFromHistory}
          />
        )}
        {activeTab === 'add' && (
          <AddRecipe
            onSubmit={store.submitRecipe}
            pendingCount={0}
          />
        )}
        {activeTab === 'settings' && (
          <Settings
            preferences={store.preferences}
            onChange={store.setPreferences}
            syncEnabled={store.syncEnabled}
            onToggleSync={store.toggleSync}
            backendAvailable={store.backendAvailable}
            lastSync={store.lastSync}
            onManualSync={store.manualSync}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-100 px-2 py-2 flex-shrink-0 safe-bottom">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all ${
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
    </div>
  );
}

export default App;
