import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trends } from "@/lib/racket-desk/trends";

type Row = { trend_id: string; title: string; count: number; last: string };

export function SavedTrendsAdmin() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    supabase
      .from("saved_trends")
      .select("trend_id, trend_title, created_at")
      .then(({ data }) => {
        const map = new Map<string, Row>();
        for (const r of data ?? []) {
          const cur = map.get(r.trend_id) ?? {
            trend_id: r.trend_id,
            title: trends.find((t) => t.id === r.trend_id)?.title ?? r.trend_title,
            count: 0,
            last: r.created_at,
          };
          cur.count += 1;
          if (r.created_at > cur.last) cur.last = r.created_at;
          map.set(r.trend_id, cur);
        }
        setRows([...map.values()].sort((a, b) => b.count - a.count));
      });
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">Saved trend ideas</CardTitle>
        <p className="text-sm text-muted-foreground">Which "Breaking right now" ideas users save most.</p>
      </CardHeader>
      <CardContent>
        {rows === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No ideas saved yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.trend_id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span>{r.title}</span>
                <span className="shrink-0 text-muted-foreground">
                  <strong className="text-foreground">{r.count}</strong> saves · last{" "}
                  {new Date(r.last).toLocaleDateString("en-AU")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
