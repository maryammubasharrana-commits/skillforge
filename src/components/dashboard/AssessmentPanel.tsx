import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

type Question = { id: string; category: string; question: string; options: string[]; correct_index: number };
type Result = { id: string; score: number; total: number; breakdown: Record<string, number>; created_at: string };

export function AssessmentPanel({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [started, setStarted] = useState(false);

  const { data: questions = [] } = useQuery({
    queryKey: ["questions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("assessment_questions").select("*").order("category");
      if (error) throw error;
      return (data ?? []).map((q) => ({ ...q, options: (q.options as string[]) ?? [] })) as Question[];
    },
  });

  const { data: results = [] } = useQuery({
    queryKey: ["results", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_results")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Result[];
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      const breakdown: Record<string, { correct: number; total: number }> = {};
      let score = 0;
      for (const q of questions) {
        const bucket = (breakdown[q.category] ??= { correct: 0, total: 0 });
        bucket.total += 1;
        if (answers[q.id] === q.correct_index) {
          bucket.correct += 1;
          score += 1;
        }
      }
      const percentages: Record<string, number> = {};
      for (const [cat, b] of Object.entries(breakdown)) {
        percentages[cat] = Math.round((b.correct / b.total) * 100);
      }
      const { error } = await supabase.from("assessment_results").insert({
        user_id: userId,
        score,
        total: questions.length,
        breakdown: percentages,
      });
      if (error) throw error;
      return score;
    },
    onSuccess: (score) => {
      toast.success(`Assessment scored ${score}/${questions.length}`);
      setStarted(false);
      setAnswers({});
      qc.invalidateQueries({ queryKey: ["results", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const latest = results[0];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="surface-panel border-border/70 lg:col-span-2">
        <CardHeader>
          <CardTitle>Skill assessment</CardTitle>
          <CardDescription>
            {questions.length} questions across Python, Web Development, Git, DevOps, AI and Database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!started ? (
            <Button onClick={() => setStarted(true)}>Take the assessment</Button>
          ) : (
            <>
              {questions.map((q, i) => (
                <div key={q.id} className="rounded-lg border border-border/70 bg-card/60 p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <p className="font-medium">
                      {i + 1}. {q.question}
                    </p>
                    <Badge variant="secondary">{q.category}</Badge>
                  </div>
                  <RadioGroup
                    value={answers[q.id]?.toString() ?? ""}
                    onValueChange={(v) => setAnswers((a) => ({ ...a, [q.id]: Number(v) }))}
                  >
                    {q.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <RadioGroupItem value={idx.toString()} id={`${q.id}-${idx}`} />
                        <Label htmlFor={`${q.id}-${idx}`} className="font-normal">
                          {opt}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))}
              <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
                Submit assessment
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="surface-panel border-border/70">
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>Your most recent assessment breakdown.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!latest && <p className="text-sm text-muted-foreground">No assessment taken yet.</p>}
          {latest && (
            <>
              <p className="font-display text-4xl font-semibold gradient-text">
                {latest.score}/{latest.total}
              </p>
              {Object.entries(latest.breakdown ?? {}).map(([cat, pct]) => (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{cat}</span>
                    <span className="text-muted-foreground">{pct}%</span>
                  </div>
                  <Progress value={pct} />
                </div>
              ))}
              <p className="pt-2 text-xs text-muted-foreground">{results.length} attempt(s) recorded.</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
