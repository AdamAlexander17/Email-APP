from sqlalchemy import Column, Integer, String, DateTime, Text, func

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
    created_at = Column(DateTime, nullable=False, server_default=func.now())
