import logging
from typing import List, Dict

logger = logging.getLogger(__name__)


def scrape_linkedin_jobs(query: str, location: str = "Remote", results_wanted: int = 15) -> List[Dict]:
    try:
        from jobspy import scrape_jobs

        jobs_df = scrape_jobs(
            site_name=["linkedin"],
            search_term=query,
            location=location,
            results_wanted=results_wanted,
            hours_old=72,
        )

        if jobs_df is None or jobs_df.empty:
            logger.warning("No jobs returned for query: %s", query)
            return []

        jobs = []
        for _, row in jobs_df.iterrows():
            title = str(row.get("title", "")).strip()
            company = str(row.get("company", "")).strip()
            if not title or not company or title == "nan" or company == "nan":
                continue

            jobs.append({
                "title": title,
                "company": company,
                "location": _clean(row.get("location")),
                "description": _clean(row.get("description")) or "No description provided.",
                "salary": _extract_salary(row),
                "job_url": _clean(row.get("job_url")) or "",
                "posted_at": _clean(row.get("date_posted")),
            })

        return jobs

    except Exception as e:
        logger.error("Scraping failed: %s", e, exc_info=True)
        return []


def _clean(val) -> str:
    if val is None:
        return ""
    s = str(val).strip()
    return "" if s == "nan" else s


def _extract_salary(row) -> str:
    min_sal = row.get("min_amount")
    max_sal = row.get("max_amount")
    currency = _clean(row.get("currency")) or "USD"
    try:
        if min_sal and max_sal and str(min_sal) != "nan":
            return f"{currency} {int(float(min_sal)):,} – {int(float(max_sal)):,}"
        if min_sal and str(min_sal) != "nan":
            return f"{currency} {int(float(min_sal)):,}+"
    except (ValueError, TypeError):
        pass
    return ""
