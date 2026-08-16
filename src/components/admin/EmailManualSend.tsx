import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listEmailRecipients, sendTemplateToRecipients } from "@/lib/email-admin.functions";

type UserRow = { id: string; email: string; display_name: string | null };

export function EmailManualSend({
  templates,
}: {
  templates: { name: string; displayName: string }[];
}) {
  const loadUsers = useServerFn(listEmailRecipients);
  const send = useServerFn(sendTemplateToRecipients);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [template, setTemplate] = useState<string>("");
  const [query, setQuery] = useState("");
  const [external, setExternal] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await loadUsers({ data: {} } as any);
        setUsers((res?.users ?? []) as UserRow[]);
      } catch {
        /* non-blocking: external addresses still work */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return users
      .filter(
        (u) =>
          !recipients.includes(u.email.toLowerCase()) &&
          ((u.display_name ?? "").toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q)),
      )
      .slice(0, 6);
  }, [query, users, recipients]);

  function add(email: string) {
    const e = email.trim().toLowerCase();
    if (!e || recipients.includes(e)) return;
    setRecipients((r) => [...r, e]);
    setQuery("");
    setExternal("");
  }

  async function handleSend() {
    if (!template) return toast.error("Pick a template");
    if (recipients.length === 0) return toast.error("Add at least one recipient");
    setSending(true);
    try {
      const res: any = await send({ data: { templateName: template, recipients } } as any);
      const bits = [`${res.queued} queued`];
      if (res.skipped) bits.push(`${res.skipped} suppressed`);
      if (res.failures?.length) bits.push(`${res.failures.length} failed`);
      toast.success(bits.join(" · "));
      if (res.failures?.length) {
        toast.error(res.failures.map((f: any) => `${f.email}: ${f.error}`).join("\n"));
      }
      setRecipients([]);
    } catch (e: any) {
      toast.error(e?.message ?? "Send failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <p className="text-sm text-muted-foreground">
          Send a saved template to specific users or external collaborators. Sends go through the
          same queue and appear in the send log.
        </p>

        <div className="space-y-2">
          <label className="text-sm font-medium">Template</label>
          <Select value={template} onValueChange={setTemplate}>
            <SelectTrigger className="w-full md:w-[320px]">
              <SelectValue placeholder="Choose a template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.name} value={t.name}>
                  {t.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Find a user</label>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or email"
            />
            {matches.length > 0 && (
              <div className="rounded-md border">
                {matches.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => add(u.email)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <span>{u.display_name ?? u.email}</span>
                    <span className="text-xs text-muted-foreground">{u.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">External email</label>
            <div className="flex gap-2">
              <Input
                value={external}
                onChange={(e) => setExternal(e.target.value)}
                placeholder="name@company.com"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    add(external);
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={() => add(external)}>
                Add
              </Button>
            </div>
          </div>
        </div>

        {recipients.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {recipients.map((r) => (
              <Badge key={r} variant="outline" className="gap-1">
                {r}
                <button
                  type="button"
                  onClick={() => setRecipients((list) => list.filter((x) => x !== r))}
                  aria-label={`Remove ${r}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <Button onClick={handleSend} disabled={sending}>
          <Send className="mr-2 h-4 w-4" />
          {sending ? "Sending…" : `Send to ${recipients.length || 0}`}
        </Button>
      </CardContent>
    </Card>
  );
}
