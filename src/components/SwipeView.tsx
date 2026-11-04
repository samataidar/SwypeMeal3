import { useCallback, useEffect, useRef, useState } from 'react';
import { Recipe } from '../types';
import { resolveImageUrl } from '../utils/imageUrl';
import RecipeDetail from './RecipeDetail';
import { RefreshCw, Loader2, Clock, Flame, Users } from 'lucide-react';

const SWIPE_THRESHOLD = 100;
const OPEN_DETAILS_PULL = 70;
const STACK_DEPTH = 3;

const difficultyLabel: Record<Recipe['difficulty'], string> = {
  easy: 'Легко',
  medium: 'Средне',
  hard: 'Сложно',
};

interface SwipeCardProps {
  recipe: Recipe;
  depth: number;
  offsetX: number;
  offsetY: number;
  isDragging: boolean;
  exiting: 'left' | 'right' | null;
}

function SwipeCard({ recipe, depth, offsetX, offsetY, isDragging, exiting }: SwipeCardProps) {
  const isTop = depth === 0;

  // Stamps fade in as the card is dragged.
  // Stamps belong to the card being dragged, never to the ones behind it.
  const likeOpacity = isTop ? Math.max(0, Math.min(1, offsetX / 90)) : 0;
  const nopeOpacity = isTop ? Math.max(0, Math.min(1, -offsetX / 90)) : 0;
  const openOpacity = isTop ? Math.max(0, Math.min(1, -offsetY / 90)) : 0;

  const transform = isTop
    ? `translateX(${offsetX}px) translateY(${offsetY}px) rotate(${offsetX * 0.05}deg)`
    : `translateY(${depth * 12}px) scale(${1 - depth * 0.05})`;

  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-[28px] bg-gray-900 shadow-2xl will-change-transform"
      style={{
        transform,
        zIndex: 10 - depth,
        opacity: isTop ? (exiting ? 0 : 1) : 1 - depth * 0.25,
        transition:
          isTop && isDragging
            ? 'none'
            : 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.32s ease',
      }}
    >
      <img
        src={resolveImageUrl(recipe.image)}
        alt={recipe.title}
        className="absolute inset-0 h-full w-full select-none object-cover"
        draggable={false}
      />

      {/* Readability gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-black/10" />

      {/* Swipe stamps */}
      <div
        className="pointer-events-none absolute left-5 top-8 -rotate-12 rounded-xl border-4 border-green-400 px-3 py-1.5 text-xl font-extrabold uppercase tracking-wide text-green-400"
        style={{ opacity: likeOpacity }}
      >
        В очередь
      </div>
      <div
        className="pointer-events-none absolute right-5 top-8 rotate-12 rounded-xl border-4 border-red-400 px-3 py-1.5 text-lg font-extrabold uppercase tracking-wide text-red-400"
        style={{ opacity: nopeOpacity }}
      >
        Пропустить
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 flex justify-center"
        style={{ opacity: openOpacity }}
      >
        <div className="rounded-xl border-4 border-white/80 px-3 py-1.5 text-sm font-extrabold uppercase tracking-wide text-white/90">
          Рецепт
        </div>
      </div>

      {/* Bottom overlay */}
      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
        <h2 className="text-2xl font-bold leading-tight drop-shadow-lg">{recipe.title}</h2>
        <p className="mt-1 line-clamp-2 text-sm text-white/80">{recipe.description}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 backdrop-blur-sm">
            <Clock size={12} />
            {recipe.cookTime} мин
          </span>
          <span className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 backdrop-blur-sm">
            <Flame size={12} />
            {recipe.calories} ккал
          </span>
          <span className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 backdrop-blur-sm">
            <Users size={12} />
            {recipe.servings} порц.
          </span>
          <span className="rounded-full bg-orange-500/80 px-2.5 py-1 font-medium">
            {difficultyLabel[recipe.difficulty]}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
          <span className="rounded-md bg-blue-500/30 px-1.5 py-0.5">Б {recipe.protein}г</span>
          <span className="rounded-md bg-yellow-500/30 px-1.5 py-0.5">Ж {recipe.fat}г</span>
          <span className="rounded-md bg-green-500/30 px-1.5 py-0.5">У {recipe.carbs}г</span>
        </div>
      </div>
    </div>
  );
}

interface SwipeViewProps {
  recipes: Recipe[];
  onLike: (recipe: Recipe) => void;
  onDislike: (recipe: Recipe) => void;
  /** Clears the swiped list so the deck can be filled again. */
  onReset: () => void | Promise<void>;
  /** Pulls fresh data from the backend (optional). */
  onRefresh?: () => void | Promise<void>;
}

export default function SwipeView({ recipes: availableRecipes, onLike, onDislike, onReset, onRefresh }: SwipeViewProps) {
  // Keep the deck stable: it only resets on "Обновить" or when it runs out and
  // new recipes become available.
  const [stableRecipes, setStableRecipes] = useState<Recipe[]>(() => [...availableRecipes]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exitAnim, setExitAnim] = useState<'left' | 'right' | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingRefresh, setPendingRefresh] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startOffsetRef = useRef(0);
  const movedRef = useRef(false);

  useEffect(() => {
    if (stableRecipes.length === 0 && availableRecipes.length > 0) {
      setStableRecipes([...availableRecipes]);
      setCurrentIndex(0);
    }
  }, [availableRecipes, stableRecipes.length]);

  const openDetails = () => {
    if (currentIndex < stableRecipes.length) {
      setSelectedRecipe(stableRecipes[currentIndex]);
    }
  };

  const triggerSwipe = (direction: 'left' | 'right') => {
    if (exitAnim) return;
    setExitAnim(direction);
    setOffsetY(0);
    setOffsetX(direction === 'right' ? 640 : -640);

    setTimeout(() => {
      if (direction === 'right') {
        onLike(stableRecipes[currentIndex]);
      } else {
        onDislike(stableRecipes[currentIndex]);
      }
      setCurrentIndex((prev) => prev + 1);
      setOffsetX(0);
      setExitAnim(null);
    }, 260);
  };

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (exitAnim) return;
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
  }, [offsetX, exitAnim]);

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
  }, [isDragging, offsetX, offsetY, currentIndex, stableRecipes, exitAnim]);

  // Keyboard: ←/→ swipe, ↑/Enter open the recipe.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (selectedRecipe) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        triggerSwipe('left');
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        triggerSwipe('right');
      } else if (event.key === 'ArrowUp' || event.key === 'Enter') {
        event.preventDefault();
        openDetails();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const handleReset = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setPendingRefresh(true);
    try {
      await onReset();
      await onRefresh?.();
    } catch {
      // Keep the current screen; the button can be pressed again.
    } finally {
      setRefreshing(false);
    }
  };
  // Rebuild the deck only after an explicit refresh, once the store has
  // recomputed the available recipes.
  useEffect(() => {
    if (!pendingRefresh || availableRecipes.length === 0) return;
    setStableRecipes([...availableRecipes]);
    setCurrentIndex(0);
    setPendingRefresh(false);
  }, [pendingRefresh, availableRecipes]);

  if (stableRecipes.length === 0 || currentIndex >= stableRecipes.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 text-6xl">🎉</div>
        <h2 className="mb-6 text-xl font-bold text-gray-800">
          Вы просмотрели все доступные рецепты
        </h2>
        <button
          onClick={handleReset}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-60"
        >
          {refreshing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
          Обновить
        </button>
      </div>
    );
  }

  const visibleCards = stableRecipes.slice(currentIndex, currentIndex + STACK_DEPTH);

  return (
    <div className="flex h-full flex-col px-3 pb-2 pt-2">
      <div
        className="relative flex-1 min-h-0 cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'none' }}
      >
        {visibleCards
          .map((recipe, depth) => (
            <SwipeCard
              key={recipe.id}
              recipe={recipe}
              depth={depth}
              offsetX={offsetX}
              offsetY={offsetY}
              isDragging={isDragging}
              exiting={depth === 0 ? exitAnim : null}
            />
          ))
          .reverse()}
      </div>

      {selectedRecipe && (
        <RecipeDetail recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />
      )}
    </div>
  );
}
