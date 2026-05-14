from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from .database import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    query = Column(String(255), index=True)
    title = Column(String(500))
    company = Column(String(255))
    location = Column(String(255))
    description = Column(Text)
    salary = Column(String(255), nullable=True)
    job_url = Column(String(2000))
    posted_at = Column(String(100), nullable=True)
    ai_summary = Column(Text, nullable=True)
    ai_match = Column(Text, nullable=True)
    ai_cover_letter = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
