# Job Scrapper — Full Architecture

## Overview

A full-stack web app where you type a job title, it searches LinkedIn, scrapes the results, and displays job cards. Optionally uses OpenAI to analyze/summarize jobs.

> **LinkedIn ToS Note:** LinkedIn prohibits unauthorized scraping. Use this for personal/educational purposes, or swap the scraper for LinkedIn's official Jobs API if you have access.

---

## Tech Stack

| Layer      | Technology            | Why                                           |
|------------|-----------------------|-----------------------------------------------|
| Frontend   | React + Vite + Tailwind | Fast dev, responsive job cards UI           |
| Backend    | FastAPI (Python)      | Async, auto-docs at `/docs`, fast             |
| Scraper    | Playwright            | Handles JS-rendered LinkedIn pages            |
| Database   | PostgreSQL            | Persistent job storage                        |
| Cache/Queue| Redis + Celery        | Async scraping jobs, no HTTP timeouts         |
| AI Layer   | OpenAI GPT-4o-mini    | Summarize jobs, match to resume, cover letter |
| Auth       | API token (Bearer)    | Simple header-based auth                      |
| Containers | Docker + Compose      | One-command startup, isolated services        |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                            │
│                                                                 │
│   ┌──────────────────────────────────────────────────────┐     │
│   │  [  Search: "Software Engineer New York"  ] [Search] │     │
│   └──────────────────────────────────────────────────────┘     │
│                                                                 │
│   ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  │
│   │  Job Card │  │  Job Card │  │  Job Card │  │  Job Card │  │
│   │  Title    │  │  Title    │  │  Title    │  │  Title    │  │
│   │  Company  │  │  Company  │  │  Company  │  │  Company  │  │
│   │  Location │  │  Location │  │  Location │  │  Location │  │
│   │ [View AI] │  │ [View AI] │  │ [View AI] │  │ [View AI] │  │
│   └───────────┘  └───────────┘  └───────────┘  └───────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTP REST
                          │ Authorization: Bearer <API_TOKEN>
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend :8000                        │
│                                                                 │
│  POST /api/search          → search jobs by title               │
│  GET  /api/jobs            → list all saved jobs                │
│  GET  /api/jobs/{id}       → single job detail                  │
│  POST /api/jobs/{id}/analyze → OpenAI analysis                  │
│  DELETE /api/jobs/{id}     → delete job                         │
│  GET  /api/export/csv      → export all jobs as CSV             │
└────────┬─────────────────────────┬───────────────────────────────┘
         │                         │
         ▼                         ▼
┌──────────────────┐    ┌──────────────────────────────────────┐
│   PostgreSQL     │    │            Redis Queue               │
│   :5432          │    │            :6379                     │
│                  │    │                                      │
│  jobs table:     │    │  Celery task queue — scrape jobs     │
│  - id            │    │  enqueued here, picked up by worker  │
│  - title         │    └──────────────┬───────────────────────┘
│  - company       │                   │
│  - location      │                   ▼
│  - description   │    ┌──────────────────────────────────────┐
│  - salary        │    │     Celery Worker + Playwright       │
│  - url           │◄───│                                      │
│  - ai_summary    │    │  1. Open LinkedIn job search URL     │
│  - posted_at     │    │  2. Wait for JS to fully render      │
│  - created_at    │    │  3. Extract job cards (title,        │
└──────────────────┘    │     company, location, link)         │
         │              │  4. Follow each link, get full desc  │
         │              │  5. Save all to PostgreSQL           │
         │              └──────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│                   OpenAI API (optional)                       │
│                                                              │
│  POST /api/jobs/{id}/analyze triggers:                       │
│    - GPT-4o-mini reads raw job description                   │
│    - Returns: summary, key skills, seniority level,          │
│      salary estimate, fit score (if resume provided)         │
└──────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
job_scrapper/
├── docker-compose.yml
├── .env
├── .env.example
├── architecture.md             ← this file
├── LICENSE
├── README.md
│
├── docs/
│   └── genai_usages.md         ← OpenAI integration guide
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api/
│       │   └── client.js       ← Axios with Bearer token header
│       └── components/
│           ├── SearchBar.jsx   ← Job title input + search button
│           ├── JobCard.jsx     ← Single job display card
│           ├── JobList.jsx     ← Grid of job cards
│           ├── JobModal.jsx    ← Full description + AI analysis
│           └── Loader.jsx      ← Spinner while scraping
│
└── backend/
    ├── Dockerfile
    ├── requirements.txt
    └── app/
        ├── main.py             ← FastAPI app, CORS, router mount
        ├── auth.py             ← Bearer token verification
        ├── database.py         ← SQLAlchemy engine + session
        ├── models.py           ← Job ORM model
        ├── schemas.py          ← Pydantic request/response shapes
        ├── scraper.py          ← Playwright LinkedIn scraping logic
        ├── openai_service.py   ← OpenAI GPT calls
        ├── tasks.py            ← Celery task definitions
        └── routes/
            ├── jobs.py         ← CRUD + export endpoints
            └── search.py       ← Search trigger endpoint
```

---

## Docker Services

```yaml
# docker-compose.yml summary

services:
  frontend:   React app          → localhost:3000
  backend:    FastAPI            → localhost:8000
  worker:     Celery + Playwright (no exposed port)
  db:         PostgreSQL         → localhost:5432
  redis:      Redis              → localhost:6379
```

---

## Data Flow — Job Search

```
User types "Data Scientist" → clicks Search
    │
    ▼
Frontend POST /api/search  { query: "Data Scientist", location: "Remote" }
    Header: Authorization: Bearer <token>
    │
    ▼
Backend validates token → enqueues Celery task → returns { task_id }
    │
    ▼
Frontend polls GET /api/jobs?query=Data+Scientist every 2s
    │
    ▼
Celery worker:
  1. Playwright opens https://www.linkedin.com/jobs/search/?keywords=Data+Scientist
  2. Scrolls to load all visible results (~25 cards)
  3. For each card: extract title, company, location, link, posted_date
  4. For each link: open detail page, extract full description
  5. Save all jobs to PostgreSQL
    │
    ▼
GET /api/jobs returns array of job objects → frontend renders cards
```

---

## Data Flow — AI Analysis

```
User clicks "Analyze with AI" on a job card
    │
    ▼
Frontend POST /api/jobs/{id}/analyze
    │
    ▼
Backend fetches job description from PostgreSQL
    │
    ▼
OpenAI GPT-4o-mini receives prompt:
    "Analyze this job description. Return JSON with:
     summary (2-3 sentences), key_skills (list),
     seniority (junior/mid/senior), salary_estimate,
     why_apply (top 3 reasons)"
    │
    ▼
Response saved to jobs.ai_summary column
    │
    ▼
Frontend displays AI panel inside JobModal
```

---

## API Endpoints

| Method | Path                       | Auth | Description                      |
|--------|----------------------------|------|----------------------------------|
| POST   | `/api/search`              | Yes  | Trigger LinkedIn search + scrape |
| GET    | `/api/jobs`                | Yes  | List all jobs (filter by query)  |
| GET    | `/api/jobs/{id}`           | Yes  | Single job detail                |
| POST   | `/api/jobs/{id}/analyze`   | Yes  | Run OpenAI analysis on job       |
| DELETE | `/api/jobs/{id}`           | Yes  | Delete a job                     |
| GET    | `/api/export/csv`          | Yes  | Download all jobs as CSV         |
| GET    | `/api/health`              | No   | Health check                     |

---

## Environment Variables

```env
# .env
API_TOKEN=your-secret-bearer-token
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://user:pass@db:5432/jobs
REDIS_URL=redis://redis:6379/0
```

---

## Security

| Concern             | Mitigation                                            |
|---------------------|-------------------------------------------------------|
| Token exposure      | `.env` never committed, injected via Docker           |
| SQL injection       | SQLAlchemy ORM parameterizes all queries              |
| XSS                 | React escapes all rendered content by default         |
| CORS                | Restricted to `localhost:3000` in backend             |
| LinkedIn rate limit | 1-2s random delay between page navigations            |
| OpenAI cost runaway | Use `gpt-4o-mini`, cap max_tokens per call            |
