"""
Database connection and session management.

Provides SQLAlchemy engine, session factory, declarative base,
and dependency injection for FastAPI route handlers.
"""

import logging

from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from backend.config import DATABASE_URL

logger = logging.getLogger(__name__)

# SQLAlchemy engine created from the configured database URL.
# pool_pre_ping ensures stale connections are detected before use.
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# Session factory bound to the engine. Each call produces a new Session instance.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base class for ORM model definitions.
Base = declarative_base()


def get_db():
    """
    FastAPI dependency that yields a database session.

    Ensures the session is properly closed after the request completes,
    regardless of whether an exception occurred.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Create all tables defined by models that inherit from Base.

    Should be called during application startup. If the database connection
    fails or table creation fails, logs the error and re-raises the exception
    so the application can terminate gracefully.
    """
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully.")
    except OperationalError as e:
        logger.error(f"Failed to connect to the database: {e}")
        raise
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise
