# Job Scrapper

A full-stack web app that scrapes LinkedIn jobs by title in real-time and lets you analyze, match, and apply with OpenAI GPT-4o-mini — all containerized with Docker.

## Features

- **Live LinkedIn scraping** — type a job title, get real results in ~30 seconds
- **AI Search Enhancement** — GPT suggests related titles to broaden your search
- **AI Job Analysis** — summary, key skills, seniority, salary estimate, red flags
- **Resume Matching** — paste your background, get a fit score (0–100) + pitch advice
- **Cover Letter Generator** — personalized draft ready to edit and send
- **CSV Export** — download all scraped jobs
- **Fully Dockerized** — one command to run everything

> **LinkedIn ToS Note:** LinkedIn prohibits unauthorized scraping. Use this for personal/educational purposes only.

## Quick Start

```bash
# 1. Clone the repo
git clone <repo-url>
cd job_scrapper

# 2. Set up environment variables
cp .env.example .env
# Edit .env — set API_TOKEN and OPENAI_API_KEY

# 3. Start all services
docker compose up --build

# 4. Open in browser
#    App:      http://localhost:3000
#    API docs: http://localhost:8000/docs
```

## Environment Variables

| Variable          | Description                                  |
|-------------------|----------------------------------------------|
| `API_TOKEN`       | Bearer token to protect the API              |
| `OPENAI_API_KEY`  | Your OpenAI key (for all AI features)        |
| `POSTGRES_USER`   | Database user (default: `user`)              |
| `POSTGRES_PASS`   | Database password (default: `pass`)          |
| `POSTGRES_DB`     | Database name (default: `jobs`)              |

## Tech Stack

| Layer      | Technology                 |
|------------|----------------------------|
| Frontend   | React 18 + Vite + Tailwind |
| Backend    | FastAPI (Python 3.12)      |
| Scraper    | python-jobspy (LinkedIn)   |
| Queue      | Celery + Redis             |
| Database   | PostgreSQL 16              |
| AI         | OpenAI GPT-4o-mini         |
| Containers | Docker + Docker Compose    |

## Project Structure

```
job_scrapper/
├── docker-compose.yml
├── .env.example
├── genai_usage.md         # AI features: what worked, what failed
├── architecture.md        # Full system architecture
├── frontend/              # React + Vite + Tailwind
│   ├── Dockerfile
│   └── src/
│       ├── App.jsx
│       ├── api/client.js
│       └── components/
│           ├── SearchBar.jsx   ← search + AI suggestions
│           ├── JobCard.jsx     ← job result card
│           ├── JobList.jsx     ← results grid
│           ├── JobModal.jsx    ← details + all AI tabs
│           └── Loader.jsx
└── backend/               # FastAPI + Celery
    ├── Dockerfile
    ├── requirements.txt
    └── app/
        ├── main.py
        ├── config.py
        ├── auth.py
        ├── database.py
        ├── models.py
        ├── schemas.py
        ├── scraper.py          ← python-jobspy LinkedIn scraping
        ├── openai_service.py   ← all GPT-4o-mini calls
        ├── tasks.py            ← Celery async task
        └── routes/
            ├── jobs.py         ← CRUD + export + AI endpoints
            └── search.py       ← search trigger + task polling
```

## API Endpoints

| Method | Path                          | Description                      |
|--------|-------------------------------|----------------------------------|
| POST   | `/api/search`                 | Trigger LinkedIn scrape (async)  |
| GET    | `/api/tasks/{id}`             | Poll task status                 |
| POST   | `/api/search/enhance`         | AI-suggested related titles      |
| GET    | `/api/jobs`                   | List all scraped jobs            |
| GET    | `/api/jobs/{id}`              | Single job detail                |
| POST   | `/api/jobs/{id}/analyze`      | AI job analysis                  |
| POST   | `/api/jobs/{id}/match`        | AI resume match + fit score      |
| POST   | `/api/jobs/{id}/cover-letter` | AI cover letter generation       |
| DELETE | `/api/jobs/{id}`              | Delete a job                     |
| GET    | `/api/export/csv`             | Download all jobs as CSV         |
| GET    | `/api/health`                 | Health check                     |

## Local Dev (without Docker)

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Celery worker (separate terminal)
celery -A app.tasks.celery_app worker --loglevel=info

# Frontend (change proxy target in vite.config.js to http://localhost:8000)
cd frontend
npm install
npm run dev
```

## Docs

- [Architecture](./architecture.md)
- [GenAI Usage — features, what worked, what failed](./genai_usage.md)

## License

[MIT](./LICENSE)
