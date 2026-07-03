import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export type ExampleOpportunity = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  image_url: string | null;
  position: number;
};

export function ExampleOpportunitiesAdmin() {
  const [rows, setRows] = useState<ExampleOpportunity[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("example_opportunities" as any)
      .select("*")
      .order("position", { ascending: true });
    if (error) toast.error(error.message);
    setRows(((data as any[]) ?? []) as ExampleOpportunity[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addRow() {
    const nextPos = rows.length ? Math.max(...rows.map((r) => r.position)) + 1 : 0;
    const { error } = await supabase
      .from("example_opportunities" as any)
      .insert({ title: "New example opportunity", position: nextPos } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Added");
    load();
  }

  async function updateRow(id: string, patch: Partial<ExampleOpportunity>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function saveRow(row: ExampleOpportunity) {
    const { error } = await supabase
      .from("example_opportunities" as any)
      .update({
        title: row.title,
        description: row.description,
        location: row.location,
        image_url: row.image_url,
        position: row.position,
      } as any)
      .eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
  }

  async function deleteRow(id: string) {
    if (!confirm("Delete this example?")) return;
    const { error } = await supabase.from("example_opportunities" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  }

  async function handleImage(row: ExampleOpportunity, file: File) {
    if (file.size > 8 * 1024 * 1024) { toast.error("Max 8MB"); return; }
    // Resize to max 1080x1080
    const resized = await resizeImage(file, 1080);
    const ext = "jpg";
    const path = `example-opps/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("spotlight-images").upload(path, resized, {
      cacheControl: "3600", upsert: false, contentType: "image/jpeg",
    });
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("spotlight-images").getPublicUrl(path);
    await supabase.from("example_opportunities" as any).update({ image_url: data.publicUrl } as any).eq("id", row.id);
    updateRow(row.id, { image_url: data.publicUrl });
    toast.success("Image uploaded");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-2xl">Example opportunities</CardTitle>
        <CardDescription>
          These three examples appear in the "New opportunities" section on user dashboards to show
          the types of briefs that will surface. They are non-clickable placeholders.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            {rows.map((row) => (
              <div key={row.id} className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
                <div className="flex flex-wrap gap-4">
                  <div className="w-32 shrink-0 space-y-2">
                    <div
                      className="overflow-hidden rounded-md border border-border/60 bg-muted/40"
                      style={{ width: 128, aspectRatio: "1" }}
                    >
                      {row.image_url ? (
                        <img src={row.image_url} alt="" className="size-full object-cover" />
                      ) : (
                        <div className="flex size-full items-center justify-center text-[10px] uppercase tracking-wider text-muted-foreground">
                          Thumbnail
                        </div>
                      )}
                    </div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleImage(row, f);
                        e.target.value = "";
                      }}
                      className="text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">Max 1080×1080</p>
                  </div>
                  <div className="flex-1 min-w-[240px] space-y-2">
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={row.title}
                        onChange={(e) => updateRow(row.id, { title: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Sentence explainer</Label>
                      <Textarea
                        rows={2}
                        value={row.description ?? ""}
                        onChange={(e) => updateRow(row.id, { description: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Label>Location</Label>
                        <Input
                          value={row.location ?? ""}
                          onChange={(e) => updateRow(row.id, { location: e.target.value })}
                          placeholder="e.g. UK / Global"
                        />
                      </div>
                      <div className="w-24">
                        <Label>Order</Label>
                        <Input
                          type="number"
                          value={row.position}
                          onChange={(e) => updateRow(row.id, { position: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between pt-2">
                      <Button variant="ghost" size="sm" onClick={() => deleteRow(row.id)} className="text-destructive">
                        <Trash2 className="mr-1 size-4" /> Delete
                      </Button>
                      <Button size="sm" onClick={() => saveRow(row)}>Save</Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addRow}>+ Add example</Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

async function resizeImage(file: File, max: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.85)
  );
}
