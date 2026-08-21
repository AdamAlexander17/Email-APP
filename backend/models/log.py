from sqlalchemy import Column, Integer, String, DateTime, Text, func, text
from backend.database import Base

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=text("(NOW() + INTERVAL 4 HOUR)"))
