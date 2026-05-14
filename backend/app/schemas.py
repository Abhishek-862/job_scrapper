from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class JobOut(BaseModel):
    id: int
    query: str
    title: str
    company: str
    location: str
    description: str
    salary: Optional[str] = None
    job_url: str
    posted_at: Optional[str] = None
    ai_summary: Optional[str] = None
    ai_match: Optional[str] = None
    ai_cover_letter: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SearchRequest(BaseModel):
    query: str
    location: str = "Remote"
    results_wanted: int = 15


class MatchRequest(BaseModel):
    resume_text: str


class CoverLetterRequest(BaseModel):
    background: str = ""


class EnhanceSearchRequest(BaseModel):
    query: str
