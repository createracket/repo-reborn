import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getReportFeedKey } from "@/lib/data-feeds.functions";

const ORIGIN = "https://createracket.com";

export function ReportDataFeeds({ reportId, slug }: { reportId: string; slug: string }) {
  const [key, setKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const copy = (t: string) => navigator.clipboard.writeText(t).then(() => toast.success("Link copied"));
  const load = async (reset = false) => {
    if (reset && !confirm("Reset the private key? Old detailed links stop working.")) return;
    setBusy(true);
    try { setKey((await getReportFeedKey({ data: { reportId, reset } })).key); if (reset) toast.success("New key created"); }
    catch (e: any) { toast.error(e?.message ?? "Could not load key"); } finally { setBusy(false); }
  };
  const pub = `${ORIGIN}/report/${slug}/metrics`;
  const det = key ? `${ORIGIN}/report/${slug}/detailed` : null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Data feeds</CardTitle>
        <CardDescription>Links client dashboards can pull. Public works for published reports with no access code. Detailed adds creator-account data and needs the private key.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button size="sm" variant="purple" onClick={() => copy(`${pub}.csv`)}>Public CSV</Button>
        <Button size="sm" variant="purple" onClick={() => copy(`${pub}.json`)}>Public JSON</Button>
        {det ? (
          <>
            <Button size="sm" variant="purple" onClick={() => copy(`${det}.csv?key=${key}`)}>Detailed CSV</Button>
            <Button size="sm" variant="purple" onClick={() => copy(`${det}.json?key=${key}`)}>Detailed JSON</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => load(true)}>Reset private key</Button>
          </>
        ) : (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => load()}>Show detailed links</Button>
        )}
      </CardContent>
    </Card>
  );
}
