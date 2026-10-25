"""
SQLAlchemy models for SwypeMeal Backend
"""

from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    queue_items = relationship("QueueItem", back_populates="user", cascade="all, delete-orphan")
    history_items = relationship("HistoryItem", back_populates="user", cascade="all, delete-orphan")
    swiped_recipes = relationship("SwipedRecipe", back_populates="user", cascade="all, delete-orphan")
    preferences = relationship("UserPreferences", back_populates="user", uselist=False, cascade="all, delete-orphan")

class Recipe(Base):
    __tablename__ = "recipes"
    
    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    image = Column(String, nullable=False)
    cook_time = Column(Integer, nullable=False)
    servings = Column(Integer, nullable=False)
    calories = Column(Integer, nullable=False)
    protein = Column(Float, nullable=False)
    fat = Column(Float, nullable=False)
    carbs = Column(Float, nullable=False)
    ingredients = Column(JSON, nullable=False)  # List of strings
    steps = Column(JSON, nullable=False)  # List of strings
    tags = Column(JSON, nullable=False)  # List of strings
    difficulty = Column(String, nullable=False)  # easy, medium, hard
    
    # Metadata
    is_custom = Column(Boolean, default=False)
    author_id = Column(String, nullable=True)
    status = Column(String, default="approved")  # pending, approved, rejected
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class QueueItem(Base):
    __tablename__ = "queue_items"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    recipe_id = Column(String, ForeignKey("recipes.id"), nullable=False)
    position = Column(Integer, nullable=False)  # For FIFO ordering
    added_at = Column(DateTime, default=datetime.utcnow)
    planned_date = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="queue_items")
    recipe = relationship("Recipe")

class HistoryItem(Base):
    __tablename__ = "history_items"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    recipe_id = Column(String, ForeignKey("recipes.id"), nullable=False)
    cooked_at = Column(DateTime, default=datetime.utcnow)
    rating = Column(Integer, nullable=True)  # 1-5 stars
    notes = Column(Text, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="history_items")
    recipe = relationship("Recipe")

class SwipedRecipe(Base):
    __tablename__ = "swiped_recipes"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    recipe_id = Column(String, ForeignKey("recipes.id"), nullable=False)
    action = Column(String, nullable=False)  # like, dislike
    swiped_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="swiped_recipes")
    recipe = relationship("Recipe")

class UserPreferences(Base):
    __tablename__ = "user_preferences"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    max_calories = Column(Integer, default=800)
    max_cook_time = Column(Integer, default=60)
    exclude_tags = Column(JSON, default=[])  # List of strings
    preferred_difficulty = Column(JSON, default=["easy", "medium", "hard"])  # List of strings
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="preferences")
