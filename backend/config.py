"""
Application configuration settings.

Centralizes all configurable values for the backend API including
database connection, JWT parameters, and CORS settings.
"""

import os

# Database Configuration
DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://root:root@localhost/Email_APP"
)

# JWT Configuration
JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "dev-secret-key-change-in-production")
JWT_ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
REFRESH_TOKEN_EXPIRE_DAYS: int = 7

# CORS Configuration
CORS_ALLOWED_ORIGINS: list[str] = ["*"]
