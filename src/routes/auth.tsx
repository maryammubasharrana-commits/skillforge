import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useSession } from "@/lib/use-session";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in to SkillForge" },
      {
        name: "description",
        content: "Create your SkillForge account to assess your tech skills and get an AI career roadmap.",
      },
      { property: "og:title", content: "Sign in to SkillForge" },
      { property: "og:description", content: "Create an account to build your AI-powered career roadmap." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const { user } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.navigate({ to: "/dashboard" });
  }, [user, router]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    router.navigate({ to: "/dashboard" });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: fullName },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created. You can start building your profile.");
    router.navigate({ to: "/dashboard" });
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) return toast.error("Google sign-in failed. Try email instead.");
    if (result.redirected) return;
    router.navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
        <Card className="surface-panel border-border/70">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome to SkillForge</CardTitle>
            <CardDescription>Assess your skills, close your gaps, reach your target role.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signup">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signup">Create account</TabsTrigger>
                <TabsTrigger value="signin">Sign in</TabsTrigger>
              </TabsList>

              <TabsContent value="signup">
                <form className="space-y-4 pt-4" onSubmit={signUp}>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-up">Email</Label>
                    <Input id="email-up" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pw-up">Password</Label>
                    <Input id="pw-up" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    Create account
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signin">
                <form className="space-y-4 pt-4" onSubmit={signIn}>
                  <div className="space-y-2">
                    <Label htmlFor="email-in">Email</Label>
                    <Input id="email-in" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pw-in">Password</Label>
                    <Input id="pw-in" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    Sign in
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
            </div>
            <Button variant="outline" className="w-full" onClick={google}>
              Continue with Google
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
