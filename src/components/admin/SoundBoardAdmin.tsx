import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { adminUploadSpotlightImage } from "@/lib/spotlight-images.functions";
import { scrapePostMetrics } from "@/lib/campaign-scrapers.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Trash2, ChevronDown, ChevronRight, Upload, GripVertical, RefreshCw } from "lucide-react";

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

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export function SoundBoardAdmin() {
  const [rows, setRows] = useState<SoundBoardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const uploadImage = useServerFn(adminUploadSpotlightImage);
  const fetchPreview = useServerFn(scrapePostMetrics);

  /** Pull a preview image (and copy fallback) from the pasted post URL. */
  async function fetchThumbnail(row: SoundBoardItem) {
    const url = (row.video_url ?? "").trim();
    if (!url) {
      toast.error("Add a video / post URL first");
      return;
    }
    setFetchingId(row.id);
    try {
      const result = await fetchPreview({ data: { url } });
      if (!result.ok) throw new Error(result.error);
      const thumb = result.metrics.thumbnail_url;
      if (!thumb) throw new Error("No preview image available for that link");
      updateLocal(row.id, { thumbnail_url: thumb });
      const { error } = await supabase
        .from("sound_board_items" as any)
        .update({ thumbnail_url: thumb } as any)
        .eq("id", row.id);
      if (error) throw error;
      toast.success("Preview pulled from link");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't fetch preview");
    } finally {
      setFetchingId(null);
    }
  }


  async function uploadCover(row: SoundBoardItem, file: File) {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be under 8MB");
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
      toast.error("Use a JPG, PNG, WEBP or GIF image");
      return;
    }
    setUploadingId(row.id);
    try {
      const base64 = await fileToBase64(file);
      const { publicUrl } = await uploadImage({
        data: {
          base64,
          contentType: file.type as (typeof ALLOWED_TYPES)[number],
          folder: "sound-board",
        },
      });
      updateLocal(row.id, { thumbnail_url: publicUrl });
      const { error: saveError } = await supabase
        .from("sound_board_items" as any)
        .update({ thumbnail_url: publicUrl } as any)
        .eq("id", row.id);
      if (saveError) throw saveError;
      toast.success("Thumbnail uploaded");
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploadingId(null);
    }
  }


  function toggleOpen(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function sortRows(list: SoundBoardItem[]) {
    return [...list].sort((a, b) => {
      if (a.published !== b.published) return a.published ? -1 : 1;
      return a.position - b.position;
    });
  }

  async function persistOrder(next: SoundBoardItem[]) {
    const ordered = sortRows(next).map((r, i) => ({ ...r, position: i }));
    setRows(ordered);
    const changed = ordered.filter((r) => {
      const prev = rows.find((x) => x.id === r.id);
      return !prev || prev.position !== r.position;
    });
    for (const r of changed) {
      const { error } = await supabase
        .from("sound_board_items" as any)
        .update({ position: r.position } as any)
        .eq("id", r.id);
      if (error) { toast.error(error.message); return; }
    }
    if (changed.length) toast.success("Order saved");
  }

  function handleDrop(targetId: string) {
    const sourceId = dragId;
    setDragId(null);
    setOverId(null);
    if (!sourceId || sourceId === targetId) return;
    const current = sortRows(rows);
    const from = current.findIndex((r) => r.id === sourceId);
    const to = current.findIndex((r) => r.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...current];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    persistOrder(next.map((r, i) => ({ ...r, position: i })));
  }

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("sound_board_items" as any)
      .select("*")
      .order("position", { ascending: true });
    if (error) toast.error(error.message);
    setRows(sortRows(((data as any[]) ?? []) as SoundBoardItem[]));
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
    // unpublished cards drop to the bottom
    await persistOrder(rows);
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
        {rows.map((row, idx) => {
          const isOpen = openIds.has(row.id);
          return (
            <div
              key={row.id}
              onDragOver={(e) => { e.preventDefault(); if (dragId && overId !== row.id) setOverId(row.id); }}
              onDrop={(e) => { e.preventDefault(); handleDrop(row.id); }}
              className={`rounded-lg border transition-colors ${
                overId === row.id && dragId !== row.id ? "border-primary" : "border-border"
              } ${dragId === row.id ? "opacity-50" : ""}`}
            >
              <div className="flex items-center gap-2 p-3">
                <span
                  draggable
                  onDragStart={() => setDragId(row.id)}
                  onDragEnd={() => { setDragId(null); setOverId(null); }}
                  className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground p-1"
                  aria-label="Drag to reorder"
                  title="Drag to reorder"
                >
                  <GripVertical className="size-4" />
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleOpen(row.id)}
                  className="shrink-0"
                  aria-label={isOpen ? "Collapse" : "Expand"}
                >
                  {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </Button>
                <button
                  type="button"
                  onClick={() => toggleOpen(row.id)}
                  className="flex-1 text-left truncate font-medium"
                >
                  <span className="text-xs text-muted-foreground mr-2">#{idx + 1}</span>
                  {row.title || "Untitled"}
                </button>
                <span className="text-xs text-muted-foreground shrink-0">
                  {row.published ? "Published" : "Hidden"}
                </span>
              </div>
              {isOpen ? (
                <div className="border-t border-border p-4 space-y-3">
                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={row.title}
                        onChange={(e) => updateLocal(row.id, { title: e.target.value })}
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
                      <Label>Thumbnail image</Label>
                      <Input
                        placeholder="https://... (9:16 preferred)"
                        value={row.thumbnail_url ?? ""}
                        onChange={(e) => updateLocal(row.id, { thumbnail_url: e.target.value || null })}
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          id={`sb-file-${row.id}`}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (file) uploadCover(row, file);
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploadingId === row.id}
                          onClick={() => document.getElementById(`sb-file-${row.id}`)?.click()}
                        >
                          <Upload className="mr-1 size-4" />
                          {uploadingId === row.id ? "Uploading…" : "Upload image"}
                        </Button>
                        {row.thumbnail_url ? (
                          <img
                            src={row.thumbnail_url}
                            alt={`${row.title} thumbnail preview`}
                            className="h-12 w-[27px] rounded object-cover border border-border"
                            loading="lazy"
                          />
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Uploads are stored in the <code>sound-board/</code> folder of the
                        public images bucket, so you can also drop files there manually and
                        paste the public URL above.
                      </p>
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
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
