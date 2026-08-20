/**
 * Shared skill analysis logic (TypeScript mirror of the Python
 * `python-service/skillforge/analyzer.py` SkillAnalyzer / SkillGapCalculator).
 */

export type SkillRow = { name: string; category: string; level: number };

export type Gap = {
  skill: string;
  category: string;
  required: number;
  current: number;
  gap: number;
};

export const SKILL_CATEGORIES = [
  "Python",
  "Web Development",
  "Git",
  "DevOps",
  "AI",
  "Database",
] as const;

export type RoleBlueprint = {
  role: string;
  description: string;
  requirements: { skill: string; category: string; level: number }[];
};

export const ROLE_BLUEPRINTS: RoleBlueprint[] = [
  {
    role: "AI Engineer",
    description: "Builds and ships machine learning and LLM-powered systems.",
    requirements: [
      { skill: "Python", category: "Python", level: 5 },
      { skill: "Object-Oriented Programming", category: "Python", level: 4 },
      { skill: "Machine Learning", category: "AI", level: 4 },
      { skill: "Deep Learning", category: "AI", level: 4 },
      { skill: "LLMs & RAG", category: "AI", level: 4 },
      { skill: "SQL", category: "Database", level: 3 },
      { skill: "Git", category: "Git", level: 3 },
      { skill: "Docker", category: "DevOps", level: 3 },
      { skill: "REST APIs", category: "Web Development", level: 3 },
    ],
  },
  {
    role: "Full Stack Developer",
    description: "Builds complete web products, front end through database.",
    requirements: [
      { skill: "JavaScript / TypeScript", category: "Web Development", level: 5 },
      { skill: "React", category: "Web Development", level: 4 },
      { skill: "REST APIs", category: "Web Development", level: 4 },
      { skill: "SQL", category: "Database", level: 4 },
      { skill: "Authentication", category: "Web Development", level: 3 },
      { skill: "Git", category: "Git", level: 4 },
      { skill: "Docker", category: "DevOps", level: 3 },
      { skill: "Python", category: "Python", level: 2 },
    ],
  },
  {
    role: "DevOps Engineer",
    description: "Automates build, deployment and infrastructure operations.",
    requirements: [
      { skill: "Linux & Shell", category: "DevOps", level: 5 },
      { skill: "Docker", category: "DevOps", level: 5 },
      { skill: "Kubernetes", category: "DevOps", level: 4 },
      { skill: "Terraform", category: "DevOps", level: 4 },
      { skill: "CI/CD", category: "DevOps", level: 4 },
      { skill: "Git", category: "Git", level: 5 },
      { skill: "Python", category: "Python", level: 3 },
      { skill: "SQL", category: "Database", level: 2 },
    ],
  },
  {
    role: "Data Engineer",
    description: "Designs data pipelines and warehouses at scale.",
    requirements: [
      { skill: "SQL", category: "Database", level: 5 },
      { skill: "Data Modeling", category: "Database", level: 4 },
      { skill: "Python", category: "Python", level: 4 },
      { skill: "ETL Pipelines", category: "Database", level: 4 },
      { skill: "Docker", category: "DevOps", level: 3 },
      { skill: "Git", category: "Git", level: 3 },
      { skill: "Machine Learning", category: "AI", level: 2 },
    ],
  },
  {
    role: "Backend Developer",
    description: "Builds reliable server-side services and APIs.",
    requirements: [
      { skill: "Python", category: "Python", level: 4 },
      { skill: "REST APIs", category: "Web Development", level: 4 },
      { skill: "SQL", category: "Database", level: 4 },
      { skill: "Object-Oriented Programming", category: "Python", level: 4 },
      { skill: "Git", category: "Git", level: 4 },
      { skill: "Docker", category: "DevOps", level: 3 },
    ],
  },
];

export function findBlueprint(targetRole: string): RoleBlueprint {
  const normalized = targetRole.trim().toLowerCase();
  return (
    ROLE_BLUEPRINTS.find((b) => b.role.toLowerCase() === normalized) ??
    ROLE_BLUEPRINTS.find((b) => normalized.includes(b.role.toLowerCase().split(" ")[0]!)) ??
    ROLE_BLUEPRINTS[0]!
  );
}

/** Weighted score 0-100 across the six assessment categories. */
export function calculateScore(skills: SkillRow[]): number {
  if (skills.length === 0) return 0;
  const byCategory = new Map<string, number[]>();
  for (const s of skills) {
    const list = byCategory.get(s.category) ?? [];
    list.push(Math.min(5, Math.max(0, s.level)));
    byCategory.set(s.category, list);
  }
  let total = 0;
  for (const category of SKILL_CATEGORIES) {
    const levels = byCategory.get(category) ?? [];
    const best = levels.length ? Math.max(...levels) : 0;
    total += (best / 5) * (100 / SKILL_CATEGORIES.length);
  }
  return Math.round(total);
}

export function categoryScores(skills: SkillRow[]): { category: string; score: number }[] {
  return SKILL_CATEGORIES.map((category) => {
    const levels = skills.filter((s) => s.category === category).map((s) => s.level);
    const best = levels.length ? Math.max(...levels) : 0;
    return { category, score: Math.round((best / 5) * 100) };
  });
}

export function identifyGaps(skills: SkillRow[], targetRole: string): Gap[] {
  const blueprint = findBlueprint(targetRole);
  return blueprint.requirements
    .map((req) => {
      const match = skills.find(
        (s) =>
          s.name.trim().toLowerCase() === req.skill.toLowerCase() ||
          req.skill.toLowerCase().includes(s.name.trim().toLowerCase()),
      );
      const current = match ? match.level : 0;
      return {
        skill: req.skill,
        category: req.category,
        required: req.level,
        current,
        gap: Math.max(0, req.level - current),
      };
    })
    .filter((g) => g.gap > 0)
    .sort((a, b) => b.gap - a.gap);
}

export function experienceLabel(score: number): string {
  if (score >= 75) return "Advanced";
  if (score >= 45) return "Intermediate";
  if (score >= 20) return "Beginner";
  return "Explorer";
}

export function recommendTopics(gaps: Gap[], limit = 6): string[] {
  return gaps.slice(0, limit).map((g) => `${g.skill} (level ${g.current} → ${g.required})`);
}
