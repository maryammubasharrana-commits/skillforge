import { Link, useRouter } from "@tanstack/react-router";
import { Flame, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/use-session";

export function AppHeader() {
  const { user, isStaff } = useSession();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Flame className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">SkillForge</span>
        </Link>

        <nav className="flex items-center gap-1">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
              {isStaff && (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/mentor">Mentor</Link>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.navigate({ to: "/" });
                }}
              >
                <LogOut className="mr-1 h-4 w-4" /> Sign out
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Get started</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
