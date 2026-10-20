import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { listCampaignListeningChoices, setCampaignListeningLink } from "@/lib/campaign-listening.functions";

type Choice = { id: string; artist_name: string; report_title: string | null; created_at: string; saved: boolean; selected: boolean };
export function ReportListeningSettings({ reportId }: { reportId: string }) {
  const list = useServerFn(listCampaignListeningChoices);
  const save = useServerFn(setCampaignListeningLink);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(false);
  async function load() {
    setLoading(true); setError(false);
    try { setChoices(await list({ data: { reportId } })); }
    catch { setError(true); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [reportId]);
  async function toggle(choice: Choice, selected: boolean) {
    setBusy(choice.id);
    try {
      await save({ data: { reportId, scanId: choice.id, selected } });
      setChoices((rows) => rows.map((row) => row.id === choice.id ? { ...row, selected, saved: selected || row.saved } : row));
      toast.success(selected ? "Added to Listening" : "Removed from Listening");
    } catch { toast.error("Could not update Listening"); }
    finally { setBusy(null); }
  }
  return <section className="space-y-4 border-y border-border py-6">
    <div className="flex items-center justify-between"><h2 className="font-display text-2xl">Listening</h2><Button variant="ghost" size="icon" title="Refresh listening reports" aria-label="Refresh listening reports" onClick={load} disabled={loading}><RefreshCw className="size-4" /></Button></div>
    {loading ? <p className="text-sm text-muted-foreground">Loading reports…</p> : error ? <p role="alert" className="text-sm text-destructive">Could not load listening reports. Please retry.</p> : choices.length === 0 ? <p className="text-sm text-muted-foreground">No Racket Desk listening reports yet.</p> : <div className="divide-y divide-border">{choices.map((choice) => <label key={choice.id} className="flex items-center justify-between gap-4 py-3"><span className="min-w-0"><span className="block text-sm font-medium">{choice.report_title || choice.artist_name}</span><span className="text-xs text-muted-foreground">{choice.artist_name} · {new Date(choice.created_at).toLocaleDateString("en-AU")}{!choice.saved ? " · Unsaved scan" : ""}</span></span><Switch aria-label={`Show ${choice.report_title || choice.artist_name} in Listening`} checked={choice.selected} disabled={busy !== null} onCheckedChange={(selected) => toggle(choice, selected)} /></label>)}</div>}
  </section>;
}