"""
Emails router for Gmail webhook and email listing endpoints.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.dependencies.auth import get_current_user
from backend.models.email import Email
from backend.schemas.email import (
    EmailCommentUpdate,
    EmailResponse,
    GmailWebhookRequest,
    PaginatedEmailsResponse,
)

router = APIRouter(prefix="/api", tags=["emails"])


@router.post("/gmail-webhook", response_model=EmailResponse, status_code=201)
def receive_gmail_webhook(
    payload: GmailWebhookRequest,
    db: Session = Depends(get_db),
):
    """
    Receive email data from Gmail webhook.
    Public endpoint - called by Integrately.
    """
    # Parse the date if provided
    email_date = None
    if payload.date:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"[WEBHOOK] Raw date received: {payload.date!r}")

        try:
            # Try ISO format first (2026-08-20T10:00:00Z or 2026-08-20T10:00:00+04:00)
            raw = payload.date.strip()
            if raw.endswith("Z"):
                # Explicit UTC — convert to Dubai
                email_date = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            else:
                email_date = datetime.fromisoformat(raw)
        except (ValueError, TypeError):
            try:
                # Try RFC 2822 format (Fri, 21 Aug 2026 04:39:06 -0700)
                from email.utils import parsedate_to_datetime
                email_date = parsedate_to_datetime(payload.date)
            except (ValueError, TypeError):
                try:
                    from dateutil import parser as dateparser
                    email_date = dateparser.parse(payload.date)
                except Exception:
                    email_date = None

        # If date is timezone-aware, convert to Dubai time (UTC+4)
        # If date is naive (no timezone), assume it's already correct local time
        if email_date is not None:
            if email_date.tzinfo is not None:
                from datetime import timezone, timedelta
                dubai = timezone(timedelta(hours=4))
                email_date = email_date.astimezone(dubai).replace(tzinfo=None)
            # else: naive datetime — store as-is

        logger.info(f"[WEBHOOK] Parsed email_date: {email_date}")

    email = Email(
        from_email=payload.from_email,
        from_name=payload.from_name,
        to_email=payload.to_email,
        subject=payload.subject,
        message=payload.message,
        attachment=payload.attachment,
        email_date=email_date,
    )
    db.add(email)
    db.commit()
    db.refresh(email)
    return email


@router.get("/emails", response_model=PaginatedEmailsResponse)
def list_emails(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=10, ge=5, le=100),
    search: Optional[str] = Query(default=None),
    sort_by: Optional[str] = Query(default="created_at"),
    sort_dir: Optional[str] = Query(default="desc"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Retrieve a paginated list of emails. Requires authentication.
    Supports search by from_email, from_name, or subject.
    Supports sorting by any column.
    """
    query = db.query(Email)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Email.from_email.ilike(search_filter))
            | (Email.from_name.ilike(search_filter))
            | (Email.subject.ilike(search_filter))
        )

    # Sorting
    allowed_sort = {
        "from_email": Email.from_email,
        "from_name": Email.from_name,
        "subject": Email.subject,
        "to_email": Email.to_email,
        "status": Email.status,
        "email_date": Email.email_date,
        "created_at": Email.created_at,
        "resolved_at": Email.resolved_at,
    }
    sort_column = allowed_sort.get(sort_by, Email.created_at)
    if sort_dir == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    total = query.count()
    emails = (
        query.offset((page - 1) * size)
        .limit(size)
        .all()
    )

    return PaginatedEmailsResponse(
        emails=emails,
        total=total,
        page=page,
        size=size,
    )


@router.get("/emails/{email_id}", response_model=EmailResponse)
def get_email(
    email_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get a single email by ID."""
    email = db.query(Email).filter(Email.id == email_id).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    return email


@router.delete("/emails/{email_id}", status_code=204)
def delete_email(
    email_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Delete an email by ID."""
    email = db.query(Email).filter(Email.id == email_id).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    db.delete(email)
    db.commit()


@router.put("/emails/{email_id}/comment", response_model=EmailResponse)
def update_email_comment(
    email_id: int,
    data: EmailCommentUpdate,
    req: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Add/update comment and change status."""
    email = db.query(Email).filter(Email.id == email_id).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    email.comment = data.comment
    email.status = data.status or "Resolved"
    if email.status == "Resolved" and email.resolved_at is None:
        from datetime import datetime as dt, timezone, timedelta
        dubai = timezone(timedelta(hours=4))
        email.resolved_at = dt.now(dubai).replace(tzinfo=None)
    elif email.status == "Pending":
        email.resolved_at = None
    db.commit()

    from backend.routers.logs import log_activity
    username = current_user.get("username", "Unknown")
    client_ip = req.headers.get("X-Real-IP") or req.headers.get("X-Forwarded-For") or req.client.host
    log_activity(db, username, "Email Resolved", f"Commented on email #{email_id}: {data.comment[:50]}", ip_address=client_ip)

    db.refresh(email)
    return email
