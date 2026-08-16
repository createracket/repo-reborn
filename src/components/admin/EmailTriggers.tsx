import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EMAIL_EVENTS } from "@/lib/email/events";
import { getEventBindings, setEventBinding } from "@/lib/email-admin.functions";

type Binding = { event_key: string; template_name: string | null; enabled: boolean };

const NONE = "__none__";

export function EmailTriggers({
  templates,
}: {
  templates: { name: string; displayName: string }[];
}) {
  const load = useServerFn(getEventBindings);
  const save = useServerFn(setEventBinding);
  const [map, setMap] = useState<Record<string, Binding>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await load({ data: {} } as any);
        const next: Record<string, Binding> = {};
        for (const b of (res?.bindings ?? []) as Binding[]) next[b.event_key] = b;
        setMap(next);
      } catch (e: any) {
        toast.error(e?.message ?? "Could not load triggers");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function update(eventKey: string, patch: Partial<Binding>) {
    const current = map[eventKey] ?? { event_key: eventKey, template_name: null, enabled: false };
    const next: Binding = { ...current, ...patch };
    if (!next.template_name) next.enabled = false;
    setMap((m) => ({ ...m, [eventKey]: next }));
    setBusy(eventKey);
    try {
      await save({
        data: {
          eventKey,
          templateName: next.template_name,
          enabled: next.enabled,
        },
      } as any);
    } catch (e: any) {
      setMap((m) => ({ ...m, [eventKey]: current }));
      toast.error(e?.message ?? "Could not save");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Assign a template to each site action. Every trigger is off by default — nothing sends until
        you pick a template and switch it on.
      </p>

      {EMAIL_EVENTS.map((ev) => {
        const b = map[ev.key];
        const selected = b?.template_name ?? NONE;
        return (
          <Card key={ev.key} className={b?.enabled ? "border-lime/40" : undefined}>
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{ev.label}</span>
                  <Badge variant="outline" className="text-xs">
                    {ev.recipient}
                  </Badge>
                  {b?.enabled ? (
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs">
                      On
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Off
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{ev.description}</p>
                {ev.mergeTags.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Merge tags: {ev.mergeTags.map((t) => `{{${t}}}`).join(" ")}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <Select
                  value={selected}
                  onValueChange={(v) =>
                    update(ev.key, { template_name: v === NONE ? null : v })
                  }
                >
                  <SelectTrigger className="w-[230px]">
                    <SelectValue placeholder="No template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No template</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.name} value={t.name}>
                        {t.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Switch
                  checked={!!b?.enabled}
                  disabled={!b?.template_name || busy === ev.key}
                  onCheckedChange={(checked) => update(ev.key, { enabled: checked })}
                  aria-label={`Enable ${ev.label}`}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
