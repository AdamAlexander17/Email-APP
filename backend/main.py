"""
Main FastAPI application entry point.

Configures CORS middleware, includes routers, initializes the database
on startup, and provides a global exception handler for unexpected errors.
"""

import logging
import traceback

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import CORS_ALLOWED_ORIGINS
from backend.database import init_db
from backend.routers import auth, users, emails, logs

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Email App API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(emails.router)
app.include_router(logs.router)


@app.on_event("startup")
def on_startup():
    """Initialize database tables on application startup."""
    import backend.models.user  # noqa: F401 — ensure models are registered
    import backend.models.email  # noqa: F401
    import backend.models.log  # noqa: F401
    init_db()
    logger.info("Application startup complete.")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch-all handler for unexpected exceptions.

    Logs the full traceback and returns a generic 500 response to avoid
    leaking internal details to clients.
    """
    logger.error(f"Unhandled exception: {traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
