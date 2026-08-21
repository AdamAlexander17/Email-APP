"""Pydantic schemas for email webhook and responses."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class GmailWebhookRequest(BaseModel):
    """Schema for incoming Gmail webhook data."""

    model_config = ConfigDict(populate_by_name=True)

    from_email: str = Field(..., alias="from")
    to_email: str = Field(..., alias="toEmail")
    date: Optional[str] = None
    message: Optional[str] = None
    from_name: Optional[str] = Field(None, alias="fromName")
    attachment: Optional[str] = Field(None, alias="Attachment")
    subject: Optional[str] = None


class EmailResponse(BaseModel):
    """Schema for email data in API responses."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    from_email: str
    from_name: Optional[str]
    to_email: str
    subject: Optional[str]
    message: Optional[str]
    attachment: Optional[str]
    email_date: Optional[datetime]
    status: str
    comment: Optional[str]
    created_at: datetime


class EmailCommentUpdate(BaseModel):
    """Schema for updating email comment and status."""

    comment: str
    status: Optional[str] = "Resolved"


class PaginatedEmailsResponse(BaseModel):
    """Schema for paginated email list responses."""

    emails: list[EmailResponse]
    total: int
    page: int
    size: int
