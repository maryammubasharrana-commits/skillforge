import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { generateRoadmap } from "@/lib/ai.functions";
import { ROLE_BLUEPRINTS } from "@/lib/skill-analysis";

type Step = { stage: string; title: string; detail: string; topics: string[]; projects: string[]; resources: string[] };
type Gap = { skill: string; current: number; required: number };
type Roadmap = {
  id: string;
  target_role: string;
  current_level: string;
  summary: string;
  gaps: Gap[];
  steps: Step[];
  created_at: string;
};

export function RoadmapPanel({ userId, careerGoal }: { userId: string; careerGoal: string }) {
  const qc = useQueryClient();
  const [role, setRole] = useState(careerGoal || "AI Engineer");
  const run = useServerFn(generateRoadmap);

  const { data: roadmap } = useQuery({
    queryKey: ["roadmap", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roadmaps")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0] as unknown as Roadmap) ?? null;
    },
  });

  const generate = useMutation({
    mutationFn: async () => run({ data: { targetRole: role } }),
    onSuccess: () => {
      toast.success("Roadmap generated");
      qc.invalidateQueries({ queryKey: ["roadmap", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Card className="surface-panel border-border/70">
        <CardHeader>
          <CardTitle>AI career roadmap</CardTitle>
          <CardDescription>
            Current level → skill gap → recommended topics → projects → resources → target role.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="w-full max-w-xs">
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_BLUEPRINTS.map((b) => (
                  <SelectItem key={b.role} value={b.role}>
                    {b.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
            {generate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate roadmap
          </Button>
        </CardContent>
      </Card>

      {roadmap && (
        <Card className="surface-panel border-border/70">
          <CardHeader>
            <CardTitle>Path to {roadmap.target_role}</CardTitle>
            <CardDescription>Current level: {roadmap.current_level}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">{roadmap.summary}</p>

            {roadmap.gaps?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {roadmap.gaps.map((g) => (
                  <Badge key={g.skill} variant="outline">
                    {g.skill} {g.current}→{g.required}
                  </Badge>
                ))}
              </div>
            )}

            <ol className="relative space-y-6 border-l border-border/70 pl-6">
              {roadmap.steps?.map((s, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <p className="text-xs uppercase tracking-wide text-accent">{s.stage}</p>
                  <p className="font-display text-lg font-semibold">{s.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.detail}</p>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Topics</p>
                      <ul className="mt-1 space-y-1">{s.topics?.map((t) => <li key={t}>· {t}</li>)}</ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Projects</p>
                      <ul className="mt-1 space-y-1">{s.projects?.map((t) => <li key={t}>· {t}</li>)}</ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Resources</p>
                      <ul className="mt-1 space-y-1">{s.resources?.map((t) => <li key={t}>· {t}</li>)}</ul>
                    </div>
                  </div>
                </li>
              ))}
              <li className="relative">
                <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
                  ★
                </span>
                <p className="font-display text-lg font-semibold gradient-text">{roadmap.target_role}</p>
              </li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
