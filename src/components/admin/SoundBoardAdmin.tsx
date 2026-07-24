import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Trash2, ChevronDown, ChevronRight } from "lucide-react";

type SoundBoardItem = {
  id: string;
  title: string;
  copy: string;
  video_url: string | null;
  thumbnail_url: string | null;
  gradient: string | null;
  position: number;
  published: boolean;
};

export function SoundBoardAdmin() {
  const [rows, setRows] = useState<SoundBoardItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("sound_board_items" as any)
      .select("*")
      .order("position", { ascending: true });
    if (error) toast.error(error.message);
    setRows(((data as any[]) ?? []) as SoundBoardItem[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addRow() {
    const nextPos = rows.length ? Math.max(...rows.map((r) => r.position)) + 1 : 0;
    const { error } = await supabase
      .from("sound_board_items" as any)
      .insert({
        title: "New card",
        copy: "Short description of the moment.",
        gradient: "linear-gradient(135deg,#5C37D0,#FFC0CB)",
        position: nextPos,
      } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Added");
    load();
  }

  function updateLocal(id: string, patch: Partial<SoundBoardItem>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function saveRow(row: SoundBoardItem) {
    const { error } = await supabase
      .from("sound_board_items" as any)
      .update({
        title: row.title,
        copy: row.copy,
        video_url: row.video_url,
        thumbnail_url: row.thumbnail_url,
        gradient: row.gradient,
        position: row.position,
        published: row.published,
      } as any)
      .eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
  }

  async function deleteRow(id: string) {
    if (!confirm("Delete this Sound Board card?")) return;
    const { error } = await supabase.from("sound_board_items" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    load();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Sound Board</CardTitle>
            <CardDescription>
              Cards shown in the Sound Board carousel on the dashboard. Add a video link from
              socials (Instagram, TikTok, YouTube, etc.), optional thumbnail image URL, and
              edit copy per card.
            </CardDescription>
          </div>
          <Button onClick={addRow}>Add card</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
        {!loading && rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cards yet.</p>
        ) : null}
        {rows.map((row) => (
          <div key={row.id} className="rounded-lg border border-border p-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-[1fr_100px_auto]">
              <div>
                <Label>Title</Label>
                <Input
                  value={row.title}
                  onChange={(e) => updateLocal(row.id, { title: e.target.value })}
                />
              </div>
              <div>
                <Label>Position</Label>
                <Input
                  type="number"
                  value={row.position}
                  onChange={(e) => updateLocal(row.id, { position: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={row.published}
                    onCheckedChange={(v) => updateLocal(row.id, { published: v })}
                  />
                  <span className="text-sm">Published</span>
                </div>
              </div>
            </div>
            <div>
              <Label>Copy</Label>
              <Textarea
                rows={2}
                value={row.copy}
                onChange={(e) => updateLocal(row.id, { copy: e.target.value })}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Video / post URL</Label>
                <Input
                  placeholder="https://instagram.com/... or TikTok/YouTube link"
                  value={row.video_url ?? ""}
                  onChange={(e) => updateLocal(row.id, { video_url: e.target.value || null })}
                />
              </div>
              <div>
                <Label>Thumbnail image URL</Label>
                <Input
                  placeholder="https://... (9:16 preferred)"
                  value={row.thumbnail_url ?? ""}
                  onChange={(e) => updateLocal(row.id, { thumbnail_url: e.target.value || null })}
                />
              </div>
            </div>
            <div>
              <Label>Fallback gradient (used when no thumbnail)</Label>
              <Input
                placeholder="linear-gradient(135deg,#5C37D0,#FFC0CB)"
                value={row.gradient ?? ""}
                onChange={(e) => updateLocal(row.id, { gradient: e.target.value || null })}
              />
            </div>
            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={() => deleteRow(row.id)}>
                <Trash2 className="mr-1 size-4" /> Delete
              </Button>
              <Button size="sm" onClick={() => saveRow(row)}>Save</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
