from fastapi import APIRouter, Depends
from celery.result import AsyncResult
from ..auth import verify_token
from ..tasks import scrape_jobs_task, celery_app
from ..schemas import SearchRequest, EnhanceSearchRequest
from ..openai_service import enhance_search

router = APIRouter()


@router.post("/search")
def trigger_search(req: SearchRequest, token: str = Depends(verify_token)):
    task = scrape_jobs_task.delay(req.query, req.location, req.results_wanted)
    return {"task_id": task.id, "status": "pending", "query": req.query}


@router.get("/tasks/{task_id}")
def get_task_status(task_id: str, token: str = Depends(verify_token)):
    result = AsyncResult(task_id, app=celery_app)
    return {
        "task_id": task_id,
        "status": result.status,
        "result": result.result if result.ready() else None,
    }


@router.post("/search/enhance")
def suggest_titles(req: EnhanceSearchRequest, token: str = Depends(verify_token)):
    suggestions = enhance_search(req.query)
    return {"suggestions": suggestions}
