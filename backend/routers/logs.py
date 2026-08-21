from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.dependencies.auth import get_current_user
from backend.models.log import ActivityLog
from backend.schemas.log import LogResponse, PaginatedLogsResponse

router = APIRouter(prefix="/api/logs", tags=["logs"])


def log_activity(db: Session, user: str, action: str, details: str = None, ip_address: str = None):
    """Helper to create an activity log entry."""
    entry = ActivityLog(user=user, action=action, details=details, ip_address=ip_address)
    db.add(entry)
    db.commit()


@router.get("", response_model=PaginatedLogsResponse)
def list_logs(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=5, le=100),
    search: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = db.query(ActivityLog)
    if search:
        f = f"%{search}%"
        query = query.filter(
            (ActivityLog.user.ilike(f)) | (ActivityLog.action.ilike(f)) | (ActivityLog.details.ilike(f))
        )
    total = query.count()
    logs = query.order_by(ActivityLog.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return PaginatedLogsResponse(logs=logs, total=total, page=page, size=size)
