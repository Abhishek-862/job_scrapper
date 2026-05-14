import logging
from celery import Celery
from .config import settings

logger = logging.getLogger(__name__)

celery_app = Celery(
    "job_scrapper",
    broker=settings.redis_url,
    backend=settings.redis_url,
)
celery_app.conf.task_serializer = "json"
celery_app.conf.result_expires = 3600


@celery_app.task(bind=True, name="tasks.scrape_jobs", max_retries=2)
def scrape_jobs_task(self, query: str, location: str, results_wanted: int):
    from .database import SessionLocal
    from .models import Job
    from .scraper import scrape_linkedin_jobs

    db = SessionLocal()
    try:
        jobs = scrape_linkedin_jobs(query, location, results_wanted)
        saved = 0
        for job_data in jobs:
            exists = db.query(Job).filter(Job.job_url == job_data["job_url"]).first()
            if not exists and job_data["job_url"]:
                db.add(Job(query=query, **job_data))
                saved += 1
        db.commit()
        logger.info("Scraped %d, saved %d for query '%s'", len(jobs), saved, query)
        return {"status": "done", "scraped": len(jobs), "saved": saved}
    except Exception as exc:
        db.rollback()
        logger.error("Task failed: %s", exc, exc_info=True)
        raise self.retry(exc=exc, countdown=15)
    finally:
        db.close()
