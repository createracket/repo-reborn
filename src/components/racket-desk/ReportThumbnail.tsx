import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { resizeImageFile } from "@/lib/image-resize";
import { ThumbFrameControls } from "@/components/admin/ThumbFrameControls";
import { PlannerTile } from "@/components/dashboard/PlannerTile";
import { setReportThumbnail } from "@/lib/racket-desk/report-sharing.functions";
import { DEFAULT_THUMB_FRAME, readThumbFrame, type ThumbFrame } from "@/lib/thumb-frame";

interface Props {
  scanId: string;
  title: string;
  handle: string;
  initialUrl: string | null;
  initialFrame: unknown;
}

/** Admin: square planner thumbnail + framing for a listening report. */
export function ReportThumbnail({ scanId, title, handle, initialUrl, initialFrame }: Props) {
  const [url, setUrl] = useState<string>(initialUrl ?? "");
  const [frame, setFrame] = useState<ThumbFrame>(
    initialFrame ? readThumbFrame({ thumb_frame: initialFrame }) : DEFAULT_THUMB_FRAME,
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputId = `report-thumb-${scanId}`;

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const resized = await resizeImageFile(file, 720);
      const path = `listening-report-thumbs/${scanId}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("spotlight-images")
        .upload(path, resized, { cacheControl: "3600", upsert: false, contentType: resized.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("spotlight-images").getPublicUrl(path);
      setUrl(data.publicUrl);
      toast.success("Thumbnail uploaded — remember to save");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function save() {
    setSaving(true);
    try {
      await setReportThumbnail({
        data: { scanId, thumbnailUrl: url ? url : null, thumbFrame: frame },
      });
      toast.success("Thumbnail saved");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save thumbnail");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border p-5">
      <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        Planner thumbnail
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Square image shown on this report's tile in the Project planner.
      </p>

      <div className="mt-3 space-y-3">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className="w-full rounded-full border border-border bg-background px-4 py-2 text-sm focus:border-lime focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-2">
          <input id={inputId} type="file" accept="image/*" className="hidden" onChange={upload} />
          <button
            type="button"
            onClick={() => document.getElementById(inputId)?.click()}
            disabled={uploading}
            className="rounded-full border border-border px-4 py-2 text-xs hover:text-lime"
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
          {url ? (
            <button
              type="button"
              onClick={() => setUrl("")}
              className="rounded-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Remove
            </button>
          ) : null}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-full bg-lime px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            {saving ? "Saving…" : "Save thumbnail"}
          </button>
        </div>

        <ThumbFrameControls value={frame} onChange={setFrame} previewUrl={url || null} />

        <div>
          <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Planner preview
          </div>
          <PlannerTile
            thumb={url || null}
            frame={frame}
            title={title}
            subtitle={<>@{handle}</>}
            trailing={
              <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-medium !text-white">
                View your report
              </span>
            }
          />
        </div>
      </div>
    </div>
  );
}
