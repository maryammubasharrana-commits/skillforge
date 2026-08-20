import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

type Project = { id: string; title: string; description: string | null; tech_stack: string | null; url: string | null };
type Cert = { id: string; name: string; issuer: string | null; year: number | null };

export function PortfolioPanel({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [project, setProject] = useState({ title: "", description: "", tech_stack: "", url: "" });
  const [cert, setCert] = useState({ name: "", issuer: "", year: "" });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("user_id", userId).order("created_at");
      if (error) throw error;
      return data as Project[];
    },
  });

  const { data: certs = [] } = useQuery({
    queryKey: ["certs", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("certifications").select("*").eq("user_id", userId).order("created_at");
      if (error) throw error;
      return data as Cert[];
    },
  });

  const addProject = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("projects").insert({ user_id: userId, ...project, url: project.url || null });
      if (error) throw error;
    },
    onSuccess: () => {
      setProject({ title: "", description: "", tech_stack: "", url: "" });
      qc.invalidateQueries({ queryKey: ["projects", userId] });
      toast.success("Project added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addCert = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("certifications").insert({
        user_id: userId,
        name: cert.name,
        issuer: cert.issuer,
        year: cert.year ? Number(cert.year) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setCert({ name: "", issuer: "", year: "" });
      qc.invalidateQueries({ queryKey: ["certs", userId] });
      toast.success("Certification added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="surface-panel border-border/70">
        <CardHeader>
          <CardTitle>Project portfolio</CardTitle>
          <CardDescription>Proof of what you can already build.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label htmlFor="p-title">Title</Label>
              <Input id="p-title" value={project.title} onChange={(e) => setProject({ ...project, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-tech">Tech stack</Label>
              <Input id="p-tech" placeholder="React, FastAPI, Postgres" value={project.tech_stack} onChange={(e) => setProject({ ...project, tech_stack: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-url">Repo / demo URL</Label>
              <Input id="p-url" value={project.url} onChange={(e) => setProject({ ...project, url: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea id="p-desc" rows={2} value={project.description} onChange={(e) => setProject({ ...project, description: e.target.value })} />
            </div>
            <Button onClick={() => project.title.trim() && addProject.mutate()}>Add project</Button>
          </div>

          <div className="space-y-3">
            {projects.map((p) => (
              <div key={p.id} className="rounded-lg border border-border/70 bg-card/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.tech_stack}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                  </div>
                  <div className="flex gap-1">
                    {p.url && (
                      <Button size="icon" variant="ghost" asChild>
                        <a href={p.url} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={async () => {
                        await supabase.from("projects").delete().eq("id", p.id);
                        qc.invalidateQueries({ queryKey: ["projects", userId] });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="surface-panel border-border/70">
        <CardHeader>
          <CardTitle>Certifications</CardTitle>
          <CardDescription>Courses and credentials you have completed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input placeholder="Name" value={cert.name} onChange={(e) => setCert({ ...cert, name: e.target.value })} />
            <Input placeholder="Issuer" value={cert.issuer} onChange={(e) => setCert({ ...cert, issuer: e.target.value })} />
            <Input placeholder="Year" value={cert.year} onChange={(e) => setCert({ ...cert, year: e.target.value })} />
          </div>
          <Button onClick={() => cert.name.trim() && addCert.mutate()}>Add certification</Button>
          <div className="space-y-2">
            {certs.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm">
                <span>
                  {c.name} <span className="text-muted-foreground">· {c.issuer}{c.year ? ` · ${c.year}` : ""}</span>
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={async () => {
                    await supabase.from("certifications").delete().eq("id", c.id);
                    qc.invalidateQueries({ queryKey: ["certs", userId] });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
