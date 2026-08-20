"""SkillForge skill-service.

Stateless microservice that scores a student's skill inventory and computes
the gap between the current profile and a target role blueprint.
"""

from typing import Dict, List

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="SkillForge Skill Service", version="1.0.0")

ROLE_BLUEPRINTS: Dict[str, Dict[str, int]] = {
    "AI Engineer": {
        "Python": 5, "Machine Learning": 4, "Deep Learning": 4, "NLP": 3,
        "SQL": 3, "Docker": 3, "Git": 4, "APIs": 4,
    },
    "Full Stack Developer": {
        "JavaScript": 5, "React": 4, "Node.js": 4, "SQL": 4,
        "HTML/CSS": 4, "Git": 4, "APIs": 4, "Docker": 3,
    },
    "DevOps Engineer": {
        "Linux": 4, "Docker": 5, "Kubernetes": 4, "CI/CD": 4,
        "Terraform": 3, "Cloud": 4, "Git": 4, "Monitoring": 3,
    },
    "Data Engineer": {
        "Python": 4, "SQL": 5, "ETL": 4, "Spark": 3,
        "Cloud": 3, "Docker": 3, "Git": 4, "Data Modeling": 4,
    },
    "Backend Developer": {
        "Python": 4, "APIs": 5, "SQL": 4, "Testing": 3,
        "Docker": 3, "Git": 4, "System Design": 3, "Caching": 3,
    },
}

DOMAIN_WEIGHTS = {
    "programming": 0.25,
    "web": 0.15,
    "data": 0.15,
    "ai": 0.20,
    "devops": 0.15,
    "tools": 0.10,
}


class Skill(BaseModel):
    name: str
    level: int          # 0-5
    domain: str = "programming"


class AnalyzeRequest(BaseModel):
    skills: List[Skill]
    target_role: str = "AI Engineer"


class Gap(BaseModel):
    skill: str
    current: int
    required: int
    priority: str


class AnalyzeResponse(BaseModel):
    score: int
    level: str
    domain_scores: Dict[str, int]
    gaps: List[Gap]
    strengths: List[str]


def _level(score: int) -> str:
    if score >= 75:
        return "advanced"
    if score >= 45:
        return "intermediate"
    return "beginner"


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/roles")
def roles() -> dict:
    return {"roles": sorted(ROLE_BLUEPRINTS)}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    domain_scores: Dict[str, int] = {}
    for domain in DOMAIN_WEIGHTS:
        in_domain = [s for s in req.skills if s.domain == domain]
        if in_domain:
            avg = sum(s.level for s in in_domain) / len(in_domain)
            domain_scores[domain] = round(avg / 5 * 100)
        else:
            domain_scores[domain] = 0

    score = round(sum(domain_scores[d] * w for d, w in DOMAIN_WEIGHTS.items()))

    blueprint = ROLE_BLUEPRINTS.get(req.target_role, ROLE_BLUEPRINTS["AI Engineer"])
    have = {s.name.lower(): s.level for s in req.skills}

    gaps: List[Gap] = []
    strengths: List[str] = []
    for skill, required in blueprint.items():
        current = have.get(skill.lower(), 0)
        if current >= required:
            strengths.append(skill)
            continue
        delta = required - current
        priority = "high" if delta >= 3 else "medium" if delta == 2 else "low"
        gaps.append(Gap(skill=skill, current=current, required=required, priority=priority))

    gaps.sort(key=lambda g: g.required - g.current, reverse=True)

    return AnalyzeResponse(
        score=score,
        level=_level(score),
        domain_scores=domain_scores,
        gaps=gaps,
        strengths=strengths,
    )
