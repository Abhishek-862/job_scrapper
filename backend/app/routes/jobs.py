import csv
import io
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from ..auth import verify_token
from ..database import get_db
from ..models import Job
from ..schemas import JobOut, MatchRequest, CoverLetterRequest
from ..openai_service import analyze_job, match_resume, generate_cover_letter

router = APIRouter()


@router.get("/jobs", response_model=List[JobOut])
def list_jobs(
    query: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    token: str = Depends(verify_token),
):
    q = db.query(Job)
    if query:
        q = q.filter(Job.query.ilike(f"%{query}%"))
    return q.order_by(Job.created_at.desc()).limit(limit).all()


@router.get("/jobs/{job_id}", response_model=JobOut)
def get_job(job_id: int, db: Session = Depends(get_db), token: str = Depends(verify_token)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/jobs/{job_id}/analyze", response_model=JobOut)
def analyze(job_id: int, db: Session = Depends(get_db), token: str = Depends(verify_token)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    result = analyze_job(job.description, job.title, job.company)
    job.ai_summary = json.dumps(result)
    db.commit()
    db.refresh(job)
    return job


@router.post("/jobs/{job_id}/match", response_model=JobOut)
def match(job_id: int, req: MatchRequest, db: Session = Depends(get_db), token: str = Depends(verify_token)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    result = match_resume(job.description, job.title, req.resume_text)
    job.ai_match = json.dumps(result)
    db.commit()
    db.refresh(job)
    return job


@router.post("/jobs/{job_id}/cover-letter", response_model=JobOut)
def cover_letter(job_id: int, req: CoverLetterRequest, db: Session = Depends(get_db), token: str = Depends(verify_token)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.ai_cover_letter = generate_cover_letter(job.description, job.title, job.company, req.background)
    db.commit()
    db.refresh(job)
    return job


@router.delete("/jobs/{job_id}")
def delete_job(job_id: int, db: Session = Depends(get_db), token: str = Depends(verify_token)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(job)
    db.commit()
    return {"detail": "deleted"}


@router.get("/export/csv")
def export_csv(db: Session = Depends(get_db), token: str = Depends(verify_token)):
    jobs = db.query(Job).order_by(Job.created_at.desc()).all()
    output = io.StringIO()
    fields = ["id", "title", "company", "location", "salary", "job_url", "posted_at", "query"]
    writer = csv.DictWriter(output, fieldnames=fields)
    writer.writeheader()
    for job in jobs:
        writer.writerow({
            "id": job.id, "title": job.title, "company": job.company,
            "location": job.location, "salary": job.salary or "",
            "job_url": job.job_url, "posted_at": job.posted_at or "", "query": job.query,
        })
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=jobs.csv"},
    )
