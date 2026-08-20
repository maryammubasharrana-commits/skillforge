import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_BLUEPRINTS } from "@/lib/skill-analysis";

type Profile = {
  id: string;
  full_name: string;
  education: string | null;
  career_goal: string | null;
  experience_level: string;
  bio: string | null;
  cv_url: string | null;
};

export function ProfilePanel({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

  const [form, setForm] = useState({
    full_name: "",
    education: "",
    career_goal: "AI Engineer",
    experience_level: "beginner",
    bio: "",
    cv_url: "",
  });

  useEffect(() => {
    if (data) {
      setForm({
        full_name: data.full_name ?? "",
        education: data.education ?? "",
        career_goal: data.career_goal || "AI Engineer",
        experience_level: data.experience_level ?? "beginner",
        bio: data.bio ?? "",
        cv_url: data.cv_url ?? "",
      });
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").upsert({ id: userId, ...form });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["profile", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function uploadCv(file: File) {
    const path = `${userId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("cvs").upload(path, file, { upsert: true });
    if (error) {
      toast.error(error.message);
      return;
    }
    setForm((f) => ({ ...f, cv_url: path }));
    toast.success("CV uploaded — remember to save");
  }

  async function openCv() {
    const { data, error } = await supabase.storage.from("cvs").createSignedUrl(form.cv_url, 60);
    if (error || !data) {
      toast.error("Could not open the CV");
      return;
    }
    window.open(data.signedUrl, "_blank", "noreferrer");
  }

  return (
    <Card className="surface-panel border-border/70">
      <CardHeader>
        <CardTitle>Student profile</CardTitle>
        <CardDescription>Your identity, education and career target drive every AI recommendation.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="education">Education</Label>
          <Input
            id="education"
            placeholder="BS Computer Science, 3rd year"
            value={form.education}
            onChange={(e) => setForm({ ...form, education: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Career goal</Label>
          <Select value={form.career_goal} onValueChange={(v) => setForm({ ...form, career_goal: v })}>
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
        <div className="space-y-2">
          <Label>Experience level</Label>
          <Select value={form.experience_level} onValueChange={(v) => setForm({ ...form, experience_level: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="bio">About you</Label>
          <Textarea
            id="bio"
            rows={3}
            placeholder="What you have built so far and where you want to go."
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="cv">CV / resume</Label>
          <Input
            id="cv"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadCv(file);
            }}
          />
          {form.cv_url && (
            <button type="button" className="text-left text-sm text-accent underline" onClick={() => void openCv()}>
              View uploaded CV
            </button>
          )}
        </div>
        <div className="md:col-span-2">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            Save profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
