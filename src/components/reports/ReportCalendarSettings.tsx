import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Link2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { reportCalendarPlatforms } from "@/lib/report-calendar-platforms";
import { compareCalendarEvents, REPORT_CALENDAR_TIMEZONE, validCalendarTime } from "@/lib/report-calendar-time";

const sb = supabase as any;

type Ev = { date: string; time: string; timezone: string; label: string; url: string; platforms: string[]; _open: boolean };

/** Report builder card: calendar tab switch + key events (mirrors the roster builder). */
export function ReportCalendarSettings({
  reportId,
  reportSlug,
  showCalendar,
  events,
  onChanged,
}: {
  reportId: string;
  reportSlug: string;
  showCalendar: boolean;
  events: Array<{ date?: string | null; time?: string | null; timezone?: string | null; label?: string | null; url?: string | null; platforms?: string[] | null }> | null | undefined;
  onChanged: () => void | Promise<void>;
}) {
  const [on, setOn] = useState(showCalendar);
  const [draft, setDraft] = useState<Ev[]>([]);
  const [saving, setSaving] = useState(false);
  // Always start folded away; admins open it when they need it.
  const [sectionOpen, setSectionOpen] = useState(false);

  useEffect(() => {
    setOn(showCalendar);
    setDraft(
      (events ?? []).map((e) => ({
        date: (e.date ?? "").slice(0, 10),
        time: e.time ?? "",
        timezone: e.timezone || REPORT_CALENDAR_TIMEZONE,
        label: e.label ?? "",
        url: e.url ?? "",
        platforms: Array.isArray(e.platforms) ? e.platforms : [],
        _open: false,
      })),
    );
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

  const patch = (i: number, p: Partial<Ev>) => setDraft((d) => d.map((x, j) => (j === i ? { ...x, ...p } : x)));

  async function persist(list: Ev[], successMsg: string) {
    if (list.some((e) => e.time.trim() && !validCalendarTime(e.time.trim()))) {
      toast.error("Enter posting times as HH:mm, from 00:00 to 23:59");
      return false;
    }
    setSaving(true);
    const rows = list.filter((e) => e.date && e.label.trim());
    const cleaned = rows.map((e) => {
      let url = e.url.trim();
      if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
      return { date: e.date, time: e.time.trim() || null, timezone: e.timezone || REPORT_CALENDAR_TIMEZONE, label: e.label.trim(), url: url || null, platforms: e.platforms };
    });
    const { error } = await sb.from("campaign_reports").update({ calendar_events: cleaned }).eq("id", reportId);
    setSaving(false);
    if (error) return toast.error(error.message);
    setDraft(
      rows.map((e) => ({ date: e.date, time: e.time ?? "", timezone: e.timezone, label: e.label, url: e.url ?? "", platforms: e.platforms ?? [], _open: e._open })),
    );
    toast.success(successMsg);
    await onChanged();
  }

  async function save() {
    await persist(draft, "Key events saved");
  }

  /** Like the social posts' "Order by date": soonest event first, undated events last, saved in one click. */
  async function autoOrderByDate() {
    const sorted = [...draft].sort(compareCalendarEvents);
    await persist(sorted, "Ordered by date");
  }

  return (
    <Card>
      <CardHeader
        className="flex-row items-center justify-between gap-3 space-y-0"
        onClick={() => setSectionOpen((o) => !o)}
      >
        <div>
          <CardTitle className="font-display text-2xl">Calendar view</CardTitle>
          <CardDescription>
            Adds a Posts / Calendar toggle to the public report, placing creators on their posting dates. Set dates on
            each creator below.
          </CardDescription>
        </div>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground"
          aria-label={sectionOpen ? "Collapse section" : "Expand section"}
          aria-expanded={sectionOpen}
        >
          {sectionOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
      </CardHeader>
      {sectionOpen && (
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
          <div className="mt-3 space-y-3">
            {draft.map((ev, i) => (
              <div key={i} className="space-y-2 rounded-md border border-border/60 p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Input type="date" className="w-40" value={ev.date} onChange={(e) => patch(i, { date: e.target.value })} />
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Time (24h)</span>
                    <Input
                      type="text"
                      inputMode="text"
                      aria-label="Posting time (24-hour AEDT)"
                      placeholder="HH:mm"
                      maxLength={5}
                      className="w-24"
                      value={ev.time}
                      onChange={(e) => patch(i, { time: e.target.value })}
                      aria-invalid={!!ev.time && !validCalendarTime(ev.time)}
                    />
                    <span>{ev.timezone} (UTC+11)</span>
                  </label>
                  <Input
                    className="min-w-40 flex-1"
                    placeholder="Event label"
                    value={ev.label}
                    onChange={(e) => patch(i, { label: e.target.value })}
                  />
                  <div className="flex items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={ev._open ? "Hide link and platform toggles" : "Show link and platform toggles"}
                      aria-expanded={ev._open}
                      onClick={() => patch(i, { _open: !ev._open })}
                    >
                      {ev._open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    </Button>
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
                </div>
                {ev._open ? (
                  <>
                    <Input placeholder="Link (optional)" value={ev.url} onChange={(e) => patch(i, { url: e.target.value })} />
                    <div className="flex flex-wrap items-center gap-4">
                      {reportCalendarPlatforms(reportSlug).map((p) => (
                        <label key={p} className="flex items-center gap-1.5 text-xs font-medium">
                          <Switch
                            checked={ev.platforms.includes(p)}
                            onCheckedChange={(c) =>
                              patch(i, { platforms: c ? [...ev.platforms, p] : ev.platforms.filter((x) => x !== p) })
                            }
                          />
                          {p}
                        </label>
                      ))}
                    </div>
                  </>
                ) : (
                  (ev.url.trim() || ev.platforms.length > 0) && (
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {ev.platforms.length > 0 && <span>{ev.platforms.join(" · ")}</span>}
                      {ev.url.trim() && (
                        <span className="inline-flex items-center gap-1">
                          <Link2 className="size-3" />
                          Link added
                        </span>
                      )}
                    </div>
                  )
                )}
              </div>
            ))}
            {draft.length === 0 && <p className="text-xs text-muted-foreground">No key events yet.</p>}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDraft((d) => [...d, { date: "", time: "", timezone: REPORT_CALENDAR_TIMEZONE, label: "", url: "", platforms: [], _open: false }])}
              >
                Add key event
              </Button>
              {draft.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                    title="Sort newest date and posting time first (undated at the end)"
                  onClick={autoOrderByDate}
                >
                  Order by date
                </Button>
              )}
              <Button type="button" size="sm" disabled={saving} onClick={save}>
                {saving ? "Saving…" : "Save key events"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
      )}
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
