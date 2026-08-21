from sqlalchemy import Column, Integer, String, DateTime, Text, func, text

from backend.database import Base


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
    created_at = Column(DateTime, nullable=False, server_default=text("(NOW() + INTERVAL 4 HOUR)"))
