import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

# Scrape LinkedIn first, fall back to Indeed if LinkedIn returns nothing.
# Indeed is more scraping-friendly; LinkedIn blocks aggressively on shared IPs.
SOURCES = ["linkedin", "indeed"]


def scrape_linkedin_jobs(query: str, location: str = "Remote", results_wanted: int = 15) -> List[Dict]:
    from jobspy import scrape_jobs

    for site in SOURCES:
        try:
            logger.info("Trying %s for query='%s' location='%s'", site, query, location)
            jobs_df = scrape_jobs(
                site_name=[site],
                search_term=query,
                location=location,
                results_wanted=results_wanted,
                country_indeed="USA",
            )

            if jobs_df is None or jobs_df.empty:
                logger.warning("%s returned 0 results — trying next source", site)
                continue

            jobs = _parse(jobs_df)
            if not jobs:
                logger.warning("%s had rows but all were filtered out — trying next source", site)
                continue

            logger.info("%s returned %d usable jobs", site, len(jobs))
            return jobs

        except Exception as e:
            logger.error("%s scraping failed: %s", site, e, exc_info=True)
            continue

    logger.error("All sources exhausted — returning empty list")
    return []


def _parse(jobs_df) -> List[Dict]:
    jobs = []
    for _, row in jobs_df.iterrows():
        title = _clean(row.get("title"))
        company = _clean(row.get("company"))
        if not title or not company:
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
