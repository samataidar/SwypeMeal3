import { useState, useRef, useCallback, useEffect } from 'react';
import { Recipe } from '../types';
import { Heart, X, Clock, Flame, Info, RotateCcw } from 'lucide-react';

interface SwipeCardProps {
  recipe: Recipe;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onInfo: () => void;
  isTop: boolean;
  offsetX: number;
}

function SwipeCard({ recipe, onSwipeLeft, onSwipeRight, onInfo, isTop, offsetX }: SwipeCardProps) {
  const difficultyColor = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-red-100 text-red-700',
  };

  const difficultyLabel = {
    easy: 'Легко',
    medium: 'Средне',
    hard: 'Сложно',
  };

  const rotation = offsetX * 0.08;
  const likeOpacity = Math.max(0, Math.min(1, offsetX / 100));
  const nopeOpacity = Math.max(0, Math.min(1, -offsetX / 100));

  return (
    <div
      className={`absolute w-full transition-transform ${isTop ? 'duration-0' : 'duration-300'}`}
      style={{
        transform: isTop
          ? `translateX(${offsetX}px) rotate(${rotation}deg)`
          : `translateY(8px) scale(0.95)`,
        zIndex: isTop ? 10 : 5,
        opacity: isTop ? 1 : 0.6,
      }}
    >
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
      {/* Image area */}
      <div className="relative h-48 bg-gradient-to-br from-orange-50 to-amber-50 overflow-hidden">
        <img 
          src={recipe.image} 
          alt={recipe.title}
          className="w-full h-full object-cover select-none"
          draggable={false}
        />
          {/* Like indicator */}
          <div
            className="absolute top-4 left-4 bg-green-500 text-white px-4 py-2 rounded-xl font-bold text-lg -rotate-12 border-4 border-green-300 pointer-events-none"
            style={{ opacity: likeOpacity }}
          >
            В ОЧЕРЕДЬ!
          </div>

          {/* Nope indicator */}
          <div
            className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-xl font-bold text-lg rotate-12 border-4 border-red-300 pointer-events-none"
            style={{ opacity: nopeOpacity }}
          >
            НЕТ
          </div>

          {/* Difficulty badge */}
          <div className={`absolute bottom-3 right-3 px-3 py-1 rounded-full text-xs font-medium ${difficultyColor[recipe.difficulty]}`}>
            {difficultyLabel[recipe.difficulty]}
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="text-xl font-bold text-gray-900 mb-1">{recipe.title}</h3>
          <p className="text-sm text-gray-500 mb-3 line-clamp-2">{recipe.description}</p>

          {/* Stats */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Clock size={14} className="text-orange-500" />
              <span>{recipe.cookTime} мин</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Flame size={14} className="text-red-500" />
              <span>{recipe.calories} ккал</span>
            </div>
            <div className="text-sm text-gray-600">
              {recipe.servings} порц.
            </div>
          </div>

          {/* Macros */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-blue-50 rounded-xl p-2 text-center">
              <div className="text-xs text-blue-600">Белки</div>
              <div className="text-sm font-bold text-blue-700">{recipe.protein}г</div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-2 text-center">
              <div className="text-xs text-yellow-600">Жиры</div>
              <div className="text-sm font-bold text-yellow-700">{recipe.fat}г</div>
            </div>
            <div className="bg-green-50 rounded-xl p-2 text-center">
              <div className="text-xs text-green-600">Углев.</div>
              <div className="text-sm font-bold text-green-700">{recipe.carbs}г</div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {recipe.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface SwipeViewProps {
  recipes: Recipe[];
  onLike: (recipe: Recipe) => void;
  onDislike: (recipe: Recipe) => void;
  onReset: () => void;
}

export default function SwipeView({ recipes: availableRecipes, onLike, onDislike, onReset }: SwipeViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exitAnim, setExitAnim] = useState<'left' | 'right' | null>(null);
  const startXRef = useRef(0);
  const startOffsetRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 100;

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    startXRef.current = e.clientX;
    startOffsetRef.current = offsetX;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
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
    setExitAnim(direction);
    setOffsetX(direction === 'right' ? 500 : -500);

    setTimeout(() => {
      if (direction === 'right') {
        onLike(availableRecipes[currentIndex]);
      } else {
        onDislike(availableRecipes[currentIndex]);
      }
      setCurrentIndex((prev) => prev + 1);
      setOffsetX(0);
      setExitAnim(null);
    }, 250);
  };

  const handleButtonSwipe = (direction: 'left' | 'right') => {
    if (currentIndex >= availableRecipes.length) return;
    triggerSwipe(direction);
  };

  // Reset index when recipes change (after reset)
  useEffect(() => {
    if (currentIndex > 0 && availableRecipes.length > 0 && currentIndex >= availableRecipes.length) {
      setCurrentIndex(0);
    }
  }, [availableRecipes.length]);

  if (availableRecipes.length === 0 || currentIndex >= availableRecipes.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Рецепты закончились!</h2>
        <p className="text-gray-500 mb-6">Вы просмотрели все доступные рецепты. Сбросьте список или измените фильтры.</p>
        <button
          onClick={onReset}
          className="flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-2xl font-medium hover:bg-orange-600 transition-colors"
        >
          <RotateCcw size={18} />
          Начать заново
        </button>
      </div>
    );
  }

  const currentRecipe = availableRecipes[currentIndex];
  const nextRecipe = currentIndex + 1 < availableRecipes.length ? availableRecipes[currentIndex + 1] : null;

  return (
    <div className="flex flex-col items-center h-full px-4 py-4">
      {/* Card stack */}
      <div
        ref={containerRef}
        className="relative w-full max-w-sm flex-1 flex items-center justify-center select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'pan-y' }}
      >
        {/* Background card */}
        {nextRecipe && (
          <SwipeCard
            recipe={nextRecipe}
            onSwipeLeft={() => {}}
            onSwipeRight={() => {}}
            onInfo={() => {}}
            isTop={false}
            offsetX={0}
          />
        )}

        {/* Current card */}
        <div
          className="absolute w-full"
          style={{
            transition: exitAnim ? 'transform 0.25s ease-out, opacity 0.25s ease-out' : isDragging ? 'none' : 'transform 0.3s ease-out',
            opacity: exitAnim ? 0 : 1,
          }}
        >
          <SwipeCard
            recipe={currentRecipe}
            onSwipeLeft={() => handleButtonSwipe('left')}
            onSwipeRight={() => handleButtonSwipe('right')}
            onInfo={() => setSelectedRecipe(currentRecipe)}
            isTop={true}
            offsetX={offsetX}
          />
        </div>
      </div>

      {/* Action buttons */}
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

      {/* Progress */}
      <div className="text-sm text-gray-400 mb-2">
        {currentIndex + 1} из {availableRecipes.length}
      </div>

      {/* Recipe detail modal */}
      {selectedRecipe && (
        <RecipeDetail recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />
      )}
    </div>
  );
}

function RecipeDetail({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
      <div className="text-center mb-4">
        <img 
          src={recipe.image} 
          alt={recipe.title}
          className="w-full h-48 object-cover rounded-2xl"
        />
        <h2 className="text-2xl font-bold mt-3">{recipe.title}</h2>
        <p className="text-gray-500 mt-1">{recipe.description}</p>
      </div>
          {/* Macros */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            <div className="bg-orange-50 rounded-xl p-3 text-center">
              <div className="text-xs text-orange-600">Ккал</div>
              <div className="font-bold text-orange-700">{recipe.calories}</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <div className="text-xs text-blue-600">Белки</div>
              <div className="font-bold text-blue-700">{recipe.protein}г</div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-3 text-center">
              <div className="text-xs text-yellow-600">Жиры</div>
              <div className="font-bold text-yellow-700">{recipe.fat}г</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <div className="text-xs text-green-600">Углев.</div>
              <div className="font-bold text-green-700">{recipe.carbs}г</div>
            </div>
          </div>

          {/* Ingredients */}
          <div className="mb-6">
            <h3 className="font-bold text-gray-800 mb-2">🧾 Ингредиенты</h3>
            <ul className="space-y-1">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-orange-400 rounded-full flex-shrink-0"></span>
                  {ing}
                </li>
              ))}
            </ul>
          </div>

          {/* Steps */}
          <div className="mb-6">
            <h3 className="font-bold text-gray-800 mb-2">👨‍🍳 Приготовление</h3>
            <ol className="space-y-2">
              {recipe.steps.map((step, i) => (
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
            onClick={onClose}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-2xl font-medium hover:bg-gray-200 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
