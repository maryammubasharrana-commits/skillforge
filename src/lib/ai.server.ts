/**
 * Server-only AI helpers: Lovable AI Gateway (Responses API) calls,
 * RAG retrieval over the learning-resource knowledge base, and the
 * career-planning agent tool implementations.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateScore,
  categoryScores,
  experienceLabel,
  findBlueprint,
  identifyGaps,
  recommendTopics,
  type Gap,
  type SkillRow,
} from "./skill-analysis";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-5.6-sol";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, any, any>;

export type ResponseItem = Record<string, unknown>;

export type GatewayResult = {
  text: string;
  items: ResponseItem[];
  toolCalls: { name: string; args: string; callId: string }[];
};

function gatewayError(status: number, body: string): Error {
  if (status === 402) {
    return new Error(
      "The AI workspace is out of credits. Ask the app owner to top up Lovable AI credits to continue.",
    );
  }
  if (status === 429) {
    return new Error("The AI assistant is rate limited right now. Please try again in a moment.");
  }
  if (status === 403) {
    return new Error("AI access is blocked for this workspace. Ask an admin to re-enable Lovable AI.");
  }
  return new Error(`AI request failed (${status}): ${body.slice(0, 300)}`);
}

/**
 * Calls the gateway Responses API. Always streams (reasoning models run long)
 * and accumulates the final output text server-side.
 */
export async function callGateway(options: {
  input: ResponseItem[] | string;
  instructions?: string;
  tools?: ResponseItem[];
}): Promise<GatewayResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Missing LOVABLE_API_KEY configuration.");

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      input: options.input,
      ...(options.instructions ? { instructions: options.instructions } : {}),
      ...(options.tools ? { tools: options.tools } : {}),
      stream: true,
      store: false,
      reasoning: { effort: "low", summary: "auto" },
      include: ["reasoning.encrypted_content"],
    }),
  });

  if (!res.ok || !res.body) {
    throw gatewayError(res.status, await res.text().catch(() => ""));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let items: ResponseItem[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      let event: Record<string, unknown>;
      try {
        event = JSON.parse(payload);
      } catch {
        continue;
      }
      const type = event["type"];
      if (type === "response.output_text.delta" && typeof event["delta"] === "string") {
        text += event["delta"];
      }
      if (type === "response.completed" || type === "response.incomplete") {
        const response = event["response"] as Record<string, unknown> | undefined;
        if (response) {
          if (Array.isArray(response["output"])) items = response["output"] as ResponseItem[];
          if (typeof response["output_text"] === "string" && response["output_text"]) {
            text = response["output_text"] as string;
          }
        }
      }
      if (type === "error") {
        throw new Error(String((event["message"] as string) ?? "AI stream error"));
      }
    }
  }

  const toolCalls = items
    .filter((item) => item["type"] === "function_call")
    .map((item) => ({
      name: String(item["name"] ?? ""),
      args: String(item["arguments"] ?? "{}"),
      callId: String(item["call_id"] ?? ""),
    }));

  return { text, items, toolCalls };
}

/* ------------------------------------------------------------------ */
/* Student context                                                     */
/* ------------------------------------------------------------------ */

export type StudentContext = {
  profile: {
    full_name: string;
    education: string;
    career_goal: string;
    experience_level: string;
    bio: string;
  } | null;
  skills: SkillRow[];
  projects: { title: string; description: string; tech_stack: string }[];
  certifications: { name: string; issuer: string }[];
  assessment: { score: number; total: number; breakdown: Record<string, number> } | null;
};

export async function loadStudentContext(
  supabase: AnySupabase,
  userId: string,
): Promise<StudentContext> {
  const [profile, skills, projects, certs, results] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("skills").select("name, category, level").eq("user_id", userId),
    supabase.from("projects").select("title, description, tech_stack").eq("user_id", userId),
    supabase.from("certifications").select("name, issuer").eq("user_id", userId),
    supabase
      .from("assessment_results")
      .select("score, total, breakdown")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  return {
    profile: (profile.data as StudentContext["profile"]) ?? null,
    skills: (skills.data as SkillRow[]) ?? [],
    projects: (projects.data as StudentContext["projects"]) ?? [],
    certifications: (certs.data as StudentContext["certifications"]) ?? [],
    assessment: (results.data?.[0] as StudentContext["assessment"]) ?? null,
  };
}

export function describeStudent(ctx: StudentContext): string {
  const skills = ctx.skills.length
    ? ctx.skills.map((s) => `${s.name} [${s.category}] level ${s.level}/5`).join("; ")
    : "no skills recorded yet";
  const projects = ctx.projects.length
    ? ctx.projects.map((p) => `${p.title} (${p.tech_stack})`).join("; ")
    : "no projects yet";
  const score = calculateScore(ctx.skills);
  return [
    `Name: ${ctx.profile?.full_name || "Unknown"}`,
    `Education: ${ctx.profile?.education || "not provided"}`,
    `Stated career goal: ${ctx.profile?.career_goal || "not set"}`,
    `Self-reported experience level: ${ctx.profile?.experience_level || "beginner"}`,
    `Skills: ${skills}`,
    `Projects: ${projects}`,
    `Certifications: ${ctx.certifications.map((c) => c.name).join("; ") || "none"}`,
    `Computed skill score: ${score}/100 (${experienceLabel(score)})`,
    `Latest assessment: ${
      ctx.assessment ? `${ctx.assessment.score}/${ctx.assessment.total}` : "not taken"
    }`,
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/* RAG retrieval over the resources knowledge base                     */
/* ------------------------------------------------------------------ */

export type Resource = {
  id: string;
  title: string;
  category: string;
  level: string;
  kind: string;
  url: string | null;
  content: string;
};

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "to", "for", "of", "in", "on", "with", "what", "how",
  "should", "i", "my", "me", "learn", "next", "want", "become", "is", "are", "do", "can",
]);

export function scoreResource(resource: Resource, terms: string[]): number {
  const haystack =
    `${resource.title} ${resource.category} ${resource.kind} ${resource.level} ${resource.content}`.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (!term) continue;
    if (resource.title.toLowerCase().includes(term)) score += 3;
    if (resource.category.toLowerCase().includes(term)) score += 2;
    if (haystack.includes(term)) score += 1;
  }
  return score;
}

export async function retrieveResources(
  supabase: AnySupabase,
  query: string,
  limit = 6,
): Promise<Resource[]> {
  const { data } = await supabase
    .from("resources")
    .select("id, title, category, level, kind, url, content");
  const all = (data as Resource[]) ?? [];
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));

  const ranked = all
    .map((r) => ({ r, score: scoreResource(r, terms) }))
    .sort((a, b) => b.score - a.score);

  const hits = ranked.filter((x) => x.score > 0).slice(0, limit).map((x) => x.r);
  return hits.length ? hits : all.slice(0, limit);
}

export function formatKnowledge(resources: Resource[]): string {
  return resources
    .map(
      (r, i) =>
        `[${i + 1}] ${r.title} — category: ${r.category}, level: ${r.level}, type: ${r.kind}${
          r.url ? `, url: ${r.url}` : ""
        }\n${r.content}`,
    )
    .join("\n\n");
}

/* ------------------------------------------------------------------ */
/* Roadmap generation                                                  */
/* ------------------------------------------------------------------ */

export type RoadmapStep = {
  stage: string;
  title: string;
  detail: string;
  topics: string[];
  projects: string[];
  resources: string[];
};

export type RoadmapPayload = {
  target_role: string;
  current_level: string;
  summary: string;
  gaps: Gap[];
  steps: RoadmapStep[];
};

function safeJson(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1]! : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function buildRoadmap(
  supabase: AnySupabase,
  userId: string,
  targetRole: string,
): Promise<RoadmapPayload> {
  const ctx = await loadStudentContext(supabase, userId);
  const role = targetRole || ctx.profile?.career_goal || "AI Engineer";
  const blueprint = findBlueprint(role);
  const gaps = identifyGaps(ctx.skills, role);
  const score = calculateScore(ctx.skills);
  const level = experienceLabel(score);
  const resources = await retrieveResources(
    supabase,
    `${role} ${gaps.map((g) => g.skill).join(" ")}`,
    10,
  );

  const result = await callGateway({
    instructions:
      "You are SkillForge, a career planning engine for technology students. " +
      "You must ground every recommendation in the provided knowledge base. " +
      "Reply with JSON only, no prose, no code fences.",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              `STUDENT PROFILE\n${describeStudent(ctx)}\n\n` +
              `TARGET ROLE: ${blueprint.role} — ${blueprint.description}\n` +
              `ROLE REQUIREMENTS: ${blueprint.requirements
                .map((r) => `${r.skill} level ${r.level}/5`)
                .join(", ")}\n\n` +
              `COMPUTED SKILL GAPS: ${
                gaps.map((g) => `${g.skill} ${g.current}->${g.required}`).join(", ") || "none"
              }\n\n` +
              `KNOWLEDGE BASE\n${formatKnowledge(resources)}\n\n` +
              `Produce a staged career roadmap with 4 to 6 stages going from the student's current level to the target role. ` +
              `Return JSON of shape: {"summary": string, "current_level": string, "steps": [{"stage": string, "title": string, "detail": string, "topics": string[], "projects": string[], "resources": string[]}]}. ` +
              `Each "resources" entry must be the exact title of a knowledge base item above. Keep detail under 300 characters.`,
          },
        ],
      },
    ],
  });

  const parsed = safeJson(result.text);
  const steps = Array.isArray(parsed?.["steps"])
    ? (parsed!["steps"] as RoadmapStep[]).map((s) => ({
        stage: String(s.stage ?? ""),
        title: String(s.title ?? ""),
        detail: String(s.detail ?? ""),
        topics: Array.isArray(s.topics) ? s.topics.map(String) : [],
        projects: Array.isArray(s.projects) ? s.projects.map(String) : [],
        resources: Array.isArray(s.resources) ? s.resources.map(String) : [],
      }))
    : [];

  const payload: RoadmapPayload = {
    target_role: blueprint.role,
    current_level: String(parsed?.["current_level"] ?? level),
    summary: String(parsed?.["summary"] ?? result.text.slice(0, 600)),
    gaps,
    steps: steps.length
      ? steps
      : [
          {
            stage: "Stage 1",
            title: "Close your highest-impact gaps",
            detail: "Focus on the skills with the largest distance from the role requirement.",
            topics: recommendTopics(gaps),
            projects: resources.filter((r) => r.kind === "project").map((r) => r.title),
            resources: resources.slice(0, 4).map((r) => r.title),
          },
        ],
  };

  await supabase.from("roadmaps").insert({
    user_id: userId,
    target_role: payload.target_role,
    current_level: payload.current_level,
    gaps: payload.gaps,
    steps: payload.steps,
    summary: payload.summary,
  });

  return payload;
}

/* ------------------------------------------------------------------ */
/* RAG assistant                                                       */
/* ------------------------------------------------------------------ */

export async function answerWithRag(
  supabase: AnySupabase,
  userId: string,
  question: string,
): Promise<{ answer: string; sources: { title: string; url: string | null }[] }> {
  const ctx = await loadStudentContext(supabase, userId);
  const resources = await retrieveResources(
    supabase,
    `${question} ${ctx.profile?.career_goal ?? ""}`,
    8,
  );

  const history = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("user_id", userId)
    .eq("mode", "rag")
    .order("created_at", { ascending: false })
    .limit(8);

  const priorTurns = ((history.data as { role: string; content: string }[]) ?? [])
    .slice()
    .reverse()
    .map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: [
        {
          type: m.role === "assistant" ? "output_text" : "input_text",
          text: m.content,
        },
      ],
    }));

  const result = await callGateway({
    instructions:
      "You are the SkillForge career assistant. Answer ONLY using the knowledge base excerpts provided. " +
      "If the knowledge base does not cover something, say so explicitly. " +
      "Cite the resources you used by title. Answer in concise markdown.",
    input: [
      ...priorTurns,
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              `STUDENT PROFILE\n${describeStudent(ctx)}\n\n` +
              `KNOWLEDGE BASE\n${formatKnowledge(resources)}\n\n` +
              `QUESTION: ${question}`,
          },
        ],
      },
    ],
  });

  const answer = result.text.trim() || "I could not produce an answer for that question.";

  await supabase.from("chat_messages").insert([
    { user_id: userId, role: "user", content: question, mode: "rag" },
    { user_id: userId, role: "assistant", content: answer, mode: "rag" },
  ]);

  return {
    answer,
    sources: resources.slice(0, 5).map((r) => ({ title: r.title, url: r.url })),
  };
}

/* ------------------------------------------------------------------ */
/* Career planning agent (tool calling loop)                           */
/* ------------------------------------------------------------------ */

const AGENT_TOOLS: ResponseItem[] = [
  {
    type: "function",
    name: "analyze_student_skills",
    description: "Retrieve the student's profile, skills, projects and computed skill score.",
    strict: true,
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
  {
    type: "function",
    name: "search_learning_resources",
    description: "Search the SkillForge knowledge base of courses, projects and career roadmaps.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search keywords" },
        category: {
          type: ["string", "null"],
          description: "Optional category filter such as Python, AI, DevOps, Database",
        },
      },
      required: ["query", "category"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "generate_skill_gap",
    description: "Compute the gap between the student's skills and a target role's requirements.",
    strict: true,
    parameters: {
      type: "object",
      properties: { target_role: { type: "string" } },
      required: ["target_role"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "create_roadmap",
    description: "Generate and persist a staged career roadmap for the student's target role.",
    strict: true,
    parameters: {
      type: "object",
      properties: { target_role: { type: "string" } },
      required: ["target_role"],
      additionalProperties: false,
    },
  },
];

export type AgentTrace = { tool: string; input: unknown; summary: string };

async function runAgentTool(
  supabase: AnySupabase,
  userId: string,
  name: string,
  args: Record<string, unknown>,
): Promise<{ output: unknown; summary: string }> {
  if (name === "analyze_student_skills") {
    const ctx = await loadStudentContext(supabase, userId);
    const score = calculateScore(ctx.skills);
    return {
      output: {
        profile: ctx.profile,
        skills: ctx.skills,
        projects: ctx.projects,
        score,
        level: experienceLabel(score),
        category_scores: categoryScores(ctx.skills),
      },
      summary: `Analyzed ${ctx.skills.length} skills — score ${score}/100 (${experienceLabel(score)}).`,
    };
  }
  if (name === "search_learning_resources") {
    const query = String(args["query"] ?? "");
    const category = args["category"] ? String(args["category"]) : null;
    const found = await retrieveResources(supabase, `${query} ${category ?? ""}`, 6);
    return {
      output: found.map((r) => ({
        title: r.title,
        category: r.category,
        level: r.level,
        kind: r.kind,
        url: r.url,
        summary: r.content.slice(0, 240),
      })),
      summary: `Found ${found.length} knowledge base resources for "${query}".`,
    };
  }
  if (name === "generate_skill_gap") {
    const role = String(args["target_role"] ?? "AI Engineer");
    const ctx = await loadStudentContext(supabase, userId);
    const gaps = identifyGaps(ctx.skills, role);
    return {
      output: { target_role: findBlueprint(role).role, gaps },
      summary: `Identified ${gaps.length} skill gaps for ${findBlueprint(role).role}.`,
    };
  }
  if (name === "create_roadmap") {
    const role = String(args["target_role"] ?? "AI Engineer");
    const roadmap = await buildRoadmap(supabase, userId, role);
    return {
      output: roadmap,
      summary: `Created a ${roadmap.steps.length}-stage roadmap for ${roadmap.target_role}.`,
    };
  }
  return { output: { error: "unknown tool" }, summary: `Unknown tool ${name}.` };
}

export async function runCareerAgent(
  supabase: AnySupabase,
  userId: string,
  request: string,
): Promise<{ answer: string; trace: AgentTrace[] }> {
  const input: ResponseItem[] = [
    {
      role: "user",
      content: [{ type: "input_text", text: request }],
    },
  ];
  const trace: AgentTrace[] = [];

  for (let step = 0; step < 6; step += 1) {
    const result = await callGateway({
      instructions:
        "You are the SkillForge Career Planning Agent. Use your tools to gather real data before advising. " +
        "Typical plan: analyze_student_skills, then generate_skill_gap, then search_learning_resources, then create_roadmap. " +
        "Never invent resources: only recommend ones returned by search_learning_resources. " +
        "Finish with a concise markdown answer covering current level, gaps, next topics, projects and resources.",
      input,
      tools: AGENT_TOOLS,
    });

    input.push(...result.items);

    if (result.toolCalls.length === 0) {
      return {
        answer: result.text.trim() || "The agent finished without producing a summary.",
        trace,
      };
    }

    for (const call of result.toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.args) as Record<string, unknown>;
      } catch {
        args = {};
      }
      const { output, summary } = await runAgentTool(supabase, userId, call.name, args);
      trace.push({ tool: call.name, input: args, summary });
      input.push({
        type: "function_call_output",
        call_id: call.callId,
        output: JSON.stringify(output).slice(0, 12000),
      });
    }
  }

  return {
    answer: "The agent reached its step limit. Try asking a more specific question.",
    trace,
  };
}
