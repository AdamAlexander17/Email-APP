from sqlalchemy import Column, Integer, String, DateTime, Text, func, text

from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, server_default=text("(NOW() + INTERVAL 4 HOUR)"))
    updated_at = Column(DateTime, nullable=False, server_default=text("(NOW() + INTERVAL 4 HOUR)"), onupdate=func.now())
