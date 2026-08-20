import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Loader2, Send, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { askAssistant, askCareerAgent } from "@/lib/ai.functions";

type Turn = { role: "user" | "assistant"; content: string; sources?: { title: string; url: string | null }[] };
type Trace = { tool: string; input: string; summary: string };

function Markdownish({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {text.split("\n").map((line, i) => {
        const clean = line.replace(/\*\*/g, "");
        if (!clean.trim()) return null;
        if (/^#{1,4}\s/.test(clean))
          return (
            <p key={i} className="font-display font-semibold">
              {clean.replace(/^#{1,4}\s/, "")}
            </p>
          );
        if (/^\s*[-*]\s/.test(clean))
          return (
            <p key={i} className="pl-4">
              · {clean.replace(/^\s*[-*]\s/, "")}
            </p>
          );
        return <p key={i}>{clean}</p>;
      })}
    </div>
  );
}

export function AssistantPanel() {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [agentRequest, setAgentRequest] = useState("Analyze my profile and tell me what I should learn next.");
  const [agentAnswer, setAgentAnswer] = useState<string>("");
  const [trace, setTrace] = useState<Trace[]>([]);

  const ask = useServerFn(askAssistant);
  const agent = useServerFn(askCareerAgent);

  const askMutation = useMutation({
    mutationFn: async (q: string) => ask({ data: { question: q } }),
    onSuccess: (res) => setTurns((t) => [...t, { role: "assistant", content: res.answer, sources: res.sources }]),
    onError: (e: Error) => toast.error(e.message),
  });

  const agentMutation = useMutation({
    mutationFn: async () => agent({ data: { request: agentRequest } }),
    onSuccess: (res) => {
      setAgentAnswer(res.answer);
      setTrace(res.trace as Trace[]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Tabs defaultValue="rag">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="rag">RAG assistant</TabsTrigger>
        <TabsTrigger value="agent">Career agent</TabsTrigger>
      </TabsList>

      <TabsContent value="rag" className="pt-4">
        <Card className="surface-panel border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" /> Ask the career assistant
            </CardTitle>
            <CardDescription>
              Answers are grounded in the SkillForge knowledge base of courses, projects and career roadmaps.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {turns.map((t, i) => (
                <div
                  key={i}
                  className={
                    t.role === "user"
                      ? "rounded-lg border border-border/70 bg-secondary/50 p-3"
                      : "rounded-lg border border-primary/30 bg-card/70 p-3"
                  }
                >
                  <Markdownish text={t.content} />
                  {t.sources && t.sources.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {t.sources.map((s) => (
                        <Badge key={s.title} variant="outline">
                          {s.title}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {askMutation.isPending && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Retrieving from the knowledge base…
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Textarea
                rows={2}
                placeholder="I know Python and basic web development. I want to become an AI engineer. What should I learn next?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <Button
                onClick={() => {
                  const q = question.trim();
                  if (!q) return;
                  setTurns((t) => [...t, { role: "user", content: q }]);
                  setQuestion("");
                  askMutation.mutate(q);
                }}
                disabled={askMutation.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="agent" className="pt-4">
        <Card className="surface-panel border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-accent" /> Career planning agent
            </CardTitle>
            <CardDescription>
              Tools: analyze_student_skills · generate_skill_gap · search_learning_resources · create_roadmap
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea rows={2} value={agentRequest} onChange={(e) => setAgentRequest(e.target.value)} />
            <Button onClick={() => agentMutation.mutate()} disabled={agentMutation.isPending}>
              {agentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Run agent
            </Button>

            {trace.length > 0 && (
              <div className="space-y-2 rounded-lg border border-border/70 bg-card/60 p-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Agent tool trace</p>
                {trace.map((t, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Badge variant="secondary">{t.tool}</Badge>
                    <span className="text-muted-foreground">{t.summary}</span>
                  </div>
                ))}
              </div>
            )}

            {agentAnswer && (
              <div className="rounded-lg border border-accent/30 bg-card/70 p-3">
                <Markdownish text={agentAnswer} />
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
