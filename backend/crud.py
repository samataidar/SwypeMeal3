"""
CRUD operations for SwypeMeal Backend
Абстракция над БД с fallback на file storage
"""

import os
import json
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from models import User, Recipe as RecipeModel, QueueItem as QueueItemModel, HistoryItem as HistoryItemModel, SwipedRecipe, UserPreferences
from pydantic import BaseModel

# Check if database is available
USE_DATABASE = os.getenv("USE_DATABASE", "false").lower() == "true"

# ============================================
# File-based storage (fallback)
# ============================================

DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)

def load_user_state_file(user_id: str) -> dict:
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

def save_user_state_file(user_id: str, state: dict):
    filepath = os.path.join(DATA_DIR, f"{user_id}.json")
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)

# ============================================
# Database operations
# ============================================

def get_or_create_user(db: Session, user_id: str) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        user = User(id=user_id)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

def get_queue_db(db: Session, user_id: str) -> List[QueueItemModel]:
    return db.query(QueueItemModel).filter(
        QueueItemModel.user_id == user_id
    ).order_by(QueueItemModel.position).all()

def add_to_queue_db(db: Session, user_id: str, recipe_id: str) -> QueueItemModel:
    # Get max position
    max_pos = db.query(QueueItemModel).filter(
        QueueItemModel.user_id == user_id
    ).count()
    
    item = QueueItemModel(
        id=str(uuid.uuid4()),
        user_id=user_id,
        recipe_id=recipe_id,
        position=max_pos
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

def remove_from_queue_db(db: Session, user_id: str, item_id: str):
    item = db.query(QueueItemModel).filter(
        QueueItemModel.id == item_id,
        QueueItemModel.user_id == user_id
    ).first()
    if item:
        db.delete(item)
        db.commit()

def get_history_db(db: Session, user_id: str) -> List[HistoryItemModel]:
    return db.query(HistoryItemModel).filter(
        HistoryItemModel.user_id == user_id
    ).order_by(HistoryItemModel.cooked_at.desc()).all()

def add_to_history_db(
    db: Session, 
    user_id: str, 
    recipe_id: str, 
    rating: Optional[int] = None,
    notes: Optional[str] = None
) -> HistoryItemModel:
    item = HistoryItemModel(
        id=str(uuid.uuid4()),
        user_id=user_id,
        recipe_id=recipe_id,
        rating=rating,
        notes=notes
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

def mark_swiped_db(db: Session, user_id: str, recipe_id: str, action: str):
    swiped = SwipedRecipe(
        id=str(uuid.uuid4()),
        user_id=user_id,
        recipe_id=recipe_id,
        action=action
    )
    db.add(swiped)
    db.commit()

def get_swiped_ids_db(db: Session, user_id: str) -> List[str]:
    swiped = db.query(SwipedRecipe).filter(
        SwipedRecipe.user_id == user_id
    ).all()
    return [s.recipe_id for s in swiped]

def reset_swipes_db(db: Session, user_id: str):
    db.query(SwipedRecipe).filter(
        SwipedRecipe.user_id == user_id
    ).delete()
    db.commit()

def get_preferences_db(db: Session, user_id: str) -> dict:
    prefs = db.query(UserPreferences).filter(
        UserPreferences.user_id == user_id
    ).first()
    
    if not prefs:
        return {
            "max_calories": 800,
            "max_cook_time": 60,
            "exclude_tags": [],
            "preferred_difficulty": ["easy", "medium", "hard"]
        }
    
    return {
        "max_calories": prefs.max_calories,
        "max_cook_time": prefs.max_cook_time,
        "exclude_tags": prefs.exclude_tags,
        "preferred_difficulty": prefs.preferred_difficulty
    }

def update_preferences_db(db: Session, user_id: str, prefs: dict):
    existing = db.query(UserPreferences).filter(
        UserPreferences.user_id == user_id
    ).first()
    
    if not existing:
        existing = UserPreferences(
            id=str(uuid.uuid4()),
            user_id=user_id
        )
        db.add(existing)
    
    existing.max_calories = prefs.get("max_calories", 800)
    existing.max_cook_time = prefs.get("max_cook_time", 60)
    existing.exclude_tags = prefs.get("exclude_tags", [])
    existing.preferred_difficulty = prefs.get("preferred_difficulty", ["easy", "medium", "hard"])
    
    db.commit()

# ============================================
# Unified interface
# ============================================

class StorageInterface:
    """Unified interface for storage operations"""
    
    def __init__(self, db: Optional[Session] = None):
        self.db = db
        self.use_db = USE_DATABASE and db is not None
    
    def get_queue(self, user_id: str) -> List[dict]:
        if self.use_db:
            items = get_queue_db(self.db, user_id)
            return [self._queue_item_to_dict(item) for item in items]
        else:
            state = load_user_state_file(user_id)
            return state.get("queue", [])
    
    def add_to_queue(self, user_id: str, recipe_id: str, recipe_data: dict) -> dict:
        if self.use_db:
            get_or_create_user(self.db, user_id)
            item = add_to_queue_db(self.db, user_id, recipe_id)
            return self._queue_item_to_dict(item)
        else:
            state = load_user_state_file(user_id)
            item = {
                "id": str(uuid.uuid4()),
                "recipe": recipe_data,
                "added_at": datetime.now().isoformat()
            }
            state["queue"].append(item)
            save_user_state_file(user_id, state)
            return item
    
    def remove_from_queue(self, user_id: str, item_id: str):
        if self.use_db:
            remove_from_queue_db(self.db, user_id, item_id)
        else:
            state = load_user_state_file(user_id)
            state["queue"] = [q for q in state["queue"] if q["id"] != item_id]
            save_user_state_file(user_id, state)
    
    def get_history(self, user_id: str) -> List[dict]:
        if self.use_db:
            items = get_history_db(self.db, user_id)
            return [self._history_item_to_dict(item) for item in items]
        else:
            state = load_user_state_file(user_id)
            return state.get("history", [])
    
    def add_to_history(self, user_id: str, recipe_id: str, recipe_data: dict, rating: Optional[int] = None, notes: Optional[str] = None) -> dict:
        if self.use_db:
            get_or_create_user(self.db, user_id)
            item = add_to_history_db(self.db, user_id, recipe_id, rating, notes)
            return self._history_item_to_dict(item)
        else:
            state = load_user_state_file(user_id)
            item = {
                "id": str(uuid.uuid4()),
                "recipe": recipe_data,
                "cooked_at": datetime.now().isoformat(),
                "rating": rating,
                "notes": notes
            }
            state["history"].insert(0, item)
            save_user_state_file(user_id, state)
            return item
    
    def get_swiped_ids(self, user_id: str) -> List[str]:
        if self.use_db:
            return get_swiped_ids_db(self.db, user_id)
        else:
            state = load_user_state_file(user_id)
            return state.get("swiped_ids", [])
    
    def mark_swiped(self, user_id: str, recipe_id: str, action: str):
        if self.use_db:
            get_or_create_user(self.db, user_id)
            mark_swiped_db(self.db, user_id, recipe_id, action)
        else:
            state = load_user_state_file(user_id)
            if recipe_id not in state["swiped_ids"]:
                state["swiped_ids"].append(recipe_id)
            save_user_state_file(user_id, state)
    
    def reset_swipes(self, user_id: str):
        if self.use_db:
            reset_swipes_db(self.db, user_id)
        else:
            state = load_user_state_file(user_id)
            state["swiped_ids"] = []
            save_user_state_file(user_id, state)
    
    def get_preferences(self, user_id: str) -> dict:
        if self.use_db:
            return get_preferences_db(self.db, user_id)
        else:
            state = load_user_state_file(user_id)
            return state.get("preferences", {
                "max_calories": 800,
                "max_cook_time": 60,
                "exclude_tags": [],
                "preferred_difficulty": ["easy", "medium", "hard"]
            })
    
    def update_preferences(self, user_id: str, prefs: dict):
        if self.use_db:
            get_or_create_user(self.db, user_id)
            update_preferences_db(self.db, user_id, prefs)
        else:
            state = load_user_state_file(user_id)
            state["preferences"] = prefs
            save_user_state_file(user_id, state)
    
    def _queue_item_to_dict(self, item: QueueItemModel) -> dict:
        return {
            "id": item.id,
            "recipe": self._recipe_to_dict(item.recipe),
            "added_at": item.added_at.isoformat() if item.added_at else None,
            "planned_date": item.planned_date.isoformat() if item.planned_date else None
        }
    
    def _history_item_to_dict(self, item: HistoryItemModel) -> dict:
        return {
            "id": item.id,
            "recipe": self._recipe_to_dict(item.recipe),
            "cooked_at": item.cooked_at.isoformat() if item.cooked_at else None,
            "rating": item.rating,
            "notes": item.notes
        }
    
    def _recipe_to_dict(self, recipe: RecipeModel) -> dict:
        return {
            "id": recipe.id,
            "title": recipe.title,
            "description": recipe.description,
            "image": recipe.image,
            "cook_time": recipe.cook_time,
            "servings": recipe.servings,
            "calories": recipe.calories,
            "protein": recipe.protein,
            "fat": recipe.fat,
            "carbs": recipe.carbs,
            "ingredients": recipe.ingredients,
            "steps": recipe.steps,
            "tags": recipe.tags,
            "difficulty": recipe.difficulty
        }
