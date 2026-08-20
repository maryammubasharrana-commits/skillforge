import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { AssessmentPanel } from "@/components/dashboard/AssessmentPanel";
import { AssistantPanel } from "@/components/dashboard/AssistantPanel";
import { PortfolioPanel } from "@/components/dashboard/PortfolioPanel";
import { ProfilePanel } from "@/components/dashboard/ProfilePanel";
import { RoadmapPanel } from "@/components/dashboard/RoadmapPanel";
import { SkillsPanel } from "@/components/dashboard/SkillsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/use-session";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Student Dashboard — SkillForge" },
      {
        name: "description",
        content:
          "Track your skills, portfolio and assessment results, then generate an AI career roadmap to your target tech role.",
      },
      { property: "og:title", content: "Student Dashboard — SkillForge" },
      { property: "og:description", content: "Skills, assessments, roadmap and AI career assistant in one place." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/auth" });
  }, [loading, user, router]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <p className="p-8 text-sm text-muted-foreground">Loading your workspace…</p>
      </div>
    );
  }

  const careerGoal = (profile?.career_goal as string) || "AI Engineer";

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="font-display text-3xl font-semibold">
          Hi {profile?.full_name?.split(" ")[0] || "there"}, let&apos;s forge your path
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Target role: <span className="text-accent">{careerGoal}</span>
        </p>

        <Tabs defaultValue="skills" className="mt-8">
          <TabsList className="flex w-full flex-wrap justify-start">
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="assessment">Assessment</TabsTrigger>
            <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="assistant">AI assistant</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="skills" className="pt-6">
            <SkillsPanel userId={user.id} careerGoal={careerGoal} />
          </TabsContent>
          <TabsContent value="assessment" className="pt-6">
            <AssessmentPanel userId={user.id} />
          </TabsContent>
          <TabsContent value="roadmap" className="pt-6">
            <RoadmapPanel userId={user.id} careerGoal={careerGoal} />
          </TabsContent>
          <TabsContent value="portfolio" className="pt-6">
            <PortfolioPanel userId={user.id} />
          </TabsContent>
          <TabsContent value="assistant" className="pt-6">
            <AssistantPanel />
          </TabsContent>
          <TabsContent value="profile" className="pt-6">
            <ProfilePanel userId={user.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
