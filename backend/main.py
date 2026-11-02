"""
SwypeMeal Backend - Supabase REST API Version
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import json
from datetime import datetime
import uuid
import httpx

app = FastAPI(title="SwypeMeal API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
USE_SUPABASE = os.getenv("USE_SUPABASE", "false").lower() == "true"

print(f"[DEBUG] SUPABASE_URL: {'SET' if SUPABASE_URL else 'NOT SET'}")
print(f"[DEBUG] SUPABASE_KEY: {'SET' if SUPABASE_KEY else 'NOT SET'}")
print(f"[DEBUG] USE_SUPABASE: {USE_SUPABASE}")

class SupabaseClient:
    def __init__(self, url: str, key: str):
        self.url = url.rstrip("/")
        self.rest_url = f"{self.url}/rest/v1"
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
    
    def _request(self, method: str, path: str, **kwargs) -> dict:
        url = f"{self.rest_url}{path}"
        with httpx.Client(timeout=10.0) as client:
            response = client.request(method, url, headers=self.headers, **kwargs)
            if response.status_code >= 400:
                raise Exception(f"Supabase error {response.status_code}: {response.text}")
            if response.text:
                return response.json()
            return {}
    
    def select(self, table: str, query: str = "*", filters: dict = None, order: str = None, limit: int = None) -> list:
        params = {"select": query}
        if filters:
            for key, value in filters.items():
                params[key] = f"eq.{value}"
        if order:
            params["order"] = order
        if limit:
            params["limit"] = str(limit)
        result = self._request("GET", f"/{table}", params=params)
        return result if isinstance(result, list) else []
    
    def insert(self, table: str, data: dict) -> dict:
        return self._request("POST", f"/{table}", json=data)
    
    def upsert(self, table: str, data: dict, on_conflict: str = None) -> dict:
        headers = {**self.headers, "Prefer": "return=representation,resolution=merge-duplicates"}
        params = {}
        if on_conflict:
            params["on_conflict"] = on_conflict
        url = f"{self.rest_url}/{table}"
        with httpx.Client(timeout=10.0) as client:
            response = client.post(url, headers=headers, params=params, json=data)
            if response.status_code >= 400:
                raise Exception(f"Supabase error {response.status_code}: {response.text}")
            if response.text:
                return response.json()
            return {}
    
    def delete(self, table: str, filters: dict) -> None:
        params = {}
        for key, value in filters.items():
            params[key] = f"eq.{value}"
        self._request("DELETE", f"/{table}", params=params)
    
    def test_connection(self) -> bool:
        try:
            self.select("recipes", limit=1)
            return True
        except Exception as e:
            print(f"Connection test failed: {e}")
            return False

supabase = None

if USE_SUPABASE and SUPABASE_URL and SUPABASE_KEY:
    try:
        print(f"[DEBUG] Connecting to Supabase via REST API...")
        supabase = SupabaseClient(SUPABASE_URL, SUPABASE_KEY)
        if supabase.test_connection():
            print(f"✓ Supabase connected successfully via REST API")
        else:
            print(f"✗ Supabase connection test failed")
            USE_SUPABASE = False
            supabase = None
    except Exception as e:
        print(f"✗ Supabase connection failed: {e}")
        USE_SUPABASE = False
        supabase = None
else:
    print("⚠ Supabase mode disabled, using file storage")

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

def get_recipe_by_id(recipe_id: str) -> Optional[dict]:
    for r in RECIPES_DB:
        if r.id == recipe_id:
            return r.model_dump()
    try:
        if supabase:
            result = supabase.select("recipes", filters={"id": recipe_id})
            if result:
                return result[0]
    except Exception:
        pass
    return None

def ensure_user_exists(user_id: str):
    try:
        if supabase:
            existing = supabase.select("users", filters={"id": user_id})
            if not existing:
                supabase.insert("users", {"id": user_id})
    except Exception as e:
        print(f"Warning: Could not ensure user exists: {e}")

def ensure_recipe_exists(recipe: dict):
    try:
        if supabase:
            existing = supabase.select("recipes", filters={"id": recipe["id"]})
            if not existing:
                supabase.insert("recipes", {
                    "id": recipe["id"],
                    "title": recipe["title"],
                    "description": recipe["description"],
                    "image": recipe["image"],
                    "cook_time": recipe["cook_time"],
                    "servings": recipe["servings"],
                    "calories": recipe["calories"],
                    "protein": recipe["protein"],
                    "fat": recipe["fat"],
                    "carbs": recipe["carbs"],
                    "ingredients": recipe["ingredients"],
                    "steps": recipe["steps"],
                    "tags": recipe["tags"],
                    "difficulty": recipe["difficulty"],
                    "is_custom": False,
                    "status": "approved"
                })
    except Exception as e:
        print(f"Warning: Could not ensure recipe exists: {e}")

def supabase_get_user_state(user_id: str) -> dict:
    try:
        queue_data = supabase.select("queue_items", filters={"user_id": user_id}, order="position.asc")
        queue = []
        for item in queue_data:
            recipe_id = item.get("recipe_id")
            recipe = get_recipe_by_id(recipe_id)
            if recipe:
                queue.append({
                    "id": item["id"],
                    "recipe": recipe,
                    "added_at": item.get("added_at"),
                    "planned_date": item.get("planned_date")
                })
        
        history_data = supabase.select("history_items", filters={"user_id": user_id}, order="cooked_at.desc")
        history = []
        for item in history_data:
            recipe_id = item.get("recipe_id")
            recipe = get_recipe_by_id(recipe_id)
            if recipe:
                history.append({
                    "id": item["id"],
                    "recipe": recipe,
                    "cooked_at": item.get("cooked_at"),
                    "rating": item.get("rating"),
                    "notes": item.get("notes")
                })
        
        swiped_data = supabase.select("swiped_recipes", query="recipe_id", filters={"user_id": user_id})
        swiped_ids = [item["recipe_id"] for item in swiped_data]
        
        prefs_data = supabase.select("user_preferences", filters={"user_id": user_id})
        preferences = {
            "max_calories": 800,
            "max_cook_time": 60,
            "exclude_tags": [],
            "preferred_difficulty": ["easy", "medium", "hard"]
        }
        if prefs_data:
            pref = prefs_data[0]
            preferences = {
                "max_calories": pref.get("max_calories", 800),
                "max_cook_time": pref.get("max_cook_time", 60),
                "exclude_tags": pref.get("exclude_tags", []),
                "preferred_difficulty": pref.get("preferred_difficulty", ["easy", "medium", "hard"])
            }
        
        return {
            "user_id": user_id,
            "queue": queue,
            "history": history,
            "swiped_ids": swiped_ids,
            "preferences": preferences
        }
    except Exception as e:
        print(f"Error loading from Supabase: {e}")
        return load_user_state(user_id)

def supabase_save_state(user_id: str, state: dict):
    try:
        ensure_user_exists(user_id)
        
        supabase.delete("queue_items", {"user_id": user_id})
        for i, item in enumerate(state.get("queue", [])):
            recipe = item["recipe"]
            ensure_recipe_exists(recipe)
            supabase.upsert("queue_items", {
                "id": item["id"],
                "user_id": user_id,
                "recipe_id": recipe["id"],
                "position": i,
                "added_at": item.get("added_at")
            }, on_conflict="id")
        
        supabase.delete("history_items", {"user_id": user_id})
        for item in state.get("history", []):
            recipe = item["recipe"]
            ensure_recipe_exists(recipe)
            supabase.upsert("history_items", {
                "id": item["id"],
                "user_id": user_id,
                "recipe_id": recipe["id"],
                "cooked_at": item.get("cooked_at"),
                "rating": item.get("rating"),
                "notes": item.get("notes")
            }, on_conflict="id")
        
        supabase.delete("swiped_recipes", {"user_id": user_id})
        for recipe_id in state.get("swiped_ids", []):
            supabase.upsert("swiped_recipes", {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "recipe_id": recipe_id,
                "action": "dislike"
            }, on_conflict="id")
        
        supabase.delete("user_preferences", {"user_id": user_id})
        prefs = state.get("preferences", {})
        supabase.upsert("user_preferences", {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "max_calories": prefs.get("max_calories", 800),
            "max_cook_time": prefs.get("max_cook_time", 60),
            "exclude_tags": prefs.get("exclude_tags", []),
            "preferred_difficulty": prefs.get("preferred_difficulty", ["easy", "medium", "hard"])
        }, on_conflict="user_id")
        
    except Exception as e:
        print(f"Error saving to Supabase: {e}")

def get_state(user_id: str) -> dict:
    if USE_SUPABASE and supabase:
        try:
            return supabase_get_user_state(user_id)
        except Exception as e:
            print(f"Supabase error, falling back to file: {e}")
    return load_user_state(user_id)

def save_state(user_id: str, state: dict):
    if USE_SUPABASE and supabase:
        try:
            supabase_save_state(user_id, state)
            return
        except Exception as e:
            print(f"Supabase save error, falling back to file: {e}")
    save_user_state(user_id, state)

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

class ModerationAction(BaseModel):
    moderator_id: str
    comment: Optional[str] = None

RECIPES_DB: List[Recipe] = [
    Recipe(id="1", title="Паста Карбонара", description="Классическая итальянская паста с беконом, яйцом и пармезаном.", image="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Spaghetti_alla_Carbonara.jpg/800px-Spaghetti_alla_Carbonara.jpg", cook_time=25, servings=2, calories=520, protein=22, fat=24, carbs=55, ingredients=["Спагетти 200г", "Бекон 150г", "Яйца 3шт", "Пармезан 80г"], steps=["Отварите пасту", "Обжарьте бекон", "Смешайте яйца с пармезаном", "Соедините"], tags=["итальянская", "паста", "быстрая"], difficulty="easy"),
    Recipe(id="2", title="Том Ям с креветками", description="Острый тайский суп с креветками и кокосовым молоком.", image="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Tom_yam_kung_maenam_khlong.jpg/800px-Tom_yam_kung_maenam_khlong.jpg", cook_time=35, servings=4, calories=280, protein=18, fat=12, carbs=22, ingredients=["Креветки 400г", "Кокосовое молоко 400мл", "Грибы 200г", "Лемонграсс"], steps=["Вскипятите бульон", "Добавьте грибы", "Положите креветки", "Приправьте"], tags=["тайская", "суп", "острая", "морепродукты"], difficulty="medium"),
    Recipe(id="3", title="Боул с курицей и авокадо", description="Полезный боул с курицей, авокадо и киноа.", image="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Buddha_Bowl_%2842209587810%29.jpg/800px-Buddha_Bowl_%2842209587810%29.jpg", cook_time=30, servings=2, calories=450, protein=35, fat=20, carbs=38, ingredients=["Куриная грудка 300г", "Киноа 150г", "Авокадо 1шт", "Огурец"], steps=["Отварите киноа", "Обжарьте курицу", "Нарежьте овощи", "Соберите боул"], tags=["здоровая", "боул", "высокобелковая"], difficulty="easy"),
    Recipe(id="4", title="Ризотто с грибами", description="Кремовое ризотто с белыми грибами и пармезаном.", image="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Risotto_with_speck_and_goat_cheese.jpg/800px-Risotto_with_speck_and_goat_cheese.jpg", cook_time=45, servings=3, calories=480, protein=14, fat=22, carbs=56, ingredients=["Рис арборио 300г", "Белые грибы 300г", "Лук", "Белое вино", "Бульон", "Пармезан"], steps=["Обжарьте грибы", "Обжарьте рис", "Добавляйте бульон", "Вмешайте пармезан"], tags=["итальянская", "рис", "вегетарианская"], difficulty="hard"),
    Recipe(id="5", title="Тако с говядиной", description="Мексиканские тако с пряной говядиной.", image="https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Taco_with_beef.jpg/800px-Taco_with_beef.jpg", cook_time=30, servings=4, calories=380, protein=28, fat=18, carbs=28, ingredients=["Говяжий фарш 500г", "Тортильи 8шт", "Авокадо 2шт", "Помидоры"], steps=["Обжарьте фарш", "Приготовьте гуакамоле", "Соберите тако"], tags=["мексиканская", "мясо", "быстрая"], difficulty="easy"),
    Recipe(id="6", title="Лосось терияки", description="Глазированный лосось в соусе терияки.", image="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Teriyaki_salmon.jpg/800px-Teriyaki_salmon.jpg", cook_time=30, servings=2, calories=520, protein=38, fat=22, carbs=42, ingredients=["Филе лосося 2шт", "Рис 200г", "Брокколи 300г", "Соевый соус"], steps=["Отварите рис", "Замаринуйте лосось", "Обжарьте лосось"], tags=["японская", "рыба", "здоровая"], difficulty="medium"),
    Recipe(id="7", title="Шаурма домашняя", description="Сочная домашняя шаурма с курицей.", image="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Doner_kebab.jpg/800px-Doner_kebab.jpg", cook_time=40, servings=3, calories=580, protein=32, fat=28, carbs=48, ingredients=["Куриное бедро 500г", "Лаваш 3шт", "Помидоры", "Огурцы", "Капуста"], steps=["Замаринуйте курицу", "Обжарьте", "Нарежьте овощи", "Заверните"], tags=["восточная", "мясо", "быстрая"], difficulty="easy"),
    Recipe(id="8", title="Тирамису", description="Нежный итальянский десерт.", image="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Tiramisu_Francesco_Sposito.jpg/800px-Tiramisu_Francesco_Sposito.jpg", cook_time=40, servings=6, calories=420, protein=8, fat=28, carbs=36, ingredients=["Маскарпоне 500г", "Яйца 4шт", "Савоярди 200г", "Эспрессо"], steps=["Сварите кофе", "Приготовьте крем", "Соберите слои"], tags=["десерт", "итальянская", "без выпечки"], difficulty="medium"),
    Recipe(id="9", title="Том Кха Гай", description="Кокосовый суп с курицей.", image="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Tom_kha_gai.jpg/800px-Tom_kha_gai.jpg", cook_time=35, servings=4, calories=320, protein=24, fat=18, carbs=16, ingredients=["Куриное филе 400г", "Кокосовое молоко 600мл", "Галангал", "Лемонграсс"], steps=["Вскипятите молоко", "Добавьте курицу", "Добавьте специи"], tags=["тайская", "суп", "курица"], difficulty="medium"),
    Recipe(id="10", title="Панкейки с ягодами", description="Пышные панкейки со свежими ягодами.", image="https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Pancakes_with_blueberries.jpg/800px-Pancakes_with_blueberries.jpg", cook_time=20, servings=3, calories=380, protein=10, fat=14, carbs=54, ingredients=["Мука 250г", "Молоко 300мл", "Яйца 2шт", "Ягоды 200г"], steps=["Смешайте ингредиенты", "Жарьте на сковороде", "Подавайте с ягодами"], tags=["завтрак", "десерт", "быстрая"], difficulty="easy"),
    Recipe(id="11", title="Карри с нутом", description="Ароматное индийское карри.", image="https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Chickpea_curry.jpg/800px-Chickpea_curry.jpg", cook_time=35, servings=4, calories=340, protein=16, fat=14, carbs=38, ingredients=["Нут 400г", "Томаты 400г", "Кокосовое молоко 200мл", "Специи"], steps=["Обжарьте специи", "Добавьте томаты", "Добавьте нут"], tags=["индийская", "веганская", "бобовые"], difficulty="easy"),
    Recipe(id="12", title="Стейк рибай", description="Идеально прожаренный стейк.", image="https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Grilled_Rib_Eye_Steak.jpg/800px-Grilled_Rib_Eye_Steak.jpg", cook_time=25, servings=2, calories=650, protein=48, fat=42, carbs=12, ingredients=["Рибай стейк 2шт", "Перец болгарский 2шт", "Оливковое масло"], steps=["Подготовьте стейк", "Обжарьте", "Подавайте"], tags=["мясо", "гриль", "высокобелковая"], difficulty="hard"),
]

@app.get("/")
def root():
    storage_type = "Supabase REST API" if USE_SUPABASE else "File Storage"
    return {"message": "SwypeMeal API v2.0", "status": "running", "storage": storage_type}

@app.get("/api/recipes/custom")
def get_custom_recipes():
    if USE_SUPABASE and supabase:
        try:
            custom = supabase.select("recipes", filters={"is_custom": True, "status": "approved"})
            return {"recipes": custom, "count": len(custom)}
        except Exception as e:
            print(f"Error: {e}")
    return {"recipes": [], "count": 0}

@app.get("/api/recipes/pending")
def get_pending_recipes():
    print(f"[DEBUG] get_pending_recipes called, USE_SUPABASE={USE_SUPABASE}, supabase={supabase is not None}")
    if USE_SUPABASE and supabase:
        try:
            result = supabase.select("pending_recipes", filters={"status": "pending"}, order="created_at.asc")
            print(f"[DEBUG] Found {len(result)} pending recipes")
            return {"recipes": result, "count": len(result)}
        except Exception as e:
            print(f"[ERROR] Error getting pending recipes: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    print("[DEBUG] Supabase not available, returning empty list")
    return {"recipes": [], "count": 0}

@app.get("/api/recipes/{recipe_id}")
def get_recipe(recipe_id: str):
    for recipe in RECIPES_DB:
        if recipe.id == recipe_id:
            return recipe
    raise HTTPException(status_code=404, detail="Recipe not found")

@app.get("/api/recipes")
def get_recipes(
    user_id: str = "default",
    max_calories: Optional[int] = None,
    max_cook_time: Optional[int] = None,
    difficulty: Optional[str] = None,
    exclude_tags: Optional[str] = None,
):
    state = get_state(user_id)
    recipes = RECIPES_DB.copy()
    
    if USE_SUPABASE and supabase:
        try:
            custom_recipes = supabase.select("recipes", filters={"status": "approved"})
            for cr in custom_recipes:
                if not any(r.id == cr["id"] for r in recipes):
                    recipes.append(Recipe(**cr))
        except Exception as e:
            print(f"[ERROR] Failed to load custom recipes: {e}")
    
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
    state = get_state(user_id)
    return {"queue": state["queue"], "count": len(state["queue"])}

@app.post("/api/queue/{user_id}")
def add_to_queue(user_id: str, recipe_id: str):
    state = get_state(user_id)
    recipe = None
    for r in RECIPES_DB:
        if r.id == recipe_id:
            recipe = r
            break
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    if any(q["recipe"]["id"] == recipe_id for q in state["queue"]):
        raise HTTPException(status_code=400, detail="Already in queue")
    item = {"id": str(uuid.uuid4()), "recipe": recipe.model_dump(), "added_at": datetime.now().isoformat()}
    state["queue"].append(item)
    save_state(user_id, state)
    return {"message": "Added to queue", "item": item}

@app.delete("/api/queue/{user_id}/{item_id}")
def remove_from_queue(user_id: str, item_id: str):
    state = get_state(user_id)
    state["queue"] = [q for q in state["queue"] if q["id"] != item_id]
    save_state(user_id, state)
    return {"message": "Removed from queue"}

@app.post("/api/cook/{user_id}")
def mark_cooked(user_id: str, data: CookComplete):
    state = get_state(user_id)
    item = None
    for q in state["queue"]:
        if q["id"] == data.queue_item_id:
            item = q
            break
    if not item:
        raise HTTPException(status_code=404, detail="Queue item not found")
    history_item = {"id": str(uuid.uuid4()), "recipe": item["recipe"], "cooked_at": datetime.now().isoformat(), "rating": data.rating, "notes": data.notes}
    state["history"].insert(0, history_item)
    state["queue"] = [q for q in state["queue"] if q["id"] != data.queue_item_id]
    save_state(user_id, state)
    return {"message": "Marked as cooked", "item": history_item}

@app.get("/api/history/{user_id}")
def get_history(user_id: str):
    state = get_state(user_id)
    return {"history": state["history"], "count": len(state["history"])}

@app.delete("/api/history/{user_id}/{item_id}")
def remove_from_history(user_id: str, item_id: str):
    state = get_state(user_id)
    state["history"] = [h for h in state["history"] if h["id"] != item_id]
    save_state(user_id, state)
    return {"message": "Removed from history"}

@app.post("/api/swipe/{user_id}")
def swipe(user_id: str, data: SwipeAction):
    state = get_state(user_id)
    if data.recipe_id not in state["swiped_ids"]:
        state["swiped_ids"].append(data.recipe_id)
    if data.action == "like":
        recipe = None
        for r in RECIPES_DB:
            if r.id == data.recipe_id:
                recipe = r
                break
        if recipe and not any(q["recipe"]["id"] == data.recipe_id for q in state["queue"]):
            item = {"id": str(uuid.uuid4()), "recipe": recipe.model_dump(), "added_at": datetime.now().isoformat()}
            state["queue"].append(item)
    save_state(user_id, state)
    return {"message": f"Swiped {data.action}", "swiped_count": len(state["swiped_ids"])}

@app.get("/api/preferences/{user_id}")
def get_preferences(user_id: str):
    state = get_state(user_id)
    return state["preferences"]

@app.put("/api/preferences/{user_id}")
def update_preferences(user_id: str, prefs: UserPreferences):
    state = get_state(user_id)
    state["preferences"] = prefs.model_dump()
    save_state(user_id, state)
    return {"message": "Preferences updated", "preferences": prefs}

@app.post("/api/reset/{user_id}")
def reset_swipes(user_id: str):
    state = get_state(user_id)
    state["swiped_ids"] = []
    save_state(user_id, state)
    return {"message": "Swipes reset"}

@app.get("/api/user/role/{user_id}")
def get_user_role(user_id: str):
    if USE_SUPABASE and supabase:
        try:
            result = supabase.select("user_roles", filters={"user_id": user_id})
            if result:
                return {"role": result[0].get("role", "user")}
            return {"role": "user"}
        except Exception as e:
            print(f"Error getting user role: {e}")
    return {"role": "user"}

@app.post("/api/recipes/submit")
def submit_recipe(new_recipe: NewRecipe):
    if USE_SUPABASE and supabase:
        try:
            recipe_data = {
                "author_id": new_recipe.author_id or "anonymous",
                "title": new_recipe.title,
                "description": new_recipe.description,
                "image": new_recipe.image,
                "cook_time": new_recipe.cook_time,
                "servings": new_recipe.servings,
                "calories": new_recipe.calories,
                "protein": new_recipe.protein,
                "fat": new_recipe.fat,
                "carbs": new_recipe.carbs,
                "ingredients": new_recipe.ingredients,
                "steps": new_recipe.steps,
                "tags": new_recipe.tags,
                "difficulty": new_recipe.difficulty
            }
            result = supabase.insert("pending_recipes", recipe_data)
            return {"message": "Recipe submitted for moderation", "recipe_id": result[0]["id"] if result else None}
        except Exception as e:
            print(f"Error submitting recipe: {e}")
    return {"message": "Recipe submitted for moderation", "recipe_id": f"pending_{uuid.uuid4().hex[:8]}"}

@app.post("/api/recipes/{recipe_id}/approve")
def approve_recipe(recipe_id: str, action: ModerationAction):
    if USE_SUPABASE and supabase:
        try:
            pending = supabase.select("pending_recipes", filters={"id": recipe_id})
            if not pending:
                raise HTTPException(status_code=404, detail="Recipe not found")
            recipe_data = pending[0]
            new_recipe = {
                "id": str(uuid.uuid4()),
                "title": recipe_data["title"],
                "description": recipe_data["description"],
                "image": recipe_data["image"],
                "cook_time": recipe_data["cook_time"],
                "servings": recipe_data["servings"],
                "calories": recipe_data["calories"],
                "protein": recipe_data["protein"],
                "fat": recipe_data["fat"],
                "carbs": recipe_data["carbs"],
                "ingredients": recipe_data["ingredients"],
                "steps": recipe_data["steps"],
                "tags": recipe_data["tags"],
                "difficulty": recipe_data["difficulty"],
                "is_custom": True,
                "author_id": recipe_data["author_id"],
                "status": "approved"
            }
            supabase.insert("recipes", new_recipe)
            supabase._request("PATCH", f"/pending_recipes?id=eq.{recipe_id}", json={
                "status": "approved",
                "moderator_id": action.moderator_id,
                "moderator_comment": action.comment,
                "reviewed_at": datetime.now().isoformat()
            })
            return {"message": "Recipe approved"}
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error approving recipe: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    raise HTTPException(status_code=500, detail="Database not configured")

@app.post("/api/recipes/{recipe_id}/reject")
def reject_recipe(recipe_id: str, action: ModerationAction):
    if USE_SUPABASE and supabase:
        try:
            supabase._request("PATCH", f"/pending_recipes?id=eq.{recipe_id}", json={
                "status": "rejected",
                "moderator_id": action.moderator_id,
                "moderator_comment": action.comment,
                "reviewed_at": datetime.now().isoformat()
            })
            return {"message": "Recipe rejected"}
        except Exception as e:
            print(f"Error rejecting recipe: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    raise HTTPException(status_code=500, detail="Database not configured")

@app.get("/api/health")
def health_check():
    if USE_SUPABASE and supabase:
        try:
            supabase.test_connection()
            return {"status": "healthy", "database": "connected"}
        except Exception as e:
            return {"status": "unhealthy", "database": str(e)}
    return {"status": "healthy", "database": "file_storage"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
