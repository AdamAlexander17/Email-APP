from sqlalchemy import Column, Integer, String, DateTime, Text, func, text

from backend.database import Base


def _dubai_now():
    """Return current Dubai time (UTC+4) as naive datetime."""
    from datetime import datetime, timezone, timedelta
    dubai = timezone(timedelta(hours=4))
    return datetime.now(dubai).replace(tzinfo=None)


class Email(Base):
    __tablename__ = "emails"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    from_email = Column(String(255), nullable=False)
    from_name = Column(String(255), nullable=True)
    to_email = Column(String(255), nullable=False)
    subject = Column(String(500), nullable=True)
    message = Column(Text, nullable=True)
    attachment = Column(Text, nullable=True)
    email_date = Column(DateTime, nullable=True)
    status = Column(String(20), nullable=False, default="Pending")
    comment = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=_dubai_now, server_default=text("(CONVERT_TZ(NOW(), 'UTC', '+04:00'))"))
