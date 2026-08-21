from sqlalchemy import Column, Integer, String, DateTime, Text, func, text
from backend.database import Base


def _dubai_now():
    """Return current Dubai time (UTC+4) as naive datetime."""
    from datetime import datetime, timezone, timedelta
    dubai = timezone(timedelta(hours=4))
    return datetime.now(dubai).replace(tzinfo=None)


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, nullable=False, default=_dubai_now, server_default=text("(CONVERT_TZ(NOW(), 'UTC', '+04:00'))"))
