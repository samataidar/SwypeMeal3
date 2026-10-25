"""
SwypeMeal Backend — FastAPI сервер
===================================
REST API для приложения планирования питания SwypeMeal.
Поддерживает: рецепты, очередь готовки, историю, настройки пользователя.

Запуск:
    pip install fastapi uvicorn pydantic
    uvicorn backend.main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid
import json
import os

app = FastAPI(title="SwypeMeal API", version="1.0.0")

# CORS для фронтенда и Telegram Mini App
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# Models
# ============================================

class Recipe(BaseModel):
    id: str
    title: str
    description: str
    image: str
    cook_time: int
    servings: int
    calories: int
    protein: float
    fat: float
    carbs: float
    ingredients: List[str]
    steps: List[str]
    tags: List[str]
    difficulty: str  # easy, medium, hard

class QueueItem(BaseModel):
    id: str
    recipe: Recipe
    added_at: str
    planned_date: Optional[str] = None

class HistoryItem(BaseModel):
    id: str
    recipe: Recipe
    cooked_at: str
    rating: Optional[int] = None
    notes: Optional[str] = None

class UserPreferences(BaseModel):
    max_calories: int = 800
    max_cook_time: int = 60
    exclude_tags: List[str] = []
    preferred_difficulty: List[str] = ["easy", "medium", "hard"]

class SwipeAction(BaseModel):
    recipe_id: str
    action: str  # "like" or "dislike"

class CookComplete(BaseModel):
    queue_item_id: str
    rating: Optional[int] = None
    notes: Optional[str] = None

class UserState(BaseModel):
    user_id: str
    queue: List[QueueItem] = []
    history: List[HistoryItem] = []
    swiped_ids: List[str] = []
    preferences: UserPreferences = UserPreferences()

# ============================================
# Simple file-based storage (replace with DB in production)
# ============================================

DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)

def load_user_state(user_id: str) -> UserState:
    filepath = os.path.join(DATA_DIR, f"{user_id}.json")
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
            return UserState(**data)
    return UserState(user_id=user_id)

def save_user_state(state: UserState):
    filepath = os.path.join(DATA_DIR, f"{state.user_id}.json")
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(state.model_dump(), f, ensure_ascii=False, indent=2)

# ============================================
# Recipe Database (in-memory, replace with DB)
# ============================================

RECIPES_DB: List[Recipe] = [
    Recipe(
        id="1",
        title="Паста Карбонара",
        description="Классическая итальянская паста с беконом, яйцом и пармезаном.",
        image="🍝",
        cook_time=25,
        servings=2,
        calories=520,
        protein=22,
        fat=24,
        carbs=55,
        ingredients=["Спагетти 200г", "Бекон 150г", "Яйца 3шт", "Пармезан 80г", "Чёрный перец", "Соль"],
        steps=["Отварите пасту", "Обжарьте бекон", "Смешайте яйца с пармезаном", "Соедините всё вместе"],
        tags=["итальянская", "паста", "быстрая"],
        difficulty="easy"
    ),
    Recipe(
        id="2",
        title="Том Ям с креветками",
        description="Острый тайский суп с креветками, грибами и кокосовым молоком.",
        image="🍜",
        cook_time=35,
        servings=4,
        calories=280,
        protein=18,
        fat=12,
        carbs=22,
        ingredients=["Креветки 400г", "Кокосовое молоко 400мл", "Грибы 200г", "Лемонграсс", "Галангал", "Лайм", "Чили"],
        steps=["Вскипятите бульон с лемонграссом", "Добавьте грибы", "Положите креветки", "Приправьте"],
        tags=["тайская", "суп", "острая", "морепродукты"],
        difficulty="medium"
    ),
    Recipe(
        id="3",
        title="Боул с курицей и авокадо",
        description="Полезный боул с grilled курицей, авокадо, киноа и соусом тахини.",
        image="🥗",
        cook_time=30,
        servings=2,
        calories=450,
        protein=35,
        fat=20,
        carbs=38,
        ingredients=["Куриная грудка 300г", "Киноа 150г", "Авокадо 1шт", "Огурец", "Помидоры черри", "Тахини"],
        steps=["Отварите киноа", "Обжарьте курицу", "Нарежьте овощи", "Соберите боул"],
        tags=["здоровая", "боул", "высокобелковая"],
        difficulty="easy"
    ),
    Recipe(
        id="4",
        title="Ризотто с грибами",
        description="Кремовое ризотто с белыми грибами и пармезаном.",
        image="🍚",
        cook_time=45,
        servings=3,
        calories=480,
        protein=14,
        fat=22,
        carbs=56,
        ingredients=["Рис арборио 300г", "Белые грибы 300г", "Лук", "Белое вино", "Бульон", "Пармезан"],
        steps=["Обжарьте грибы", "Обжарьте рис", "Добавляйте бульон", "Вмешайте пармезан"],
        tags=["итальянская", "рис", "вегетарианская"],
        difficulty="hard"
    ),
    Recipe(
        id="5",
        title="Тако с говядиной",
        description="Мексиканские тако с пряной говядиной и гуакамоле.",
        image="🌮",
        cook_time=30,
        servings=4,
        calories=380,
        protein=28,
        fat=18,
        carbs=28,
        ingredients=["Говяжий фарш 500г", "Тортильи 8шт", "Авокадо 2шт", "Помидоры", "Лук", "Кинза"],
        steps=["Обжарьте фарш со специями", "Приготовьте гуакамоле", "Соберите тако"],
        tags=["мексиканская", "мясо", "быстрая"],
        difficulty="easy"
    ),
    Recipe(
        id="6",
        title="Лосось терияки с рисом",
        description="Глазированный лосось в соусе терияки с жасминовым рисом.",
        image="🐟",
        cook_time=30,
        servings=2,
        calories=520,
        protein=38,
        fat=22,
        carbs=42,
        ingredients=["Филе лосося 2шт", "Рис 200г", "Брокколи 300г", "Соевый соус", "Мёд", "Имбирь"],
        steps=["Отварите рис", "Замаринуйте лосось", "Обжарьте лосось", "Подавайте с овощами"],
        tags=["японская", "рыба", "здоровая"],
        difficulty="medium"
    ),
    Recipe(
        id="7",
        title="Шаурма домашняя",
        description="Сочная домашняя шаурма с маринованной курицей.",
        image="🌯",
        cook_time=40,
        servings=3,
        calories=580,
        protein=32,
        fat=28,
        carbs=48,
        ingredients=["Куриное бедро 500г", "Лаваш 3шт", "Помидоры", "Огурцы", "Капуста", "Йогурт", "Чеснок"],
        steps=["Замаринуйте курицу", "Обжарьте", "Нарежьте овощи", "Заверните в лаваш"],
        tags=["восточная", "мясо", "быстрая"],
        difficulty="easy"
    ),
    Recipe(
        id="8",
        title="Тирамису",
        description="Нежный итальянский десерт с маскарпоне и кофе.",
        image="🍰",
        cook_time=40,
        servings=6,
        calories=420,
        protein=8,
        fat=28,
        carbs=36,
        ingredients=["Маскарпоне 500г", "Яйца 4шт", "Савоярди 200г", "Эспрессо", "Сахар", "Какао"],
        steps=["Сварите кофе", "Приготовьте крем", "Соберите слои", "Охладите 4 часа"],
        tags=["десерт", "итальянская", "без выпечки"],
        difficulty="medium"
    ),
]

# ============================================
# API Routes
# ============================================

@app.get("/")
def root():
    return {"message": "SwypeMeal API v1.0", "status": "running"}

@app.get("/api/recipes")
def get_recipes(
    user_id: str = "default",
    max_calories: Optional[int] = None,
    max_cook_time: Optional[int] = None,
    difficulty: Optional[str] = None,
    exclude_tags: Optional[str] = None,
):
    """Получить список рецептов с фильтрацией (включая одобренные пользовательские)"""
    state = load_user_state(user_id)
    custom = load_custom_recipes()
    recipes = RECIPES_DB + custom
    
    # Filter out already swiped
    recipes = [r for r in recipes if r.id not in state.swiped_ids]
    # Filter out in queue
    queue_ids = [q.recipe.id for q in state.queue]
    recipes = [r for r in recipes if r.id not in queue_ids]
    
    # Apply filters
    if max_calories:
        recipes = [r for r in recipes if r.calories <= max_calories]
    if max_cook_time:
        recipes = [r for r in recipes if r.cook_time <= max_cook_time]
    if difficulty:
        recipes = [r for r in recipes if r.difficulty == difficulty]
    if exclude_tags:
        tags = exclude_tags.split(",")
        recipes = [r for r in recipes if not any(t in r.tags for t in tags)]
    
    return {"recipes": recipes, "count": len(recipes)}

@app.get("/api/recipes/{recipe_id}")
def get_recipe(recipe_id: str):
    """Получить детали рецепта"""
    for recipe in RECIPES_DB:
        if recipe.id == recipe_id:
            return recipe
    raise HTTPException(status_code=404, detail="Recipe not found")

@app.get("/api/queue/{user_id}")
def get_queue(user_id: str):
    """Получить очередь готовки"""
    state = load_user_state(user_id)
    return {"queue": state.queue, "count": len(state.queue)}

@app.post("/api/queue/{user_id}")
def add_to_queue(user_id: str, recipe_id: str):
    """Добавить рецепт в очередь"""
    state = load_user_state(user_id)
    recipe = None
    for r in RECIPES_DB:
        if r.id == recipe_id:
            recipe = r
            break
    
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    # Check if already in queue
    if any(q.recipe.id == recipe_id for q in state.queue):
        raise HTTPException(status_code=400, detail="Already in queue")
    
    item = QueueItem(
        id=str(uuid.uuid4()),
        recipe=recipe,
        added_at=datetime.now().isoformat()
    )
    state.queue.append(item)
    save_user_state(state)
    
    return {"message": "Added to queue", "item": item}

@app.delete("/api/queue/{user_id}/{item_id}")
def remove_from_queue(user_id: str, item_id: str):
    """Удалить из очереди"""
    state = load_user_state(user_id)
    state.queue = [q for q in state.queue if q.id != item_id]
    save_user_state(state)
    return {"message": "Removed from queue"}

@app.post("/api/cook/{user_id}")
def mark_cooked(user_id: str, data: CookComplete):
    """Отметить блюдо как приготовленное"""
    state = load_user_state(user_id)
    
    # Find in queue
    item = None
    for q in state.queue:
        if q.id == data.queue_item_id:
            item = q
            break
    
    if not item:
        raise HTTPException(status_code=404, detail="Queue item not found")
    
    # Move to history
    history_item = HistoryItem(
        id=str(uuid.uuid4()),
        recipe=item.recipe,
        cooked_at=datetime.now().isoformat(),
        rating=data.rating,
        notes=data.notes
    )
    state.history.insert(0, history_item)
    state.queue = [q for q in state.queue if q.id != data.queue_item_id]
    save_user_state(state)
    
    return {"message": "Marked as cooked", "item": history_item}

@app.get("/api/history/{user_id}")
def get_history(user_id: str):
    """Получить историю приготовленных блюд"""
    state = load_user_state(user_id)
    return {"history": state.history, "count": len(state.history)}

@app.delete("/api/history/{user_id}/{item_id}")
def remove_from_history(user_id: str, item_id: str):
    """Удалить из истории"""
    state = load_user_state(user_id)
    state.history = [h for h in state.history if h.id != item_id]
    save_user_state(state)
    return {"message": "Removed from history"}

@app.post("/api/swipe/{user_id}")
def swipe(user_id: str, data: SwipeAction):
    """Записать действие свайпа"""
    state = load_user_state(user_id)
    
    if data.recipe_id not in state.swiped_ids:
        state.swiped_ids.append(data.recipe_id)
    
    if data.action == "like":
        # Also add to queue
        recipe = None
        for r in RECIPES_DB:
            if r.id == data.recipe_id:
                recipe = r
                break
        
        if recipe and not any(q.recipe.id == data.recipe_id for q in state.queue):
            item = QueueItem(
                id=str(uuid.uuid4()),
                recipe=recipe,
                added_at=datetime.now().isoformat()
            )
            state.queue.append(item)
    
    save_user_state(state)
    return {"message": f"Swiped {data.action}", "swiped_count": len(state.swiped_ids)}

@app.get("/api/preferences/{user_id}")
def get_preferences(user_id: str):
    """Получить настройки пользователя"""
    state = load_user_state(user_id)
    return state.preferences

@app.put("/api/preferences/{user_id}")
def update_preferences(user_id: str, prefs: UserPreferences):
    """Обновить настройки пользователя"""
    state = load_user_state(user_id)
    state.preferences = prefs
    save_user_state(state)
    return {"message": "Preferences updated", "preferences": prefs}

@app.post("/api/reset/{user_id}")
def reset_swipes(user_id: str):
    """Сбросить свайпы"""
    state = load_user_state(user_id)
    state.swiped_ids = []
    save_user_state(state)
    return {"message": "Swipes reset"}

@app.get("/api/stats/{user_id}")
def get_stats(user_id: str):
    """Получить статистику пользователя"""
    state = load_user_state(user_id)
    
    total_meals = len(state.history)
    total_calories = sum(h.recipe.calories for h in state.history)
    total_time = sum(h.recipe.cook_time for h in state.history)
    rated = [h for h in state.history if h.rating]
    avg_rating = sum(h.rating for h in rated) / len(rated) if rated else 0
    
    return {
        "total_meals": total_meals,
        "total_calories": total_calories,
        "total_cook_time": total_time,
        "average_rating": round(avg_rating, 1),
        "queue_size": len(state.queue),
        "swiped_count": len(state.swiped_ids),
    }

# ============================================
# Custom Recipes (User-submitted with moderation)
# ============================================

CUSTOM_RECIPES_FILE = os.path.join(DATA_DIR, "custom_recipes.json")
PENDING_RECIPES_FILE = os.path.join(DATA_DIR, "pending_recipes.json")

def load_custom_recipes() -> List[Recipe]:
    if os.path.exists(CUSTOM_RECIPES_FILE):
        with open(CUSTOM_RECIPES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return [Recipe(**r) for r in data]
    return []

def save_custom_recipes(recipes: List[Recipe]):
    with open(CUSTOM_RECIPES_FILE, "w", encoding="utf-8") as f:
        json.dump([r.model_dump() for r in recipes], f, ensure_ascii=False, indent=2)

def load_pending_recipes() -> List[Recipe]:
    if os.path.exists(PENDING_RECIPES_FILE):
        with open(PENDING_RECIPES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return [Recipe(**r) for r in data]
    return []

def save_pending_recipes(recipes: List[Recipe]):
    with open(PENDING_RECIPES_FILE, "w", encoding="utf-8") as f:
        json.dump([r.model_dump() for r in recipes], f, ensure_ascii=False, indent=2)

class NewRecipe(BaseModel):
    title: str
    description: str
    image: str
    cook_time: int
    servings: int
    calories: int
    protein: float
    fat: float
    carbs: float
    ingredients: List[str]
    steps: List[str]
    tags: List[str]
    difficulty: str
    author_id: Optional[str] = None

@app.post("/api/recipes/submit")
def submit_recipe(new_recipe: NewRecipe):
    """Отправить новый рецепт на модерацию"""
    pending = load_pending_recipes()
    
    recipe = Recipe(
        id=f"pending_{uuid.uuid4().hex[:8]}",
        title=new_recipe.title,
        description=new_recipe.description,
        image=new_recipe.image,
        cook_time=new_recipe.cook_time,
        servings=new_recipe.servings,
        calories=new_recipe.calories,
        protein=new_recipe.protein,
        fat=new_recipe.fat,
        carbs=new_recipe.carbs,
        ingredients=new_recipe.ingredients,
        steps=new_recipe.steps,
        tags=new_recipe.tags,
        difficulty=new_recipe.difficulty
    )
    
    pending.append(recipe)
    save_pending_recipes(pending)
    
    return {"message": "Recipe submitted for moderation", "recipe_id": recipe.id}

@app.get("/api/recipes/pending")
def get_pending_recipes():
    """Получить список рецептов на модерации (для модераторов)"""
    pending = load_pending_recipes()
    return {"recipes": pending, "count": len(pending)}

@app.post("/api/recipes/approve/{recipe_id}")
def approve_recipe(recipe_id: str):
    """Одобрить рецепт (модерация)"""
    pending = load_pending_recipes()
    custom = load_custom_recipes()
    
    recipe = None
    for r in pending:
        if r.id == recipe_id:
            recipe = r
            break
    
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found in pending")
    
    # Move to custom recipes with clean ID
    approved_recipe = Recipe(
        id=f"custom_{uuid.uuid4().hex[:8]}",
        **recipe.model_dump(exclude={"id"})
    )
    
    custom.append(approved_recipe)
    save_custom_recipes(custom)
    
    # Remove from pending
    pending = [r for r in pending if r.id != recipe_id]
    save_pending_recipes(pending)
    
    return {"message": "Recipe approved", "recipe": approved_recipe}

@app.delete("/api/recipes/pending/{recipe_id}")
def reject_recipe(recipe_id: str):
    """Отклонить рецепт (модерация)"""
    pending = load_pending_recipes()
    pending = [r for r in pending if r.id != recipe_id]
    save_pending_recipes(pending)
    return {"message": "Recipe rejected"}

@app.get("/api/recipes/custom")
def get_custom_recipes():
    """Получить одобренные пользовательские рецепты"""
    custom = load_custom_recipes()
    return {"recipes": custom, "count": len(custom)}

# ============================================
# Telegram Mini App Integration
# ============================================

@app.get("/api/telegram/init")
def telegram_init(user_id: str):
    """Инициализация для Telegram Mini App"""
    state = load_user_state(user_id)
    custom = load_custom_recipes()
    all_recipes = RECIPES_DB + custom
    
    return {
        "user_id": user_id,
        "queue_count": len(state.queue),
        "history_count": len(state.history),
        "available_recipes": len([r for r in all_recipes if r.id not in state.swiped_ids])
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
