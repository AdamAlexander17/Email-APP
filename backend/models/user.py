from sqlalchemy import Column, Integer, String, DateTime, Text, func, text

from backend.database import Base


def _dubai_now():
    """Return current Dubai time (UTC+4) as naive datetime."""
    from datetime import datetime, timezone, timedelta
    dubai = timezone(timedelta(hours=4))
    return datetime.now(dubai).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=_dubai_now, server_default=text("(CONVERT_TZ(NOW(), 'UTC', '+04:00'))"))
    updated_at = Column(DateTime, nullable=False, default=_dubai_now, onupdate=_dubai_now, server_default=text("(CONVERT_TZ(NOW(), 'UTC', '+04:00'))"))
