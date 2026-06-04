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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export const ACCESS_CODE = "VERIFIEDFAN";

const ACCOUNT_TYPES = [
  { value: "artist", label: "Artist" },
  { value: "brand", label: "Brand (coming soon — join waitlist)" },
  { value: "creative", label: "Creative" },
  { value: "fan", label: "Fan" },
  { value: "crew", label: "Crew" },
] as const;

type AccountTypeValue = (typeof ACCOUNT_TYPES)[number]["value"];


export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search.mode === "signin" ? ("signin" as const) : ("signup" as const),
    next: typeof search.next === "string" ? search.next : undefined,
  }),
  head: () => ({
    meta: [{ title: "Get Started — Create Racket" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { mode: modeParam, next } = Route.useSearch();

  // Default to signup. Only show signin if explicitly requested via
  // ?mode=signin; otherwise every visitor sees the new-user experience.
  const initialMode: "signin" | "signup" = (() => {
    if (modeParam === "signin") return "signin";
    if (typeof window !== "undefined") {
      try {
        if (sessionStorage.getItem("vibeCheck")) return "signup";
      } catch {
        // ignore
      }
    }
    return "signup";
  })();

  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [accountType, setAccountType] = useState<AccountTypeValue>("fan");
  const [busy, setBusy] = useState(false);
  const [showVibeNudge, setShowVibeNudge] = useState(false);
  const nudgeShownRef = useRef(false);

  const accessCodeOk = accessCode.trim().toUpperCase() === ACCESS_CODE;


  // Where to send the user after auth succeeds. If they came from the Vibe
  // Check "Save my results" CTA — or we just see a pending vibe in storage —
  // we route to /results so its auto-save effect attaches the result to the
  // newly-created user before they land on the dashboard.
  function postAuthDestination(): "/results" | "/dashboard" {
    if (next === "results") return "/results";
    if (typeof window !== "undefined") {
      try {
        if (sessionStorage.getItem("vibeCheck")) return "/results";
      } catch {
        // ignore
      }
    }
    return "/dashboard";
  }

  // Redirect once session is present. If the user selected a profile type
  // before signing in with Google (where we can't pass it via supabase.auth),
  // apply it to their profile now.
  useEffect(() => {
    async function applyPendingAccountType(userId: string) {
      if (typeof window === "undefined") return;
      let pending: string | null = null;
      try {
        pending = sessionStorage.getItem("pendingAccountType");
      } catch {
        return;
      }
      if (!pending) return;
      const allowed = ["artist", "brand", "creative", "fan", "crew"];
      if (!allowed.includes(pending)) {
        try {
          sessionStorage.removeItem("pendingAccountType");
        } catch {
          // ignore
        }
        return;
      }
      const { data: prof } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("id", userId)
        .maybeSingle();
      if (prof && !prof.account_type) {
        await supabase
          .from("profiles")
          .update({ account_type: pending as AccountTypeValue })
          .eq("id", userId);
      }
      try {
        sessionStorage.removeItem("pendingAccountType");
      } catch {
        // ignore
      }
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) {
        applyPendingAccountType(session.user.id).finally(() => {
          navigate({ to: postAuthDestination(), replace: true });
        });
      }
    });

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: postAuthDestination(), replace: true });
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // Exit-intent + idle nudge — DISABLED during soft-launch phase
  // useEffect(() => {
  //   if (mode !== "signup" || typeof window === "undefined") return;
  //   nudgeShownRef.current = false;
  //
  //   const trigger = () => {
  //     if (nudgeShownRef.current || busy) return;
  //     nudgeShownRef.current = true;
  //     setShowVibeNudge(true);
  //   };
  //
  //   const onMouseLeave = (e: MouseEvent) => {
  //     if (e.clientY <= 0) trigger();
  //   };
  //
  //   const idleTimer = window.setTimeout(trigger, 20000);
  //   document.addEventListener("mouseleave", onMouseLeave);
  //
  //   return () => {
  //     window.clearTimeout(idleTimer);
  //     document.removeEventListener("mouseleave", onMouseLeave);
  //   };
  // }, [mode, busy]);

  function gateSignupOrWaitlist(): boolean {
    if (mode !== "signup") return true;
    if (accessCodeOk) return true;
    toast.error("That access code isn't valid. Join the waitlist to get notified.");
    navigate({ to: "/fan-signup" });
    return false;
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!gateSignupOrWaitlist()) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { account_type: accountType },
          },
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
    if (!gateSignupOrWaitlist()) return;
    try {
      if (mode === "signup" && typeof window !== "undefined") {
        // Persist the chosen profile type so we can apply it after the
        // OAuth round-trip lands the user back on the app.
        try {
          sessionStorage.setItem("pendingAccountType", accountType);
        } catch {
          // ignore
        }
      }
      await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}${postAuthDestination()}`,
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
            {/* Soft-launch gate: access code shown in signup mode */}
            {mode === "signup" && (
              <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="space-y-1">
                  <Label htmlFor="access-code" className="text-xs uppercase tracking-wider">
                    EARLY ACCESS CODE
                  </Label>
                  <Input
                    id="access-code"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="Enter your code"
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    We're loading in. No code?{" "}
                    <Link to="/fan-signup" className="font-medium text-primary hover:underline">
                      Join the waitlist
                    </Link>
                    .
                  </p>
                </div>
                {accessCodeOk && (
                  <div className="space-y-1">
                    <Label htmlFor="account-type" className="text-xs uppercase tracking-wider">
                      I'm a…
                    </Label>
                    <Select
                      value={accountType}
                      onValueChange={(v) => setAccountType(v as AccountTypeValue)}
                    >
                      <SelectTrigger id="account-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACCOUNT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Full signup form — only visible once access code is correct */}
            {mode === "signup" && accessCodeOk && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogle}
                >
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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                    </div>
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
                    {busy ? "..." : "Create account"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    By creating an account you agree to our{" "}
                    <Link to="/terms" className="underline hover:text-primary">Terms</Link>
                    {" "}and{" "}
                    <Link to="/privacy" className="underline hover:text-primary">Privacy Policy</Link>
                    .
                  </p>
                </form>

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
              </>
            )}

            {/* Signin form — always fully visible */}
            {mode === "signin" && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogle}
                >
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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link
                        to="/forgot-password"
                        className="text-xs text-muted-foreground hover:text-primary hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
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
                    {busy ? "..." : "Log in"}
                  </Button>
                </form>
              </>
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

      <Dialog open={showVibeNudge} onOpenChange={setShowVibeNudge}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-2 inline-flex size-10 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="size-5 text-primary" />
            </div>
            <DialogTitle className="font-display text-2xl">
              Before you go — try the Vibe Check
            </DialogTitle>
            <DialogDescription>
              No account needed. In about 2 minutes you'll get your archetype and a
              preview of the partners we'd match you with. Save it with one click at
              the end.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Link
              to="/vibe-check"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              onClick={() => setShowVibeNudge(false)}
            >
              Take the Vibe Check
            </Link>
            <Button variant="ghost" onClick={() => setShowVibeNudge(false)}>
              Keep signing up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
