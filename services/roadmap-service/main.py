"""SkillForge roadmap-service.

Calls the skill-service for a gap analysis, then asks Lovable AI to compose a
staged learning roadmap: current level -> gaps -> topics -> projects ->
resources -> target role.
"""

import json
import os
from typing import Any, Dict, List

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="SkillForge Roadmap Service", version="1.0.0")

SKILL_SERVICE_URL = os.environ.get("SKILL_SERVICE_URL", "http://skill-service:8001")
GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/responses"
MODEL = "openai/gpt-5.6-sol"


class Skill(BaseModel):
    name: str
    level: int
    domain: str = "programming"


class RoadmapRequest(BaseModel):
    skills: List[Skill]
    target_role: str = "AI Engineer"
    education: str = ""
    interests: str = ""


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


def _stream_text(payload: Dict[str, Any], api_key: str) -> str:
    """Every gateway call streams; accumulate output_text deltas."""
    chunks: List[str] = []
    with httpx.stream(
        "POST",
        GATEWAY_URL,
        json=payload,
        headers={
            "Content-Type": "application/json",
            "Lovable-API-Key": api_key,
            "X-Lovable-AIG-SDK": "fetch",
        },
        timeout=None,
    ) as response:
        if response.status_code != 200:
            response.read()
            raise HTTPException(status_code=response.status_code, detail=response.text)
        for line in response.iter_lines():
            if not line.startswith("data: "):
                continue
            try:
                event = json.loads(line[6:])
            except json.JSONDecodeError:
                continue
            if event.get("type") == "response.output_text.delta":
                chunks.append(event.get("delta", ""))
    return "".join(chunks)


@app.post("/roadmap")
def roadmap(req: RoadmapRequest) -> dict:
    api_key = os.environ.get("LOVABLE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="LOVABLE_API_KEY is not configured")

    analysis = httpx.post(
        f"{SKILL_SERVICE_URL}/analyze",
        json={"skills": [s.model_dump() for s in req.skills], "target_role": req.target_role},
        timeout=30,
    ).json()

    prompt = (
        f"Student target role: {req.target_role}\n"
        f"Education: {req.education}\nInterests: {req.interests}\n"
        f"Skill analysis: {json.dumps(analysis)}\n\n"
        "Produce a JSON roadmap with keys: summary (string), steps (array of "
        "{stage, title, detail, topics[], projects[], resources[]}). "
        "Use 4-6 stages ordered from foundations to job-ready. Return JSON only."
    )

    text = _stream_text(
        {
            "model": MODEL,
            "input": prompt,
            "stream": True,
            "reasoning": {"effort": "medium", "summary": "auto"},
        },
        api_key,
    )

    try:
        plan = json.loads(text[text.index("{"): text.rindex("}") + 1])
    except (ValueError, json.JSONDecodeError):
        plan = {"summary": text, "steps": []}

    return {"analysis": analysis, "roadmap": plan}
