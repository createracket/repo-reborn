import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const sb = supabase as any;

type Ev = { date: string; label: string };

/** Report builder card: calendar tab switch + key events (mirrors the roster builder). */
export function ReportCalendarSettings({
  reportId,
  showCalendar,
  events,
  onChanged,
}: {
  reportId: string;
  showCalendar: boolean;
  events: Array<{ date?: string | null; label?: string | null }> | null | undefined;
  onChanged: () => void | Promise<void>;
}) {
  const [on, setOn] = useState(showCalendar);
  const [draft, setDraft] = useState<Ev[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOn(showCalendar);
    setDraft((events ?? []).map((e) => ({ date: (e.date ?? "").slice(0, 10), label: e.label ?? "" })));
  }, [reportId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggle(next: boolean) {
    setOn(next);
    const { error } = await sb.from("campaign_reports").update({ show_calendar: next }).eq("id", reportId);
    if (error) {
      setOn(!next);
      return toast.error(error.message);
    }
    await onChanged();
  }

  async function save() {
    setSaving(true);
    const cleaned = draft.filter((e) => e.date && e.label.trim()).map((e) => ({ date: e.date, label: e.label.trim() }));
    const { error } = await sb.from("campaign_reports").update({ calendar_events: cleaned }).eq("id", reportId);
    setSaving(false);
    if (error) return toast.error(error.message);
    setDraft(cleaned);
    toast.success("Key events saved");
    await onChanged();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-2xl">Calendar view</CardTitle>
        <CardDescription>
          Adds a Posts / Calendar toggle to the public report, placing creators on their posting dates. Set dates on
          each creator below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
          <div className="text-sm font-medium">Show calendar view</div>
          <Switch checked={on} onCheckedChange={toggle} />
        </div>
        <div className="rounded-lg border border-border/60 p-3">
          <div className="text-sm font-medium">Key events</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Moments you'll cover without a creator attached. They appear on the calendar only.
          </div>
          <div className="mt-3 space-y-2">
            {draft.map((ev, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  type="date"
                  className="w-40"
                  value={ev.date}
                  onChange={(e) => setDraft((d) => d.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))}
                />
                <Input
                  placeholder="Event label"
                  value={ev.label}
                  onChange={(e) => setDraft((d) => d.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove key event"
                  onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            {draft.length === 0 && <p className="text-xs text-muted-foreground">No key events yet.</p>}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setDraft((d) => [...d, { date: "", label: "" }])}>
                Add key event
              </Button>
              <Button type="button" size="sm" disabled={saving} onClick={save}>
                {saving ? "Saving…" : "Save key events"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Per-creator posting dates: one standard date plus extras. Saves on blur/remove. */
export function CreatorPostingDates({
  creatorId,
  postingDate,
  extraDates,
  onChanged,
}: {
  creatorId: string;
  postingDate: string | null | undefined;
  extraDates: string[] | null | undefined;
  onChanged: () => void | Promise<void>;
}) {
  const [main, setMain] = useState((postingDate ?? "").slice(0, 10));
  const [extras, setExtras] = useState<string[]>(extraDates ?? []);

  async function persist(m: string, ex: string[]) {
    const { error } = await sb
      .from("campaign_report_creators")
      .update({ posting_date: m || null, extra_posting_dates: ex.filter(Boolean) })
      .eq("id", creatorId);
    if (error) return toast.error(error.message);
    await onChanged();
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Posting dates</div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          className="w-40"
          value={main}
          onChange={(e) => setMain(e.target.value)}
          onBlur={() => persist(main, extras)}
        />
        {extras.map((d, i) => (
          <div key={i} className="flex items-center gap-1">
            <Input
              type="date"
              className="w-40"
              value={d}
              onChange={(e) => setExtras((x) => x.map((v, j) => (j === i ? e.target.value : v)))}
              onBlur={() => persist(main, extras)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove post date"
              onClick={() => {
                const next = extras.filter((_, j) => j !== i);
                setExtras(next);
                void persist(main, next);
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setExtras((x) => [...x, ""])}>
          + Add post date
        </Button>
      </div>
    </div>
  );
}
