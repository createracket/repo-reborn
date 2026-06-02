import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Log in — Create Racket" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showVibeNudge, setShowVibeNudge] = useState(false);
  const nudgeShownRef = useRef(false);

  // Redirect once session is present.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/dashboard", replace: true });
    });
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  // Exit-intent + idle nudge — only when the user is on the signup tab and
  // hasn't completed the form. We pitch the Vibe Check as a no-commitment way
  // in: they get a result, then we ask them to save it by creating an account.
  useEffect(() => {
    if (mode !== "signup" || typeof window === "undefined") return;
    nudgeShownRef.current = false;

    const trigger = () => {
      if (nudgeShownRef.current || busy) return;
      nudgeShownRef.current = true;
      setShowVibeNudge(true);
    };

    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) trigger();
    };

    const idleTimer = window.setTimeout(trigger, 20000);
    document.addEventListener("mouseleave", onMouseLeave);

    return () => {
      window.clearTimeout(idleTimer);
      document.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [mode, busy]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    try {
      await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/dashboard`,
      });
    } catch (err: any) {
      toast.error(err.message ?? "Couldn't start Google sign-in");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto flex max-w-md flex-col px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-3xl">
              {mode === "signin" ? "WELCOME BACK" : "JOIN THE RACKET"}
            </CardTitle>
            <CardDescription>
              {mode === "signin"
                ? "Log in to save your Vibe Check and access your dashboard."
                : "Create an account to save your results and start matching."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button type="button" variant="outline" className="w-full" onClick={handleGoogle}>
              Continue with Google
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or with email</span>
              </div>
            </div>
            <form onSubmit={handleEmail} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@band.com"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "..." : mode === "signin" ? "Log in" : "Create account"}
              </Button>
            </form>
            {mode === "signup" && (
              <Link
                to="/vibe-check"
                className="group flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 transition-colors hover:border-primary/60 hover:bg-primary/10"
              >
                <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">
                    Not ready to sign up? Take the Vibe Check first.
                  </p>
                  <p className="mt-0.5 text-muted-foreground">
                    2 minutes. See your archetype and who you'd match with — then
                    save it with an account.
                  </p>
                </div>
              </Link>
            )}
            <p className="text-center text-sm text-muted-foreground">
              {mode === "signin" ? "New here? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="font-medium text-primary hover:underline"
              >
                {mode === "signin" ? "Create an account" : "Log in"}
              </button>
            </p>
            <p className="text-center text-xs text-muted-foreground">
              <Link to="/" className="hover:underline">
                ← Back home
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
