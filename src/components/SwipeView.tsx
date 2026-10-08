import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Recipe } from '../types';
import { Heart, X, Clock, Flame, Info, RotateCcw } from 'lucide-react';

interface SwipeCardProps {
  recipe: Recipe;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onInfo: () => void;
}

function SwipeCard({ recipe, onSwipeLeft, onSwipeRight, onInfo }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnd = (_: any, info: any) => {
    setIsDragging(false);
    if (info.offset.x > 100) {
      onSwipeRight();
    } else if (info.offset.x < -100) {
      onSwipeLeft();
    }
  };

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

  return (
    <motion.div
      ref={cardRef}
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      className="absolute w-full max-w-sm mx-auto cursor-grab active:cursor-grabbing"
      whileTap={{ scale: 1.02 }}
    >
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        {/* Image/Emoji area */}
        <div className="relative h-48 bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
          <span className="text-8xl">{recipe.image}</span>
          
          {/* Like indicator */}
          <motion.div
            style={{ opacity: likeOpacity }}
            className="absolute top-4 left-4 bg-green-500 text-white px-4 py-2 rounded-xl font-bold text-lg rotate-[-15deg] border-4 border-green-300"
          >
            В ОЧЕРЕДЬ!
          </motion.div>
          
          {/* Nope indicator */}
          <motion.div
            style={{ opacity: nopeOpacity }}
            className="absolute top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-xl font-bold text-lg rotate-[15deg] border-4 border-red-300"
          >
            НЕТ
          </motion.div>

          {/* Difficulty badge */}
          <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium ${difficultyColor[recipe.difficulty]}`}>
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
            {recipe.tags.map((tag) => (
              <span key={tag} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
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
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);

  const handleSwipeRight = () => {
    if (currentIndex < availableRecipes.length) {
      setExitDirection('right');
      setTimeout(() => {
        onLike(availableRecipes[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
        setExitDirection(null);
      }, 200);
    }
  };

  const handleSwipeLeft = () => {
    if (currentIndex < availableRecipes.length) {
      setExitDirection('left');
      setTimeout(() => {
        onDislike(availableRecipes[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
        setExitDirection(null);
      }, 200);
    }
  };

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
  const nextRecipe = availableRecipes[currentIndex + 1];

  return (
    <div className="flex flex-col items-center h-full px-4 py-4">
      {/* Card stack */}
      <div className="relative w-full max-w-sm flex-1 flex items-center justify-center">
        {/* Background card */}
        {nextRecipe && (
          <motion.div
            key={nextRecipe.id + '-bg'}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 0.95, opacity: 1 }}
            className="absolute w-full"
          >
            <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-100 opacity-50">
              <div className="h-48 bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
                <span className="text-8xl opacity-50">{nextRecipe.image}</span>
              </div>
              <div className="p-5">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-100 rounded w-full mb-1"></div>
                <div className="h-4 bg-gray-100 rounded w-2/3"></div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Current card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentRecipe.id}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{
              x: exitDirection === 'right' ? 300 : exitDirection === 'left' ? -300 : 0,
              opacity: 0,
              rotate: exitDirection === 'right' ? 15 : exitDirection === 'left' ? -15 : 0,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="w-full"
          >
            <SwipeCard
              recipe={currentRecipe}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              onInfo={() => setSelectedRecipe(currentRecipe)}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-6 mt-6 mb-4">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleSwipeLeft}
          className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-red-200 hover:border-red-400 transition-colors"
        >
          <X size={28} className="text-red-500" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setSelectedRecipe(currentRecipe)}
          className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-blue-200 hover:border-blue-400 transition-colors"
        >
          <Info size={20} className="text-blue-500" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleSwipeRight}
          className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-green-200 hover:border-green-400 transition-colors"
        >
          <Heart size={28} className="text-green-500" />
        </motion.button>
      </div>

      {/* Progress */}
      <div className="text-sm text-gray-400 mb-2">
        {currentIndex + 1} из {availableRecipes.length}
      </div>

      {/* Recipe detail modal */}
      <AnimatePresence>
        {selectedRecipe && (
          <RecipeDetail recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function RecipeDetail({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="text-center mb-4">
            <span className="text-6xl">{recipe.image}</span>
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
                  <span className="w-1.5 h-1.5 bg-orange-400 rounded-full"></span>
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
      </motion.div>
    </motion.div>
  );
}
