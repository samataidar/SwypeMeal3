"""
Database configuration for SwypeMeal Backend
Поддержка Supabase PostgreSQL
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")

# Check if database is enabled
USE_DATABASE = os.getenv("USE_DATABASE", "false").lower() == "true" and DATABASE_URL is not None

if USE_DATABASE:
    # Supabase requires SSL
    if "supabase" in DATABASE_URL:
        # Ensure SSL mode is set
        if "?sslmode=" not in DATABASE_URL:
            DATABASE_URL += "?sslmode=require"
    
    # SQLAlchemy engine with Supabase-optimized settings
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_recycle=1800,  # Recycle connections every 30 minutes
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
        """Create all tables (if they don't exist)"""
        Base.metadata.create_all(bind=engine)
else:
    # Fallback for file storage mode
    engine = None
    SessionLocal = None
    Base = None
    
    def get_db():
        yield None
    
    def init_db():
        pass
