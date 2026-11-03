import { useCallback, useEffect, useRef, useState } from 'react';
import { Recipe } from '../types';
import { resolveImageUrl } from '../utils/imageUrl';
import RecipeDetail from './RecipeDetail';
import { Clock, Flame, RotateCcw } from 'lucide-react';

interface SwipeCardProps {
  recipe: Recipe;
  offsetX?: number;
}

function SwipeCard({ recipe, offsetX = 0 }: SwipeCardProps) {
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

  const likeOpacity = Math.max(0, Math.min(1, offsetX / 100));
  const nopeOpacity = Math.max(0, Math.min(1, -offsetX / 100));

  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-gray-100">
      {/* Image area */}
      <div className="relative h-56 sm:h-64 bg-gradient-to-br from-orange-50 to-amber-50 overflow-hidden">
        <img 
          src={resolveImageUrl(recipe.image)}
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
        <div className="p-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{recipe.title}</h3>
          <p className="text-base text-gray-500 mb-3 line-clamp-2">{recipe.description}</p>

          {/* Stats */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1 text-base text-gray-600">
              <Clock size={16} className="text-orange-500" />
              <span>{recipe.cookTime} мин</span>
            </div>
            <div className="flex items-center gap-1 text-base text-gray-600">
              <Flame size={16} className="text-red-500" />
              <span>{recipe.calories} ккал</span>
            </div>
            <div className="text-base text-gray-600">
              {recipe.servings} порц.
            </div>
          </div>

          {/* Macros */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-blue-50 rounded-xl p-2.5 text-center">
              <div className="text-xs text-blue-600">Белки</div>
              <div className="text-base font-bold text-blue-700">{recipe.protein}г</div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-2.5 text-center">
              <div className="text-xs text-yellow-600">Жиры</div>
              <div className="text-base font-bold text-yellow-700">{recipe.fat}г</div>
            </div>
            <div className="bg-green-50 rounded-xl p-2.5 text-center">
              <div className="text-xs text-green-600">Углев.</div>
              <div className="text-base font-bold text-green-700">{recipe.carbs}г</div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1">
            {recipe.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full text-xs">
                #{tag}
              </span>
            ))}
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
  // Стабилизируем список рецептов - создаем копию при монтировании
  // и не пересоздаем при каждом изменении availableRecipes
  const [stableRecipes, setStableRecipes] = useState<Recipe[]>(() => [...availableRecipes]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exitAnim, setExitAnim] = useState<'left' | 'right' | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startOffsetRef = useRef(0);
  const movedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 100;
  const OPEN_DETAILS_PULL = 70;

  // Обновляем стабильный список только когда пользователь нажимает "Начать заново"
  // или когда availableRecipes становится пустым (все рецепты просмотрены)
  useEffect(() => {
    // Если текущий список пуст и есть новые доступные рецепты - обновляем
    if (stableRecipes.length === 0 && availableRecipes.length > 0) {
      setStableRecipes([...availableRecipes]);
      setCurrentIndex(0);
    }
  }, [availableRecipes, stableRecipes.length]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    movedRef.current = false;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    startOffsetRef.current = offsetX;
    try {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      // Some browsers reject capture for already-released pointers.
    }
  }, [offsetX]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startXRef.current;
    const deltaY = e.clientY - startYRef.current;

    if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
      movedRef.current = true;
    }

    // Vertical drags only pull the card up to open the recipe sheet.
    if (deltaY < 0 && Math.abs(deltaY) > Math.abs(deltaX)) {
      setOffsetY(Math.max(-140, deltaY));
      setOffsetX(0);
    } else if (Math.abs(deltaX) >= Math.abs(deltaY)) {
      setOffsetY(0);
      setOffsetX(startOffsetRef.current + deltaX);
    }
  }, [isDragging]);

  const openDetails = () => {
    if (currentIndex < stableRecipes.length) {
      setSelectedRecipe(stableRecipes[currentIndex]);
    }
  };

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    const horizontal = offsetX;
    const vertical = offsetY;

    // Swipe up or a simple tap opens the full recipe.
    if (vertical <= -OPEN_DETAILS_PULL && Math.abs(horizontal) < SWIPE_THRESHOLD) {
      setOffsetX(0);
      setOffsetY(0);
      openDetails();
      return;
    }

    if (!movedRef.current) {
      setOffsetX(0);
      setOffsetY(0);
      openDetails();
      return;
    }

    setOffsetY(0);
    if (horizontal > SWIPE_THRESHOLD) {
      triggerSwipe('right');
    } else if (horizontal < -SWIPE_THRESHOLD) {
      triggerSwipe('left');
    } else {
      setOffsetX(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, offsetX, offsetY, currentIndex, stableRecipes]);

  const triggerSwipe = (direction: 'left' | 'right') => {
    setExitAnim(direction);
    setOffsetY(0);
    setOffsetX(direction === 'right' ? 500 : -500);

    setTimeout(() => {
      if (direction === 'right') {
        onLike(stableRecipes[currentIndex]);
      } else {
        onDislike(stableRecipes[currentIndex]);
      }
      setCurrentIndex((prev) => prev + 1);
      setOffsetX(0);
      setExitAnim(null);
    }, 250);
  };

  const handleButtonSwipe = (direction: 'left' | 'right') => {
    if (currentIndex >= stableRecipes.length || selectedRecipe) return;
    triggerSwipe(direction);
  };

  // Keyboard support instead of on-screen buttons: ←/→ swipe, ↑/Enter details.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (selectedRecipe) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handleButtonSwipe('left');
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleButtonSwipe('right');
      } else if (event.key === 'ArrowUp' || event.key === 'Enter') {
        event.preventDefault();
        openDetails();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // Handle reset - обновляем стабильный список из новых доступных рецептов
  const handleReset = () => {
    onReset();
    // После сброса swipedIds, availableRecipes обновится
    // Обновляем stableRecipes при следующем рендере через useEffect
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
        <p className="text-gray-500 mb-6">Вы просмотрели все доступные рецепты. Сбросьте список или измените фильтры.</p>
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

  return (
    <div className="flex flex-col items-center h-full px-3 py-3">
      {/* Card stack */}
      <div
        ref={containerRef}
        className="relative w-full flex-1 min-h-0 overflow-hidden flex items-center justify-center select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'pan-y' }}
      >
        {/* Background card (decorative) */}
        {nextRecipe && (
          <div
            aria-hidden
            className="absolute inset-x-3 inset-y-3 rounded-3xl bg-white/70 border border-gray-100 shadow-sm"
          />
        )}

        {/* Current card */}
        <div
          className="relative w-full max-h-full overflow-y-auto rounded-3xl"
          style={{
            transform: `translateX(${offsetX}px) translateY(${offsetY}px) rotate(${offsetX * 0.08}deg)`,
            transition: exitAnim ? 'transform 0.25s ease-out, opacity 0.25s ease-out' : isDragging ? 'none' : 'transform 0.3s ease-out',
            opacity: exitAnim ? 0 : 1,
          }}
        >
          <SwipeCard recipe={currentRecipe} offsetX={offsetX} />
        </div>
      </div>

      {/* Progress */}
      <div className="text-xs text-gray-400 mt-2 mb-1">
        {currentIndex + 1} из {stableRecipes.length}
      </div>

      {/* Recipe detail modal */}
      {selectedRecipe && (
        <RecipeDetail recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />
      )}
    </div>
  );
}
