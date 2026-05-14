# GenAI Usage — Job Scrapper

This document tracks how AI was used to build and power this project, including where it helped, where it struggled, and how limitations were worked around.

---

## Part 1 — AI Features Inside the App (OpenAI GPT-4o-mini)

Four distinct GPT-4o-mini features are wired into the app. Each section covers what it does, what went well, and what went wrong.

---

### 1. Job Analysis (`POST /api/jobs/{id}/analyze`)

**What it does:** Reads the raw job description and returns a structured JSON object with:
- Plain-English summary (2–3 sentences)
- Extracted key skills (list)
- Seniority level (junior / mid / senior / lead)
- Salary estimate
- Top 3 reasons to apply
- Potential red flags

**What went well:**
- Skill extraction is consistently accurate — it picks out the actual requirements, not filler text.
- Red flag detection catches things humans overlook: "fast-paced startup" = long hours, "wearing many hats" = understaffed, etc.
- Using `response_format: json_object` eliminated most JSON parsing failures.

**Where it went wrong / limitations:**
- **Seniority is often wrong** — a "Senior Software Engineer" title with junior-level salary and responsibilities gets classified as senior based on the title alone.
- **Salary estimation is unreliable** when the description gives no salary signals at all. The model invents a plausible-sounding but made-up range.
- **Red flags are sometimes hallucinated** — the model occasionally flags normal phrases (e.g. "collaborative team") as red flags.
- **Context window truncation** — descriptions over 3,000 characters are trimmed. The model misses requirements buried at the bottom of long job posts.

---

### 2. Resume Matching (`POST /api/jobs/{id}/match`)

**What it does:** Takes the user's free-form resume text / skills summary and scores how well they fit the job (0–100), listing strengths, gaps, and a personalized pitch strategy.

**What went well:**
- The fit score correlates well with intuition when the user provides specific, concrete background text.
- "How to pitch yourself" is the most practically useful output — it reframes the candidate's experience in the job's language.
- The recommendation sentence is honest about weak fits rather than always being encouraging.

**Where it went wrong / limitations:**
- **Scores skew optimistic** — the model rarely gives below 30 even for obvious mismatches. A Python developer checking a C++ embedded systems role gets a 45.
- **Requirement invention** — the model sometimes asserts the job requires something not mentioned in the description, which inflates perceived gaps.
- **Vague resume input = vague output** — if the user types "I know programming", the match quality collapses. The prompt now includes an example to guide users.
- **No memory between calls** — matching the same resume against 10 jobs re-sends the full resume text each time. Cost adds up.

---

### 3. Cover Letter Generator (`POST /api/jobs/{id}/cover-letter`)

**What it does:** Drafts a 3-paragraph, ready-to-send cover letter tailored to the specific job and (optionally) the user's background.

**What went well:**
- The structure is consistently good: strong opener, skill-evidence middle, confident close.
- When the user provides specific background, the letters feel genuinely personalized.
- The instruction "do NOT include placeholder brackets — write it ready to send" works reliably.

**Where it went wrong / limitations:**
- **Generic without background input** — without user context, every letter sounds identical: "I am excited to apply for the X role at Y company." Still technically correct but not impressive.
- **Tone can be over-formal** — GPT-4o-mini defaults to HR-speak. Users in creative fields may need to explicitly say "write in a casual, direct tone."
- **Company research is zero** — the model only sees the job description. It cannot look up what the company actually does, recent news, or culture.
- **"Ready to send" is aspirational** — a real human should still review and add a personal anecdote. The AI layer is a first draft, not a finished product.

---

### 4. AI Search Enhancement (`POST /api/search/enhance`)

**What it does:** Given a job title the user typed, GPT-4o-mini suggests 4 related titles they should also search for to find more opportunities.

**What went well:**
- Fast (small output, ~120 max tokens) — responds in under 2 seconds.
- Genuinely useful for users who only know one title. "Frontend Developer" → ["React Engineer", "UI Engineer", "JavaScript Developer", "Web Engineer"].
- Chips are clickable to instantly reuse the suggestion.

**Where it went wrong / limitations:**
- **Overly creative suggestions** — for niche roles like "Quant Researcher", it sometimes suggests titles that almost no company posts (e.g. "Financial Signal Analyst").
- **Regional naming differences ignored** — "Software Engineer" suggestions are US-centric. In the UK, "Software Developer" is more common; the model doesn't ask for location context.
- **No validation against real posting volume** — suggestions sound reasonable but some return zero LinkedIn results.

---

## Part 2 — AI Used to Build This Project (Claude Code / Claude Sonnet)

Claude Code was used to design and generate the entire codebase. This section documents how that went.

**What Claude helped with:**
- Designed the full system architecture (FastAPI + Celery + Redis + PostgreSQL + React)
- Generated all 30+ source files from scratch — backend routes, models, schemas, scraper logic, OpenAI integration, and all React components
- Wrote the Docker Compose configuration and Dockerfiles
- Structured the OpenAI prompts to return reliable JSON via `response_format: json_object`
- Designed the polling pattern: POST /search → task_id → GET /tasks/{id} every 2.5s

**Where Claude struggled / what needed iteration:**
- **Celery import paths** — the initial `celery -A` command used the wrong module path. Had to fix from `app.tasks` to the correct invocation.
- **Pydantic v2 migration** — generated some Pydantic v1-style code (`.Config` class, `orm_mode`) that needed updating to v2 (`model_config`, `from_attributes`).
- **Vite proxy in Docker** — initial vite.config.js pointed to `http://localhost:8000` which doesn't resolve inside Docker. Fixed by reading `BACKEND_URL` from env.
- **python-jobspy NaN handling** — the scraper initially stored literal "nan" strings from pandas into the database. Added a `_clean()` helper to strip these.
- **LinkedIn blocking** — there's no code-level fix for LinkedIn's bot detection. The library (`python-jobspy`) does its best, but results may be empty on heavily throttled IPs. Documented in the README.

---

## Summary Table

| Feature | Model | Tokens/call (est.) | Works reliably? | Main failure mode |
|---|---|---|---|---|
| Job Analysis | gpt-4o-mini | ~700 in + 500 out | Yes | Salary estimate invented when no signal |
| Resume Match | gpt-4o-mini | ~900 in + 500 out | Mostly | Scores too optimistic |
| Cover Letter | gpt-4o-mini | ~700 in + 450 out | Yes | Generic without background |
| Search Suggest | gpt-4o-mini | ~100 in + 80 out | Yes | Niche titles not real postings |
| Code generation | Claude Sonnet | — | Mostly | Pydantic v2 + Docker networking |

---

*Last updated: 2026-05-14*
