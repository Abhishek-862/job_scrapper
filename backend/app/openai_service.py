import json
import logging
from openai import OpenAI
from .config import settings

logger = logging.getLogger(__name__)


def _client() -> OpenAI:
    return OpenAI(api_key=settings.openai_api_key)


def analyze_job(description: str, title: str, company: str) -> dict:
    prompt = f"""Analyze this job posting. Return ONLY valid JSON — no markdown, no extra text.

Job Title: {title}
Company: {company}
Description:
{description[:3000]}

JSON schema (use exactly these keys):
{{
  "summary": "2-3 sentence plain-English summary of the role",
  "key_skills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "seniority": "junior | mid | senior | lead | staff",
  "salary_estimate": "estimated range as a string, e.g. USD 120,000 – 160,000",
  "why_apply": ["top reason 1", "top reason 2", "top reason 3"],
  "red_flags": ["potential concern 1"]
}}"""

    try:
        resp = _client().chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_tokens=600,
        )
        return json.loads(resp.choices[0].message.content)
    except Exception as e:
        logger.error("analyze_job failed: %s", e)
        return {"error": str(e)}


def match_resume(description: str, title: str, resume_text: str) -> dict:
    prompt = f"""You are a senior recruiter. Score how well this candidate fits this job.

Job: {title}
Description:
{description[:2000]}

Candidate Background:
{resume_text[:1500]}

Return ONLY valid JSON:
{{
  "fit_score": <integer 0-100>,
  "strengths": ["match point 1", "match point 2", "match point 3"],
  "gaps": ["gap 1", "gap 2"],
  "recommendation": "one sentence — should they apply?",
  "how_to_pitch": "one paragraph on how to frame their application for this specific role"
}}"""

    try:
        resp = _client().chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_tokens=600,
        )
        return json.loads(resp.choices[0].message.content)
    except Exception as e:
        logger.error("match_resume failed: %s", e)
        return {"error": str(e)}


def generate_cover_letter(description: str, title: str, company: str, background: str) -> str:
    candidate_context = background.strip() if background.strip() else "a motivated professional seeking this role"
    prompt = f"""Write a professional, concise cover letter for this application. Do NOT include placeholder brackets.

Job: {title} at {company}
Description:
{description[:2000]}

Applicant Background:
{candidate_context[:1000]}

Instructions:
- 3 paragraphs, under 280 words total
- Para 1: genuine opening — why this role at this company
- Para 2: 2 specific skills or achievements that match the job
- Para 3: confident closing with call to action
- Write it ready to send — no [Your Name] placeholders"""

    try:
        resp = _client().chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        logger.error("generate_cover_letter failed: %s", e)
        return f"Error generating cover letter: {e}"


def enhance_search(query: str) -> list:
    prompt = f"""A job seeker wants to find roles similar to: "{query}"

Suggest 4 specific, realistic job title variations that recruiters actually post — not generic terms.
Return ONLY valid JSON: {{"suggestions": ["title1", "title2", "title3", "title4"]}}"""

    try:
        resp = _client().chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_tokens=120,
        )
        return json.loads(resp.choices[0].message.content).get("suggestions", [])
    except Exception as e:
        logger.error("enhance_search failed: %s", e)
        return []
