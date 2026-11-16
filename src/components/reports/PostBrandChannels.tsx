import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { JUNGLE_CHANNELS, type CalendarBrandChannels } from "@/lib/report-calendar-channels";

export function PostBrandChannels({ postId, channels, thumbnails }: { postId: string; channels?: CalendarBrandChannels | null; thumbnails: CalendarBrandChannels }) {
  const [value, setValue] = useState<CalendarBrandChannels>(channels ?? {});
  const [saving, setSaving] = useState(false);
  return <div className="flex flex-wrap items-center gap-4 border-t border-border/60 py-3">
    <span className="text-xs font-medium text-muted-foreground">Co-posted channels</span>
    {JUNGLE_CHANNELS.map((channel) => <label key={channel} className="flex items-center gap-2 text-xs">
      <Switch aria-label={`Co-posted on ${channel}`} checked={value[channel]?.enabled ?? false} disabled={saving} onCheckedChange={async (enabled) => {
        const next = { ...value, [channel]: { enabled } };
        setSaving(true);
        const { error } = await supabase.from("campaign_report_posts").update({ brand_channels: next }).eq("id", postId);
        setSaving(false);
        if (error) { toast.error("Could not save co-post channels"); return; }
        setValue(next);
        toast.success("Co-post channels saved");
      }} />
      {thumbnails[channel]?.thumbnail_url && <img src={thumbnails[channel]?.thumbnail_url ?? ""} alt="" className="size-5 rounded object-cover" />}
      {channel}
    </label>)}
  </div>;
}

export function PostBrandIcons({ channels, thumbnails }: { channels?: CalendarBrandChannels | null; thumbnails: CalendarBrandChannels }) {
  const selected = JUNGLE_CHANNELS.filter((name) => channels?.[name]?.enabled && thumbnails[name]?.thumbnail_url);
  if (!selected.length) return null;
  return <span className="flex items-center gap-1" aria-label="Co-posted channels">{selected.map((name) => <img key={name} src={thumbnails[name]?.thumbnail_url ?? ""} alt={name} title={`Co-posted on ${name}`} className="size-5 shrink-0 rounded object-cover" />)}</span>;
}