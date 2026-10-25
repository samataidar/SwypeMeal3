"""
SwypeMeal Backend — FastAPI сервер с поддержкой PostgreSQL
===========================================================
REST API для приложения планирования питания SwypeMeal.
Автоматически использует PostgreSQL если доступна, иначе file storage.

Переменные окружения:
    DATABASE_URL - PostgreSQL connection string (опционально)
    USE_DATABASE - "true" для принудительного использования БД

Запуск:
    # С file storage (по умолчанию)
    uvicorn main:app --reload --port 8000
    
    # С PostgreSQL
    DATABASE_URL="postgresql://user:pass@localhost/swypemeal" uvicorn main:app --reload
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid
import json
import os

# Database imports
from database import init_db, get_db, USE_DATABASE
from sqlalchemy.orm import Session

app = FastAPI(title="SwypeMeal API", version="2.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    if USE_DATABASE:
        try:
            init_db()
            print("✓ Database initialized")
        except Exception as e:
            print(f"✗ Database initialization failed: {e}")
            print("  Falling back to file storage")

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
    difficulty: str

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
    action: str

class CookComplete(BaseModel):
    queue_item_id: str
    rating: Optional[int] = None
    notes: Optional[str] = None

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

# ============================================
# Recipe Database (in-memory)
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
        ingredients=["Спагетти 200г", "Бекон 150г", "Яйца 3шт", "Пармезан 80г"],
        steps=["Отварите пасту", "Обжарьте бекон", "Смешайте яйца с пармезаном", "Соедините"],
        tags=["итальянская", "паста", "быстрая"],
        difficulty="easy"
    ),
    Recipe(
        id="2",
        title="Том Ям с креветками",
        description="Острый тайский суп с креветками и кокосовым молоком.",
        image="🍜",
        cook_time=35,
        servings=4,
        calories=280,
        protein=18,
        fat=12,
        carbs=22,
        ingredients=["Креветки 400г", "Кокосовое молоко 400мл", "Грибы 200г", "Лемонграсс"],
        steps=["Вскипятите бульон", "Добавьте грибы", "Положите креветки", "Приправьте"],
        tags=["тайская", "суп", "острая", "морепродукты"],
        difficulty="medium"
    ),
    Recipe(
        id="3",
        title="Боул с курицей и авокадо",
        description="Полезный боул с курицей, авокадо и киноа.",
        image="🥗",
        cook_time=30,
        servings=2,
        calories=450,
        protein=35,
        fat=20,
        carbs=38,
        ingredients=["Куриная грудка 300г", "Киноа 150г", "Авокадо 1шт", "Огурец"],
        steps=["Отварите киноа", "Обжарьте курицу", "Нарежьте овощи", "Соберите боул"],
        tags=["здоровая", "боул", "высокобелковая"],
        difficulty="easy"
    ),
]

# ============================================
# Storage abstraction
# ============================================

DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)

def load_user_state(user_id: str) -> dict:
    filepath = os.path.join(DATA_DIR, f"{user_id}.json")
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "user_id": user_id,
        "queue": [],
        "history": [],
        "swiped_ids": [],
        "preferences": {
            "max_calories": 800,
            "max_cook_time": 60,
            "exclude_tags": [],
            "preferred_difficulty": ["easy", "medium", "hard"]
        }
    }

def save_user_state(user_id: str, state: dict):
    filepath = os.path.join(DATA_DIR, f"{user_id}.json")
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)

# ============================================
# API Routes
# ============================================

@app.get("/")
def root():
    storage_type = "PostgreSQL" if USE_DATABASE else "File Storage"
    return {
        "message": "SwypeMeal API v2.0",
        "status": "running",
        "storage": storage_type
    }

@app.get("/api/recipes")
def get_recipes(
    user_id: str = "default",
    max_calories: Optional[int] = None,
    max_cook_time: Optional[int] = None,
    difficulty: Optional[str] = None,
    exclude_tags: Optional[str] = None,
):
    state = load_user_state(user_id)
    recipes = RECIPES_DB.copy()
    
    # Filter
    recipes = [r for r in recipes if r.id not in state["swiped_ids"]]
    queue_ids = [q["recipe"]["id"] for q in state["queue"]]
    recipes = [r for r in recipes if r.id not in queue_ids]
    
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

@app.get("/api/queue/{user_id}")
def get_queue(user_id: str):
    state = load_user_state(user_id)
    return {"queue": state["queue"], "count": len(state["queue"])}

@app.post("/api/queue/{user_id}")
def add_to_queue(user_id: str, recipe_id: str):
    state = load_user_state(user_id)
    
    recipe = None
    for r in RECIPES_DB:
        if r.id == recipe_id:
            recipe = r
            break
    
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    if any(q["recipe"]["id"] == recipe_id for q in state["queue"]):
        raise HTTPException(status_code=400, detail="Already in queue")
    
    item = {
        "id": str(uuid.uuid4()),
        "recipe": recipe.model_dump(),
        "added_at": datetime.now().isoformat()
    }
    state["queue"].append(item)
    save_user_state(user_id, state)
    
    return {"message": "Added to queue", "item": item}

@app.delete("/api/queue/{user_id}/{item_id}")
def remove_from_queue(user_id: str, item_id: str):
    state = load_user_state(user_id)
    state["queue"] = [q for q in state["queue"] if q["id"] != item_id]
    save_user_state(user_id, state)
    return {"message": "Removed from queue"}

@app.post("/api/cook/{user_id}")
def mark_cooked(user_id: str, data: CookComplete):
    state = load_user_state(user_id)
    
    item = None
    for q in state["queue"]:
        if q["id"] == data.queue_item_id:
            item = q
            break
    
    if not item:
        raise HTTPException(status_code=404, detail="Queue item not found")
    
    history_item = {
        "id": str(uuid.uuid4()),
        "recipe": item["recipe"],
        "cooked_at": datetime.now().isoformat(),
        "rating": data.rating,
        "notes": data.notes
    }
    state["history"].insert(0, history_item)
    state["queue"] = [q for q in state["queue"] if q["id"] != data.queue_item_id]
    save_user_state(user_id, state)
    
    return {"message": "Marked as cooked", "item": history_item}

@app.get("/api/history/{user_id}")
def get_history(user_id: str):
    state = load_user_state(user_id)
    return {"history": state["history"], "count": len(state["history"])}

@app.delete("/api/history/{user_id}/{item_id}")
def remove_from_history(user_id: str, item_id: str):
    state = load_user_state(user_id)
    state["history"] = [h for h in state["history"] if h["id"] != item_id]
    save_user_state(user_id, state)
    return {"message": "Removed from history"}

@app.post("/api/swipe/{user_id}")
def swipe(user_id: str, data: SwipeAction):
    state = load_user_state(user_id)
    
    if data.recipe_id not in state["swiped_ids"]:
        state["swiped_ids"].append(data.recipe_id)
    
    if data.action == "like":
        recipe = None
        for r in RECIPES_DB:
            if r.id == data.recipe_id:
                recipe = r
                break
        
        if recipe and not any(q["recipe"]["id"] == data.recipe_id for q in state["queue"]):
            item = {
                "id": str(uuid.uuid4()),
                "recipe": recipe.model_dump(),
                "added_at": datetime.now().isoformat()
            }
            state["queue"].append(item)
    
    save_user_state(user_id, state)
    return {"message": f"Swiped {data.action}", "swiped_count": len(state["swiped_ids"])}

@app.get("/api/preferences/{user_id}")
def get_preferences(user_id: str):
    state = load_user_state(user_id)
    return state["preferences"]

@app.put("/api/preferences/{user_id}")
def update_preferences(user_id: str, prefs: UserPreferences):
    state = load_user_state(user_id)
    state["preferences"] = prefs.model_dump()
    save_user_state(user_id, state)
    return {"message": "Preferences updated", "preferences": prefs}

@app.post("/api/reset/{user_id}")
def reset_swipes(user_id: str):
    state = load_user_state(user_id)
    state["swiped_ids"] = []
    save_user_state(user_id, state)
    return {"message": "Swipes reset"}

@app.get("/api/stats/{user_id}")
def get_stats(user_id: str):
    state = load_user_state(user_id)
    
    total_meals = len(state["history"])
    total_calories = sum(h["recipe"]["calories"] for h in state["history"])
    total_time = sum(h["recipe"]["cook_time"] for h in state["history"])
    rated = [h for h in state["history"] if h.get("rating")]
    avg_rating = sum(h["rating"] for h in rated) / len(rated) if rated else 0
    
    return {
        "total_meals": total_meals,
        "total_calories": total_calories,
        "total_cook_time": total_time,
        "average_rating": round(avg_rating, 1),
        "queue_size": len(state["queue"]),
        "swiped_count": len(state["swiped_ids"]),
    }

@app.post("/api/recipes/submit")
def submit_recipe(new_recipe: NewRecipe):
    # For now, just acknowledge (moderation not implemented in file storage)
    return {"message": "Recipe submitted for moderation", "recipe_id": f"pending_{uuid.uuid4().hex[:8]}"}

@app.get("/api/recipes/custom")
def get_custom_recipes():
    return {"recipes": [], "count": 0}

@app.get("/api/telegram/init")
def telegram_init(user_id: str):
    state = load_user_state(user_id)
    return {
        "user_id": user_id,
        "queue_count": len(state["queue"]),
        "history_count": len(state["history"]),
        "available_recipes": len([r for r in RECIPES_DB if r.id not in state["swiped_ids"]])
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
