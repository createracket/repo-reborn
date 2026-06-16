import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { findProfanityIn } from "@/lib/profanity";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Create Racket" },
      { name: "description", content: "Get in touch with the Create Racket team." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (findProfanityIn({ name, message })) {
      toast.error("Please remove offensive or inappropriate language before sending.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/public/contact-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Couldn't send message. Try again?");
        return;
      }
      setDone(true);
      toast.success("Message sent — we'll be in touch.");
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container mx-auto flex max-w-lg flex-col px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-3xl">SAY HI</CardTitle>
            <CardDescription>
              Questions, collabs, hot takes — drop us a line and we'll get back to you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <p className="text-foreground">
                Thanks — your message is in. We'll reply to{" "}
                <span className="text-primary">{email}</span> soon.
              </p>
            ) : (
              <form onSubmit={onSubmit} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    required
                    maxLength={200}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
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
                <div className="space-y-1">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    required
                    rows={6}
                    maxLength={5000}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Sending..." : "Send message"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
