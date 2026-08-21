"""
Emails router for Gmail webhook and email listing endpoints.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
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
        try:
            # Try ISO format first (2026-08-20T10:00:00Z)
            email_date = datetime.fromisoformat(payload.date.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            try:
                # Try RFC 2822 format (Fri, 21 Aug 2026 04:39:06 -0700)
                from email.utils import parsedate_to_datetime
                email_date = parsedate_to_datetime(payload.date)
            except (ValueError, TypeError):
                try:
                    # Try common formats
                    from dateutil import parser as dateparser
                    email_date = dateparser.parse(payload.date)
                except Exception:
                    email_date = None

        # Convert to IST (UTC+5:30) for storage
        if email_date is not None:
            from datetime import timezone, timedelta
            ist = timezone(timedelta(hours=5, minutes=30))
            if email_date.tzinfo is not None:
                email_date = email_date.astimezone(ist).replace(tzinfo=None)
            # else: assume already local, keep as-is

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
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Retrieve a paginated list of emails. Requires authentication.
    Supports search by from_email, from_name, or subject.
    """
    query = db.query(Email)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Email.from_email.ilike(search_filter))
            | (Email.from_name.ilike(search_filter))
            | (Email.subject.ilike(search_filter))
        )

    total = query.count()
    emails = (
        query.order_by(Email.email_date.desc(), Email.created_at.desc())
        .offset((page - 1) * size)
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
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Add/update comment and change status."""
    email = db.query(Email).filter(Email.id == email_id).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    email.comment = data.comment
    email.status = data.status or "Resolved"
    db.commit()

    from backend.routers.logs import log_activity
    username = current_user.get("username", "Unknown")
    log_activity(db, username, "Email Resolved", f"Commented on email #{email_id}: {data.comment[:50]}")

    db.refresh(email)
    return email
