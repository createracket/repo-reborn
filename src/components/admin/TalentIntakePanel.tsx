import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Copy, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminCreateTalentIntake,
  adminDeleteTalentIntake,
  adminListTalentIntakes,
} from "@/lib/talent-intake.functions";

function linkFor(token: string) {
  return `${window.location.origin}/talent/${token}`;
}

export function TalentIntakePanel() {
  const qc = useQueryClient();
  const list = useServerFn(adminListTalentIntakes);
  const create = useServerFn(adminCreateTalentIntake);
  const remove = useServerFn(adminDeleteTalentIntake);
  const { data = [] } = useQuery({ queryKey: ["talent-intakes"], queryFn: () => list() });
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function copy(token: string) {
    await navigator.clipboard.writeText(linkFor(token));
    toast.success("Link copied — send it to the artist.");
  }

  async function makeLink(mode: "standard" | "advanced") {
    setBusy(true);
    try {
      const row = await create({ data: { artistName: name.trim() || undefined, mode } });
      setName("");
      await copy(row.token);
      qc.invalidateQueries({ queryKey: ["talent-intakes"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create link");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="mb-6 rounded-lg border border-primary/40 bg-muted/20 open:pb-4">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium">
        Talent forms
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          (send artists a link to fill in their socials — it creates a draft spotlight)
        </span>
      </summary>
      <div className="space-y-4 px-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Artist name (optional — pre-fills the form)" />
          <Button type="button" onClick={() => makeLink("standard")} disabled={busy}>
            {busy ? "Creating…" : "Create & copy link"}
          </Button>
          <Button type="button" variant="outline" onClick={() => makeLink("advanced")} disabled={busy}>
            Create advanced link
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Advanced links let the artist draft their own page with AI and preview it before sending (up to 5 drafts per link).
        </p>
        {data.length === 0 ? (
          <p className="text-xs text-muted-foreground">No talent forms yet.</p>
        ) : (
          <ul className="divide-y divide-border/50 text-sm">
            {data.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="min-w-0 flex-1 truncate font-medium">
                  {r.answers?.artist_name || r.artist_name || "Unnamed"}
                </span>
                {r.mode === "advanced" ? (
                  <span className="rounded-full border border-primary px-2 py-0.5 text-[11px] text-primary">Advanced</span>
                ) : null}
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${r.status === "pending" ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}`}>
                  {r.status === "pending" ? "Waiting" : r.answers?.skipped ? "Sent (skipped extras)" : "Sent"}
                </span>
                {r.status === "pending" ? (
                  <Button size="sm" variant="ghost" onClick={() => copy(r.token)}>
                    <Copy className="mr-1 h-3.5 w-3.5" /> Copy link
                  </Button>
                ) : r.partner_page_id ? (
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/admin/spotlights/edit/$key" params={{ key: r.partner_page_id }}>Open draft</Link>
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Delete talent form"
                  onClick={async () => {
                    if (!confirm("Delete this talent form? Any draft spotlight it created stays.")) return;
                    await remove({ data: { id: r.id } });
                    qc.invalidateQueries({ queryKey: ["talent-intakes"] });
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
