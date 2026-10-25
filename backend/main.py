"""
SwypeMeal Backend — FastAPI сервер с поддержкой Supabase PostgreSQL
===================================================================
Автоматически использует PostgreSQL если DATABASE_URL настроен,
иначе fallback на file storage.

Переменные окружения:
    DATABASE_URL - PostgreSQL connection string (Supabase)
    USE_DATABASE - "true" для использования БД
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid
import json
import os

app = FastAPI(title="SwypeMeal API", version="2.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# Database setup
# ============================================

DATABASE_URL = os.getenv("DATABASE_URL")
USE_DATABASE = os.getenv("USE_DATABASE", "false").lower() == "true" and DATABASE_URL is not None

db_engine = None
SessionLocal = None

if USE_DATABASE:
    try:
        from sqlalchemy import create_engine, text
        from sqlalchemy.orm import sessionmaker, Session
        
        # Supabase requires SSL
        db_url = DATABASE_URL
        if "supabase" in db_url and "?sslmode=" not in db_url:
            db_url += "?sslmode=require"
        
        db_engine = create_engine(
            db_url,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            pool_timeout=30,
            pool_recycle=1800,
        )
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
        
        def get_db():
            db = SessionLocal()
            try:
                yield db
            finally:
                db.close()
        
        print(f"✓ Database connected: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'configured'}")
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        print("  Falling back to file storage")
        USE_DATABASE = False

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
        description="Классическая итальянская паста с беконом, яйцом и пармезаном. Быстро, сытно и невероятно вкусно.",
        image="🍝",
        cook_time=25,
        servings=2,
        calories=520,
        protein=22,
        fat=24,
        carbs=55,
        ingredients=["Спагетти 200г", "Бекон 150г", "Яйца 3шт", "Пармезан 80г", "Чёрный перец", "Соль"],
        steps=["Вскипятите воду, посолите, отварите пасту до al dente", "Нарежьте бекон кубиками, обжарьте до хрустящей корочки", "Смешайте яйца с тёртым пармезаном и перцем", "Слейте пасту, оставив стакан воды", "Добавьте пасту к бекону, снимите с огня", "Влейте яичную смесь, быстро перемешайте", "Подавайте с дополнительным пармезаном"],
        tags=["итальянская", "паста", "быстрая"],
        difficulty="easy"
    ),
    Recipe(
        id="2",
        title="Том Ям с креветками",
        description="Острый тайский суп с креветками, грибами и кокосовым молоком. Ароматный и согревающий.",
        image="🍜",
        cook_time=35,
        servings=4,
        calories=280,
        protein=18,
        fat=12,
        carbs=22,
        ingredients=["Креветки 400г", "Кокосовое молоко 400мл", "Грибы 200г", "Лемонграсс 2 стебля", "Галангал 30г", "Лайм 2шт", "Перец чили 2шт", "Рыбный соус 3 ст.л.", "Кинза"],
        steps=["Вскипятите 1л воды с лемонграссом и галангалом", "Добавьте грибы, варите 5 минут", "Положите креветки, варите 3 минуты", "Влейте кокосовое молоко", "Добавьте рыбный соус, сок лайма и чили", "Подавайте с кинзой и рисом"],
        tags=["тайская", "суп", "острая", "морепродукты"],
        difficulty="medium"
    ),
    Recipe(
        id="3",
        title="Боул с курицей и авокадо",
        description="Полезный боул с grilled курицей, авокадо, киноа и соусом тахини. Идеальный обед.",
        image="🥗",
        cook_time=30,
        servings=2,
        calories=450,
        protein=35,
        fat=20,
        carbs=38,
        ingredients=["Куриная грудка 300г", "Киноа 150г", "Авокадо 1шт", "Огурец 1шт", "Помидоры черри 200г", "Тахини 2 ст.л.", "Лимон", "Оливковое масло"],
        steps=["Отварите киноа согласно инструкции", "Замаринуйте курицу в специях, обжарьте до готовности", "Нарежьте авокадо, огурец и помидоры", "Приготовьте соус: тахини + лимонный сок + вода", "Соберите боул: киноа, овощи, курица, авокадо", "Полейте соусом тахини"],
        tags=["здоровая", "боул", "высокобелковая"],
        difficulty="easy"
    ),
    Recipe(
        id="4",
        title="Ризотто с грибами",
        description="Кремовое ризотто с белыми грибами и пармезаном. Изысканное блюдо для особого ужина.",
        image="🍚",
        cook_time=45,
        servings=3,
        calories=480,
        protein=14,
        fat=22,
        carbs=56,
        ingredients=["Рис арборио 300г", "Белые грибы 300г", "Лук 1шт", "Чеснок 3 зубчика", "Белое вино 150мл", "Бульон 1л", "Пармезан 100г", "Сливочное масло 50г"],
        steps=["Обжарьте грибы до золотистости, отложите", "В той же сковороде обжарьте лук и чеснок", "Добавьте рис, обжаривайте 2 минуты", "Влейте вино, дождитесь впитывания", "Добавляйте бульон по половнику, постоянно помешивая", "За 5 минут до готовности добавьте грибы", "Снимите с огня, вмешайте масло и пармезан"],
        tags=["итальянская", "рис", "вегетарианская"],
        difficulty="hard"
    ),
    Recipe(
        id="5",
        title="Тако с говядиной",
        description="Мексиканские тако с пряной говядиной, свежими овощами и гуакамоле.",
        image="🌮",
        cook_time=30,
        servings=4,
        calories=380,
        protein=28,
        fat=18,
        carbs=28,
        ingredients=["Говяжий фарш 500г", "Тортильи 8шт", "Авокадо 2шт", "Помидоры 3шт", "Лук 1шт", "Кинза", "Лайм 2шт", "Кумин", "Паприка", "Чили"],
        steps=["Обжарьте фарш с кумином, паприкой и чили", "Приготовьте гуакамоле: авокадо + лайм + кинза", "Нарежьте помидоры и лук", "Подогрейте тортильи", "Соберите тако: мясо, овощи, гуакамоле", "Подавайте с дольками лайма"],
        tags=["мексиканская", "мясо", "быстрая"],
        difficulty="easy"
    ),
    Recipe(
        id="6",
        title="Лосось терияки с рисом",
        description="Глазированный лосось в соусе терияки с жасминовым рисом и брокколи на пару.",
        image="🐟",
        cook_time=30,
        servings=2,
        calories=520,
        protein=38,
        fat=22,
        carbs=42,
        ingredients=["Филе лосося 2шт", "Рис жасминовый 200г", "Брокколи 300г", "Соевый соус 4 ст.л.", "Мёд 2 ст.л.", "Имбирь 20г", "Чеснок 2 зубчика", "Кунжут", "Зелёный лук"],
        steps=["Отварите рис", "Приготовьте соус: соевый соус + мёд + имбирь + чеснок", "Замаринуйте лосось в половине соуса на 10 минут", "Обжарьте лосось на сковороде по 4 минуты с каждой стороны", "Приготовьте брокколи на пару 5 минут", "Полейте лосось оставшимся соусом", "Подавайте с рисом, брокколи и кунжутом"],
        tags=["японская", "рыба", "здоровая"],
        difficulty="medium"
    ),
    Recipe(
        id="7",
        title="Шаурма домашняя",
        description="Сочная домашняя шаурма с маринованной курицей, свежими овощами и чесночным соусом.",
        image="🌯",
        cook_time=40,
        servings=3,
        calories=580,
        protein=32,
        fat=28,
        carbs=48,
        ingredients=["Куриное бедро 500г", "Лаваш 3шт", "Помидоры 2шт", "Огурцы 2шт", "Капуста 200г", "Йогурт 200г", "Чеснок 4 зубчика", "Паприка", "Кумин", "Куркума"],
        steps=["Замаринуйте курицу в специях и йогурте на 30 минут", "Обжарьте курицу до золотистой корочки", "Нарежьте овощи тонкой соломкой", "Приготовьте соус: йогурт + чеснок + соль", "Подогрейте лаваш", "Выложите курицу, овощи, полейте соусом", "Заверните и обжарьте на сухой сковороде"],
        tags=["восточная", "мясо", "быстрая"],
        difficulty="easy"
    ),
    Recipe(
        id="8",
        title="Тирамису",
        description="Нежный итальянский десерт с маскарпоне, кофе и какао. Тает во рту!",
        image="🍰",
        cook_time=40,
        servings=6,
        calories=420,
        protein=8,
        fat=28,
        carbs=36,
        ingredients=["Маскарпоне 500г", "Яйца 4шт", "Савоярди 200г", "Эспрессо 300мл", "Сахар 100г", "Какао-порошок", "Амаретто 2 ст.л."],
        steps=["Сварите крепкий эспрессо, остудите, добавьте амаретто", "Отделите белки от желтков", "Взбейте желтки с сахаром до белой массы", "Добавьте маскарпоне, перемешайте", "Взбейте белки до пиков, аккуратно вмешайте", "Обмакивайте савоярди в кофе, выкладывайте слоем", "Покройте кремом, повторите слои", "Охладите 4 часа, посыпьте какао перед подачей"],
        tags=["десерт", "итальянская", "без выпечки"],
        difficulty="medium"
    ),
    Recipe(
        id="9",
        title="Том Кха Гай",
        description="Кокосовый суп с курицей по-тайски с галангалом и листьями каффир-лайма.",
        image="🥥",
        cook_time=35,
        servings=4,
        calories=320,
        protein=24,
        fat=18,
        carbs=16,
        ingredients=["Куриное филе 400г", "Кокосовое молоко 600мл", "Галангал 40г", "Лемонграсс 3 стебля", "Грибы 200г", "Перец чили 3шт", "Рыбный соус 3 ст.л.", "Лайм 3шт", "Кинза"],
        steps=["Нарежьте галангал и лемонграсс", "Вскипятите кокосовое молоко с галангалом и лемонграссом", "Добавьте курицу, варите 10 минут", "Положите грибы и чили", "Приправьте рыбным соусом и соком лайма", "Подавайте с кинзой и рисом"],
        tags=["тайская", "суп", "курица"],
        difficulty="medium"
    ),
    Recipe(
        id="10",
        title="Панкейки с ягодами",
        description="Пышные американские панкейки со свежими ягодами и кленовым сиропом.",
        image="🥞",
        cook_time=20,
        servings=3,
        calories=380,
        protein=10,
        fat=14,
        carbs=54,
        ingredients=["Мука 250г", "Молоко 300мл", "Яйца 2шт", "Сахар 3 ст.л.", "Разрыхлитель 2 ч.л.", "Масло сливочное 30г", "Ягоды 200г", "Кленовый сироп", "Ваниль"],
        steps=["Смешайте муку, сахар и разрыхлитель", "Отдельно взбейте яйца с молоком и растопленным маслом", "Соедините сухие и жидкие ингредиенты", "Разогрейте сковороду на среднем огне", "Выливайте тесто порциями, жарьте до пузырьков", "Переверните, жарьте ещё 1-2 минуты", "Подавайте с ягодами и сиропом"],
        tags=["завтрак", "десерт", "быстрая"],
        difficulty="easy"
    ),
    Recipe(
        id="11",
        title="Карри с нутом",
        description="Ароматное индийское карри с нутом в томатном соусе со специями. Веганское и сытное.",
        image="🍛",
        cook_time=35,
        servings=4,
        calories=340,
        protein=16,
        fat=14,
        carbs=38,
        ingredients=["Нут (консервированный) 400г", "Томаты в собственном соку 400г", "Кокосовое молоко 200мл", "Лук 2шт", "Чеснок 4 зубчика", "Имбирь 30г", "Куркума", "Кумин", "Кориандр", "Гарам масала", "Шпинат 200г"],
        steps=["Обжарьте лук до золотистости", "Добавьте чеснок и имбирь, жарьте 1 минуту", "Всыпьте все специи, обжарьте 30 секунд", "Добавьте томаты, тушите 10 минут", "Влейте кокосовое молоко, добавьте нут", "Тушите 15 минут", "Добавьте шпинат, перемешайте до увядания", "Подавайте с рисом или нааном"],
        tags=["индийская", "веганская", "бобовые"],
        difficulty="easy"
    ),
    Recipe(
        id="12",
        title="Стейк рибай с овощами гриль",
        description="Идеально прожаренный стейк рибай с овощами на гриле и соусом чимичурри.",
        image="🥩",
        cook_time=25,
        servings=2,
        calories=650,
        protein=48,
        fat=42,
        carbs=12,
        ingredients=["Рибай стейк 2шт (300г каждый)", "Перец болгарский 2шт", "Цукини 2шт", "Оливковое масло", "Чеснок 4 зубчика", "Петрушка", "Орегано", "Уксус винный", "Соль", "Перец"],
        steps=["Достаньте стейк за 30 минут до готовки", "Приготовьте чимичурри: зелень + чеснок + масло + уксус", "Посолите и поперчите стейк", "Раскалите сковороду, обжарьте стейк 3-4 мин с каждой стороны", "Дайте стейку отдохнуть 5 минут", "Нарежьте овощи, обжарьте на гриле", "Подавайте стейк с овощами и чимичурри"],
        tags=["мясо", "гриль", "высокобелковая"],
        difficulty="hard"
    ),
]

# ============================================
# File-based storage (fallback)
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
# Database helpers
# ============================================

def db_get_user_state(user_id: str) -> dict:
    """Load user state from PostgreSQL"""
    from sqlalchemy import text
    
    state = {
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
    
    with SessionLocal() as db:
        # Ensure user exists
        db.execute(text(
            "INSERT INTO users (id) VALUES (:id) ON CONFLICT (id) DO NOTHING"
        ), {"id": user_id})
        db.commit()
        
        # Get queue
        result = db.execute(text("""
            SELECT qi.id, qi.added_at, qi.planned_date,
                   r.id as r_id, r.title, r.description, r.image, r.cook_time,
                   r.servings, r.calories, r.protein, r.fat, r.carbs,
                   r.ingredients, r.steps, r.tags, r.difficulty
            FROM queue_items qi
            JOIN recipes r ON qi.recipe_id = r.id
            WHERE qi.user_id = :user_id
            ORDER BY qi.position
        """), {"user_id": user_id})
        
        for row in result:
            state["queue"].append({
                "id": row[0],
                "added_at": row[1].isoformat() if row[1] else None,
                "planned_date": row[2].isoformat() if row[2] else None,
                "recipe": {
                    "id": row[3], "title": row[4], "description": row[5],
                    "image": row[6], "cook_time": row[7], "servings": row[8],
                    "calories": row[9], "protein": float(row[10]),
                    "fat": float(row[11]), "carbs": float(row[12]),
                    "ingredients": row[13] if isinstance(row[13], list) else json.loads(row[13]) if row[13] else [],
                    "steps": row[14] if isinstance(row[14], list) else json.loads(row[14]) if row[14] else [],
                    "tags": row[15] if isinstance(row[15], list) else json.loads(row[15]) if row[15] else [],
                    "difficulty": row[16]
                }
            })
        
        # Get history
        result = db.execute(text("""
            SELECT hi.id, hi.cooked_at, hi.rating, hi.notes,
                   r.id, r.title, r.description, r.image, r.cook_time,
                   r.servings, r.calories, r.protein, r.fat, r.carbs,
                   r.ingredients, r.steps, r.tags, r.difficulty
            FROM history_items hi
            JOIN recipes r ON hi.recipe_id = r.id
            WHERE hi.user_id = :user_id
            ORDER BY hi.cooked_at DESC
        """), {"user_id": user_id})
        
        for row in result:
            state["history"].append({
                "id": row[0],
                "cooked_at": row[1].isoformat() if row[1] else None,
                "rating": row[2],
                "notes": row[3],
                "recipe": {
                    "id": row[4], "title": row[5], "description": row[6],
                    "image": row[7], "cook_time": row[8], "servings": row[9],
                    "calories": row[10], "protein": float(row[11]),
                    "fat": float(row[12]), "carbs": float(row[13]),
                    "ingredients": row[14] if isinstance(row[14], list) else json.loads(row[14]) if row[14] else [],
                    "steps": row[15] if isinstance(row[15], list) else json.loads(row[15]) if row[15] else [],
                    "tags": row[16] if isinstance(row[16], list) else json.loads(row[16]) if row[16] else [],
                    "difficulty": row[17]
                }
            })
        
        # Get swiped
        result = db.execute(text(
            "SELECT recipe_id FROM swiped_recipes WHERE user_id = :user_id"
        ), {"user_id": user_id})
        state["swiped_ids"] = [row[0] for row in result]
        
        # Get preferences
        result = db.execute(text(
            "SELECT max_calories, max_cook_time, exclude_tags, preferred_difficulty FROM user_preferences WHERE user_id = :user_id"
        ), {"user_id": user_id})
        row = result.fetchone()
        if row:
            state["preferences"] = {
                "max_calories": row[0],
                "max_cook_time": row[1],
                "exclude_tags": row[2] if isinstance(row[2], list) else json.loads(row[2]) if row[2] else [],
                "preferred_difficulty": row[3] if isinstance(row[3], list) else json.loads(row[3]) if row[3] else ["easy", "medium", "hard"]
            }
    
    return state

def db_save_queue(user_id: str, queue: list):
    """Save queue to PostgreSQL"""
    from sqlalchemy import text
    
    with SessionLocal() as db:
        # Clear existing
        db.execute(text("DELETE FROM queue_items WHERE user_id = :user_id"), {"user_id": user_id})
        
        # Insert new
        for i, item in enumerate(queue):
            recipe = item["recipe"]
            # Ensure recipe exists
            db.execute(text("""
                INSERT INTO recipes (id, title, description, image, cook_time, servings, calories, protein, fat, carbs, ingredients, steps, tags, difficulty)
                VALUES (:id, :title, :description, :image, :cook_time, :servings, :calories, :protein, :fat, :carbs, :ingredients, :steps, :tags, :difficulty)
                ON CONFLICT (id) DO NOTHING
            """), {
                "id": recipe["id"], "title": recipe["title"], "description": recipe["description"],
                "image": recipe["image"], "cook_time": recipe["cook_time"], "servings": recipe["servings"],
                "calories": recipe["calories"], "protein": recipe["protein"], "fat": recipe["fat"],
                "carbs": recipe["carbs"], "ingredients": json.dumps(recipe["ingredients"]),
                "steps": json.dumps(recipe["steps"]), "tags": json.dumps(recipe["tags"]),
                "difficulty": recipe["difficulty"]
            })
            
            db.execute(text("""
                INSERT INTO queue_items (id, user_id, recipe_id, position, added_at)
                VALUES (:id, :user_id, :recipe_id, :position, :added_at)
            """), {
                "id": item["id"], "user_id": user_id, "recipe_id": recipe["id"],
                "position": i, "added_at": item.get("added_at")
            })
        
        db.commit()

def db_save_history(user_id: str, history: list):
    """Save history to PostgreSQL"""
    from sqlalchemy import text
    
    with SessionLocal() as db:
        db.execute(text("DELETE FROM history_items WHERE user_id = :user_id"), {"user_id": user_id})
        
        for item in history:
            recipe = item["recipe"]
            # Ensure recipe exists
            db.execute(text("""
                INSERT INTO recipes (id, title, description, image, cook_time, servings, calories, protein, fat, carbs, ingredients, steps, tags, difficulty)
                VALUES (:id, :title, :description, :image, :cook_time, :servings, :calories, :protein, :fat, :carbs, :ingredients, :steps, :tags, :difficulty)
                ON CONFLICT (id) DO NOTHING
            """), {
                "id": recipe["id"], "title": recipe["title"], "description": recipe["description"],
                "image": recipe["image"], "cook_time": recipe["cook_time"], "servings": recipe["servings"],
                "calories": recipe["calories"], "protein": recipe["protein"], "fat": recipe["fat"],
                "carbs": recipe["carbs"], "ingredients": json.dumps(recipe["ingredients"]),
                "steps": json.dumps(recipe["steps"]), "tags": json.dumps(recipe["tags"]),
                "difficulty": recipe["difficulty"]
            })
            
            db.execute(text("""
                INSERT INTO history_items (id, user_id, recipe_id, cooked_at, rating, notes)
                VALUES (:id, :user_id, :recipe_id, :cooked_at, :rating, :notes)
            """), {
                "id": item["id"], "user_id": user_id, "recipe_id": recipe["id"],
                "cooked_at": item.get("cooked_at"), "rating": item.get("rating"),
                "notes": item.get("notes")
            })
        
        db.commit()

def db_save_swiped(user_id: str, swiped_ids: list):
    """Save swiped recipes to PostgreSQL"""
    from sqlalchemy import text
    
    with SessionLocal() as db:
        db.execute(text("DELETE FROM swiped_recipes WHERE user_id = :user_id"), {"user_id": user_id})
        
        for recipe_id in swiped_ids:
            db.execute(text("""
                INSERT INTO swiped_recipes (id, user_id, recipe_id, action)
                VALUES (:id, :user_id, :recipe_id, 'dislike')
            """), {
                "id": str(uuid.uuid4()), "user_id": user_id, "recipe_id": recipe_id
            })
        
        db.commit()

def db_save_preferences(user_id: str, preferences: dict):
    """Save preferences to PostgreSQL"""
    from sqlalchemy import text
    
    with SessionLocal() as db:
        db.execute(text("""
            INSERT INTO user_preferences (id, user_id, max_calories, max_cook_time, exclude_tags, preferred_difficulty)
            VALUES (:id, :user_id, :max_calories, :max_cook_time, :exclude_tags, :preferred_difficulty)
            ON CONFLICT (user_id) DO UPDATE SET
                max_calories = EXCLUDED.max_calories,
                max_cook_time = EXCLUDED.max_cook_time,
                exclude_tags = EXCLUDED.exclude_tags,
                preferred_difficulty = EXCLUDED.preferred_difficulty
        """), {
            "id": str(uuid.uuid4()), "user_id": user_id,
            "max_calories": preferences.get("max_calories", 800),
            "max_cook_time": preferences.get("max_cook_time", 60),
            "exclude_tags": json.dumps(preferences.get("exclude_tags", [])),
            "preferred_difficulty": json.dumps(preferences.get("preferred_difficulty", ["easy", "medium", "hard"]))
        })
        db.commit()

# Unified state access
def get_state(user_id: str) -> dict:
    if USE_DATABASE:
        try:
            return db_get_user_state(user_id)
        except Exception as e:
            print(f"DB error, falling back to file: {e}")
    return load_user_state(user_id)

def save_state(user_id: str, state: dict):
    if USE_DATABASE:
        try:
            db_save_queue(user_id, state.get("queue", []))
            db_save_history(user_id, state.get("history", []))
            db_save_swiped(user_id, state.get("swiped_ids", []))
            db_save_preferences(user_id, state.get("preferences", {}))
            return
        except Exception as e:
            print(f"DB save error, falling back to file: {e}")
    save_user_state(user_id, state)

# ============================================
# API Routes
# ============================================

@app.get("/")
def root():
    storage_type = "PostgreSQL (Supabase)" if USE_DATABASE else "File Storage"
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
    state = get_state(user_id)
    recipes = RECIPES_DB.copy()
    
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

@app.get("/api/recipes/{recipe_id}")
def get_recipe(recipe_id: str):
    for recipe in RECIPES_DB:
        if recipe.id == recipe_id:
            return recipe
    raise HTTPException(status_code=404, detail="Recipe not found")

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
    
    item = {
        "id": str(uuid.uuid4()),
        "recipe": recipe.model_dump(),
        "added_at": datetime.now().isoformat()
    }
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
    
    history_item = {
        "id": str(uuid.uuid4()),
        "recipe": item["recipe"],
        "cooked_at": datetime.now().isoformat(),
        "rating": data.rating,
        "notes": data.notes
    }
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
            item = {
                "id": str(uuid.uuid4()),
                "recipe": recipe.model_dump(),
                "added_at": datetime.now().isoformat()
            }
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

@app.get("/api/stats/{user_id}")
def get_stats(user_id: str):
    state = get_state(user_id)
    
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
    return {"message": "Recipe submitted for moderation", "recipe_id": f"pending_{uuid.uuid4().hex[:8]}"}

@app.get("/api/recipes/custom")
def get_custom_recipes():
    return {"recipes": [], "count": 0}

@app.get("/api/telegram/init")
def telegram_init(user_id: str):
    state = get_state(user_id)
    return {
        "user_id": user_id,
        "queue_count": len(state["queue"]),
        "history_count": len(state["history"]),
        "available_recipes": len([r for r in RECIPES_DB if r.id not in state["swiped_ids"]])
    }

# Health check for DB connection
@app.get("/api/health")
def health_check():
    if USE_DATABASE:
        try:
            from sqlalchemy import text
            with SessionLocal() as db:
                result = db.execute(text("SELECT 1"))
                result.fetchone()
            return {"status": "healthy", "database": "connected"}
        except Exception as e:
            return {"status": "unhealthy", "database": str(e)}
    return {"status": "healthy", "database": "file_storage"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
