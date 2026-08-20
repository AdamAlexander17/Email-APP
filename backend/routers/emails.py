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
    This endpoint is public (no auth required) since it's called by external service.
    """
    # Parse the date if provided
    email_date = None
    if payload.date:
        try:
            email_date = datetime.fromisoformat(payload.date.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            email_date = None

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
