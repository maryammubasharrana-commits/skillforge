import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/use-session";

export const Route = createFileRoute("/mentor")({
  head: () => ({
    meta: [
      { title: "Mentor & Admin Console — SkillForge" },
      {
        name: "description",
        content: "Review student profiles, publish learning resources and author skill assessment questions.",
      },
      { property: "og:title", content: "Mentor & Admin Console — SkillForge" },
      { property: "og:description", content: "Review students, manage resources and assessments in SkillForge." },
    ],
  }),
  component: MentorConsole,
});

function MentorConsole() {
  const { user, isStaff, roles, loading } = useSession();
  const qc = useQueryClient();
  const [resource, setResource] = useState({
    title: "",
    category: "AI",
    level: "beginner",
    kind: "course",
    url: "",
    content: "",
  });
  const [question, setQuestion] = useState({ category: "Python", question: "", options: "", correct_index: "0" });

  const { data: students = [] } = useQuery({
    queryKey: ["mentor-students"],
    enabled: isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, education, career_goal, experience_level");
      if (error) throw error;
      return data;
    },
  });

  const { data: skills = [] } = useQuery({
    queryKey: ["mentor-skills"],
    enabled: isStaff,
    queryFn: async () => {
      const { data } = await supabase.from("skills").select("user_id, name, level");
      return data ?? [];
    },
  });

  const { data: resources = [] } = useQuery({
    queryKey: ["mentor-resources"],
    queryFn: async () => {
      const { data } = await supabase.from("resources").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const addResource = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("resources")
        .insert({ ...resource, url: resource.url || null, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Resource added to the knowledge base");
      setResource({ title: "", category: "AI", level: "beginner", kind: "course", url: "", content: "" });
      qc.invalidateQueries({ queryKey: ["mentor-resources"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addQuestion = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("assessment_questions").insert({
        category: question.category,
        question: question.question,
        options: question.options.split("|").map((o) => o.trim()),
        correct_index: Number(question.correct_index),
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Assessment question created");
      setQuestion({ category: "Python", question: "", options: "", correct_index: "0" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return <div className="min-h-screen"><AppHeader /></div>;

  if (!isStaff) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-2xl px-4 py-16">
          <Card className="surface-panel border-border/70">
            <CardHeader>
              <CardTitle>Mentor access required</CardTitle>
              <CardDescription>
                Your account role is {roles.join(", ") || "student"}. Ask an admin to grant you the mentor or admin role.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="font-display text-3xl font-semibold">Mentor &amp; admin console</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review students, curate the knowledge base and author assessments.</p>

        <Tabs defaultValue="students" className="mt-8">
          <TabsList>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="questions">Assessments</TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              {students.map((s) => (
                <Card key={s.id} className="surface-panel border-border/70">
                  <CardHeader>
                    <CardTitle className="text-lg">{s.full_name || "Unnamed student"}</CardTitle>
                    <CardDescription>
                      {s.education || "No education listed"} · goal: {s.career_goal || "not set"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{s.experience_level}</Badge>
                    {skills
                      .filter((k) => k.user_id === s.id)
                      .slice(0, 8)
                      .map((k, i) => (
                        <Badge key={i} variant="outline">
                          {k.name} {k.level}/5
                        </Badge>
                      ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="resources" className="pt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="surface-panel border-border/70">
                <CardHeader>
                  <CardTitle>Add learning resource</CardTitle>
                  <CardDescription>Everything here becomes RAG knowledge for the AI assistant.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={resource.title} onChange={(e) => setResource({ ...resource, title: e.target.value })} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Input placeholder="Category" value={resource.category} onChange={(e) => setResource({ ...resource, category: e.target.value })} />
                    <Input placeholder="Level" value={resource.level} onChange={(e) => setResource({ ...resource, level: e.target.value })} />
                    <Input placeholder="Kind (course/project/roadmap)" value={resource.kind} onChange={(e) => setResource({ ...resource, kind: e.target.value })} />
                  </div>
                  <Input placeholder="URL" value={resource.url} onChange={(e) => setResource({ ...resource, url: e.target.value })} />
                  <Textarea rows={4} placeholder="Description used for retrieval" value={resource.content} onChange={(e) => setResource({ ...resource, content: e.target.value })} />
                  <Button onClick={() => resource.title.trim() && addResource.mutate()}>Publish resource</Button>
                </CardContent>
              </Card>

              <Card className="surface-panel border-border/70">
                <CardHeader>
                  <CardTitle>Knowledge base</CardTitle>
                  <CardDescription>{resources.length} entries</CardDescription>
                </CardHeader>
                <CardContent className="max-h-[520px] space-y-2 overflow-y-auto">
                  {resources.map((r) => (
                    <div key={r.id} className="rounded-md border border-border/60 p-3 text-sm">
                      <p className="font-medium">{r.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.category} · {r.level} · {r.kind}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="questions" className="pt-6">
            <Card className="surface-panel border-border/70 max-w-2xl">
              <CardHeader>
                <CardTitle>Create assessment question</CardTitle>
                <CardDescription>Separate options with a pipe: A | B | C | D</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Category" value={question.category} onChange={(e) => setQuestion({ ...question, category: e.target.value })} />
                <Textarea rows={2} placeholder="Question" value={question.question} onChange={(e) => setQuestion({ ...question, question: e.target.value })} />
                <Input placeholder="Option A | Option B | Option C | Option D" value={question.options} onChange={(e) => setQuestion({ ...question, options: e.target.value })} />
                <Input placeholder="Correct option index (0-based)" value={question.correct_index} onChange={(e) => setQuestion({ ...question, correct_index: e.target.value })} />
                <Button onClick={() => question.question.trim() && addQuestion.mutate()}>Create question</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
