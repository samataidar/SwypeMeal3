import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, List, History as HistoryIcon, Settings as SettingsIcon, UtensilsCrossed } from 'lucide-react';
import SwipeView from './components/SwipeView';
import CookQueue from './components/CookQueue';
import History from './components/History';
import Settings from './components/Settings';
import { useStore } from './store';

type Tab = 'swipe' | 'queue' | 'history' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('swipe');
  const store = useStore();

  const tabs: { id: Tab; icon: any; label: string; badge?: number }[] = [
    { id: 'swipe', icon: Heart, label: 'Свайп' },
    { id: 'queue', icon: List, label: 'Очередь', badge: store.queue.length },
    { id: 'history', icon: HistoryIcon, label: 'История', badge: store.history.length },
    { id: 'settings', icon: SettingsIcon, label: 'Фильтры' },
  ];

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
        <div className="text-xs text-gray-400">
          {store.availableRecipes.length} рецептов
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
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
              />
            )}
            {activeTab === 'history' && (
              <History
                history={store.history}
                onRemove={store.removeFromHistory}
              />
            )}
            {activeTab === 'settings' && (
              <Settings
                preferences={store.preferences}
                onChange={store.setPreferences}
              />
            )}
          </motion.div>
        </AnimatePresence>
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
                className={`relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all ${
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
