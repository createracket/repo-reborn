import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { findProfanityIn } from "@/lib/profanity";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Join the mailing list — Create Racket" },
      { name: "description", content: "Join the Create Racket mailing list for early access to fan-first artist and brand partnerships." },
      { property: "og:title", content: "Join the mailing list — Create Racket" },
      { property: "og:description", content: "Get first dibs on Create Racket artist and brand drops." },
      { property: "og:url", content: "https://createracket.com/signup" },
    ],
    links: [{ rel: "canonical", href: "https://createracket.com/signup" }],
  }),
  component: FanSignup,
});

function FanSignup() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (findProfanityIn({ name })) {
      toast.error("Please remove offensive or inappropriate language from your name.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("mailing_list_subscribers")
      .insert({ email, name: name || null, source: "fan-signup", marketing_opt_in: true });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDone(true);
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto flex max-w-md flex-col px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-3xl">JOIN RACKET'S WAITLIST</CardTitle>
            <CardDescription>
              It's free to subscribe to our newsletter - made for fans, future partners, and folks who just want to follow along for now. No spam - just the good stuff.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <div className="space-y-4">
                <p className="text-foreground">You're in. Welcome to the racket. 🎉</p>
                <Button asChild variant="outline">
                  <Link to="/">Back home</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="name">Name (optional)</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "..." : "Sign up"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  By subscribing you agree to our{" "}
                  <Link to="/terms" className="underline hover:text-primary">Terms</Link>
                  {" "}and{" "}
                  <Link to="/privacy" className="underline hover:text-primary">Privacy Policy</Link>
                  , and to receive emails from Create Racket. Unsubscribe anytime.
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
