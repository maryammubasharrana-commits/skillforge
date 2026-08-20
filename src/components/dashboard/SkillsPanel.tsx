import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import {
  SKILL_CATEGORIES,
  calculateScore,
  categoryScores,
  experienceLabel,
  identifyGaps,
  type SkillRow,
} from "@/lib/skill-analysis";

type Skill = SkillRow & { id: string };

export function SkillsPanel({ userId, careerGoal }: { userId: string; careerGoal: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("Python");
  const [level, setLevel] = useState(3);

  const { data: skills = [] } = useQuery({
    queryKey: ["skills", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skills")
        .select("id, name, category, level")
        .eq("user_id", userId)
        .order("created_at");
      if (error) throw error;
      return data as Skill[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("skills").insert({ user_id: userId, name, category, level });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      qc.invalidateQueries({ queryKey: ["skills", userId] });
      toast.success("Skill added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("skills").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills", userId] }),
  });

  const score = calculateScore(skills);
  const gaps = identifyGaps(skills, careerGoal);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="surface-panel border-border/70 lg:col-span-2">
        <CardHeader>
          <CardTitle>Skill inventory</CardTitle>
          <CardDescription>Rate each skill from 1 (aware) to 5 (production ready).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_170px_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="skill">Skill</Label>
              <Input id="skill" placeholder="e.g. Python" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SKILL_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => name.trim() && add.mutate()} disabled={add.isPending}>
              Add skill
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Level: {level}/5</Label>
            <Slider value={[level]} min={1} max={5} step={1} onValueChange={(v) => setLevel(v[0] ?? 1)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {skills.map((s) => (
              <div key={s.id} className="rounded-lg border border-border/70 bg-card/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{s.level}/5</Badge>
                    <Button size="icon" variant="ghost" onClick={() => remove.mutate(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Progress className="mt-3" value={(s.level / 5) * 100} />
              </div>
            ))}
            {skills.length === 0 && (
              <p className="text-sm text-muted-foreground">No skills yet — add your first one above.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="surface-panel border-border/70">
          <CardHeader>
            <CardTitle>Skill score</CardTitle>
            <CardDescription>Weighted across the six SkillForge domains.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-display text-4xl font-semibold gradient-text">{score}</p>
              <p className="text-sm text-muted-foreground">{experienceLabel(score)} · out of 100</p>
            </div>
            {categoryScores(skills).map((c) => (
              <div key={c.category} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{c.category}</span>
                  <span className="text-muted-foreground">{c.score}%</span>
                </div>
                <Progress value={c.score} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="surface-panel border-border/70">
          <CardHeader>
            <CardTitle>Skill gaps</CardTitle>
            <CardDescription>Versus {careerGoal || "your target role"}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {gaps.length === 0 && <p className="text-sm text-muted-foreground">No gaps detected — add more skills or raise your target.</p>}
            {gaps.map((g) => (
              <div key={g.skill} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm">
                <span>{g.skill}</span>
                <span className="text-muted-foreground">
                  {g.current} → {g.required}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
