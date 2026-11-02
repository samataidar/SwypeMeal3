import { useState, useRef, useCallback, useEffect } from 'react';
import { Recipe } from '../types';
import { Heart, X, Clock, Flame, Info, RotateCcw } from 'lucide-react';

interface SwipeViewProps {
  recipes: Recipe[];
  onLike: (recipe: Recipe) => void;
  onDislike: (recipe: Recipe) => void;
  onReset: () => void;
}

export default function SwipeView({ recipes: availableRecipes, onLike, onDislike, onReset }: SwipeViewProps) {
  const [stableRecipes, setStableRecipes] = useState<Recipe[]>(() => [...availableRecipes]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startOffsetRef = useRef(0);

  const SWIPE_THRESHOLD = 100;

  useEffect(() => {
    if (stableRecipes.length === 0 && availableRecipes.length > 0) {
      setStableRecipes([...availableRecipes]);
      setCurrentIndex(0);
    }
  }, [availableRecipes, stableRecipes.length]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    startXRef.current = e.clientX;
    startOffsetRef.current = offsetX;
  }, [offsetX]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const delta = e.clientX - startXRef.current;
    setOffsetX(startOffsetRef.current + delta);
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    if (offsetX > SWIPE_THRESHOLD) {
      triggerSwipe('right');
    } else if (offsetX < -SWIPE_THRESHOLD) {
      triggerSwipe('left');
    } else {
      setOffsetX(0);
    }
  }, [isDragging, offsetX]);

  const triggerSwipe = (direction: 'left' | 'right') => {
    setOffsetX(direction === 'right' ? 500 : -500);

    setTimeout(() => {
      if (direction === 'right') {
        onLike(stableRecipes[currentIndex]);
      } else {
        onDislike(stableRecipes[currentIndex]);
      }
      setCurrentIndex((prev) => prev + 1);
      setOffsetX(0);
    }, 250);
  };

  const handleButtonSwipe = (direction: 'left' | 'right') => {
    if (currentIndex >= stableRecipes.length) return;
    triggerSwipe(direction);
  };

  const handleReset = () => {
    onReset();
    setTimeout(() => {
      setStableRecipes([...availableRecipes]);
      setCurrentIndex(0);
    }, 100);
  };

  if (stableRecipes.length === 0 || currentIndex >= stableRecipes.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Рецепты закончились!</h2>
        <p className="text-gray-500 mb-6">Вы просмотрели все доступные рецепты.</p>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-2xl font-medium hover:bg-orange-600 transition-colors"
        >
          <RotateCcw size={18} />
          Начать заново
        </button>
      </div>
    );
  }

  const currentRecipe = stableRecipes[currentIndex];
  const nextRecipe = currentIndex + 1 < stableRecipes.length ? stableRecipes[currentIndex + 1] : null;

  const rotation = offsetX * 0.08;
  const likeOpacity = Math.max(0, Math.min(1, offsetX / 100));
  const nopeOpacity = Math.max(0, Math.min(1, -offsetX / 100));

  return (
    <div className="flex flex-col items-center h-full px-4 py-4">
      <div
        className="relative w-full max-w-sm flex-1 flex items-center justify-center select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'pan-y' }}
      >
        {nextRecipe && (
          <div className="absolute w-full" style={{ transform: 'translateY(8px) scale(0.95)', zIndex: 5, opacity: 0.6 }}>
            <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-100">
              <div className="relative h-48 bg-gradient-to-br from-orange-50 to-amber-50 overflow-hidden">
                <img src={nextRecipe.image} alt={nextRecipe.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-5">
                <h3 className="text-xl font-bold text-gray-900">{nextRecipe.title}</h3>
              </div>
            </div>
          </div>
        )}

        <div
          className="absolute w-full"
          style={{
            transform: `translateX(${offsetX}px) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
            zIndex: 10,
          }}
        >
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="relative h-48 bg-gradient-to-br from-orange-50 to-amber-50 overflow-hidden">
              <img src={currentRecipe.image} alt={currentRecipe.title} className="w-full h-full object-cover select-none" draggable={false} />
              
              <div
                className="absolute top-4 left-4 bg-green-500 text-white px-4 py-2 rounded-xl font-bold text-lg -rotate-12 border-4 border-green-300 pointer-events-none"
                style={{ opacity: likeOpacity }}
              >
                В ОЧЕРЕДЬ!
              </div>

              <div
                className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-xl font-bold text-lg rotate-12 border-4 border-red-300 pointer-events-none"
                style={{ opacity: nopeOpacity }}
              >
                НЕТ
              </div>

              <div className={`absolute bottom-3 right-3 px-3 py-1 rounded-full text-xs font-medium ${
                currentRecipe.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                currentRecipe.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {currentRecipe.difficulty === 'easy' ? 'Легко' : currentRecipe.difficulty === 'medium' ? 'Средне' : 'Сложно'}
              </div>
            </div>

            <div className="p-5">
              <h3 className="text-xl font-bold text-gray-900 mb-1">{currentRecipe.title}</h3>
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{currentRecipe.description}</p>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Clock size={14} className="text-orange-500" />
                  <span>{currentRecipe.cookTime} мин</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Flame size={14} className="text-red-500" />
                  <span>{currentRecipe.calories} ккал</span>
                </div>
                <div className="text-sm text-gray-600">{currentRecipe.servings} порц.</div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-blue-50 rounded-xl p-2 text-center">
                  <div className="text-xs text-blue-600">Белки</div>
                  <div className="text-sm font-bold text-blue-700">{currentRecipe.protein}г</div>
                </div>
                <div className="bg-yellow-50 rounded-xl p-2 text-center">
                  <div className="text-xs text-yellow-600">Жиры</div>
                  <div className="text-sm font-bold text-yellow-700">{currentRecipe.fat}г</div>
                </div>
                <div className="bg-green-50 rounded-xl p-2 text-center">
                  <div className="text-xs text-green-600">Углев.</div>
                  <div className="text-sm font-bold text-green-700">{currentRecipe.carbs}г</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {currentRecipe.tags.slice(0, 4).map((tag) => (
                  <span key={tag} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 mt-6 mb-4">
        <button
          onClick={() => handleButtonSwipe('left')}
          className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-red-200 hover:border-red-400 hover:bg-red-50 active:scale-95 transition-all"
        >
          <X size={28} className="text-red-500" />
        </button>

        <button
          onClick={() => setSelectedRecipe(currentRecipe)}
          className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 active:scale-95 transition-all"
        >
          <Info size={20} className="text-blue-500" />
        </button>

        <button
          onClick={() => handleButtonSwipe('right')}
          className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-green-200 hover:border-green-400 hover:bg-green-50 active:scale-95 transition-all"
        >
          <Heart size={28} className="text-green-500" />
        </button>
      </div>

      <div className="text-sm text-gray-400 mb-2">
        {currentIndex + 1} из {stableRecipes.length}
      </div>

      {selectedRecipe && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedRecipe(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="text-center mb-4">
                <img src={selectedRecipe.image} alt={selectedRecipe.title} className="w-full h-48 object-cover rounded-2xl" />
                <h2 className="text-2xl font-bold mt-3">{selectedRecipe.title}</h2>
                <p className="text-gray-500 mt-1">{selectedRecipe.description}</p>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-6">
                <div className="bg-orange-50 rounded-xl p-3 text-center">
                  <div className="text-xs text-orange-600">Ккал</div>
                  <div className="font-bold text-orange-700">{selectedRecipe.calories}</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <div className="text-xs text-blue-600">Белки</div>
                  <div className="font-bold text-blue-700">{selectedRecipe.protein}г</div>
                </div>
                <div className="bg-yellow-50 rounded-xl p-3 text-center">
                  <div className="text-xs text-yellow-600">Жиры</div>
                  <div className="font-bold text-yellow-700">{selectedRecipe.fat}г</div>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <div className="text-xs text-green-600">Углев.</div>
                  <div className="font-bold text-green-700">{selectedRecipe.carbs}г</div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-bold text-gray-800 mb-2">🧾 Ингредиенты</h3>
                <ul className="space-y-1">
                  {selectedRecipe.ingredients.map((ing, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-orange-400 rounded-full flex-shrink-0"></span>
                      {ing}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-6">
                <h3 className="font-bold text-gray-800 mb-2">👨‍🍳 Приготовление</h3>
                <ol className="space-y-2">
                  {selectedRecipe.steps.map((step, i) => (
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
                onClick={() => setSelectedRecipe(null)}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-2xl font-medium hover:bg-gray-200 transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
