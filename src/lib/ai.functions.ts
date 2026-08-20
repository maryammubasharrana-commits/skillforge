import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { answerWithRag, buildRoadmap, runCareerAgent } from "./ai.server";

export const generateRoadmap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { targetRole: string }) => ({
    targetRole: String(data?.targetRole ?? "").slice(0, 120),
  }))
  .handler(async ({ data, context }) => {
    return buildRoadmap(context.supabase, context.userId, data.targetRole);
  });

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { question: string }) => ({
    question: String(data?.question ?? "").slice(0, 2000),
  }))
  .handler(async ({ data, context }) => {
    return answerWithRag(context.supabase, context.userId, data.question);
  });

export const askCareerAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { request: string }) => ({
    request: String(data?.request ?? "Analyze my profile and tell me what I should learn next.").slice(
      0,
      2000,
    ),
  }))
  .handler(async ({ data, context }) => {
    return runCareerAgent(context.supabase, context.userId, data.request);
  });
