"""
Database configuration for SwypeMeal Backend
Поддержка PostgreSQL для production и SQLite для разработки
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Database URL from environment or default to SQLite
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./swypemeal.db"
)

# For PostgreSQL on Render, convert postgres:// to postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    pool_pre_ping=True,
    pool_size=5 if "postgresql" in DATABASE_URL else 0,
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency for FastAPI
def get_db():
    """Database session dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Initialize database
def init_db():
    """Create all tables"""
    Base.metadata.create_all(bind=engine)
