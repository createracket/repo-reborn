import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_THUMB_FRAME,
  thumbFrameBgClass,
  thumbFrameImgStyle,
  type ThumbFrame,
} from "@/lib/thumb-frame";

interface Props {
  value: ThumbFrame;
  onChange: (next: ThumbFrame) => void;
  previewUrl?: string | null;
}

/** Framing controls for how a page's image is cropped in dashboard tiles. */
export function ThumbFrameControls({ value, onChange, previewUrl }: Props) {
  const frame = value ?? DEFAULT_THUMB_FRAME;
  const patch = (p: Partial<ThumbFrame>) => onChange({ ...frame, ...p });

  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="mb-1 text-sm font-medium">Dashboard thumbnail</div>
      <p className="mb-3 text-xs text-muted-foreground">
        Controls how this image sits in the 16:9 dashboard card. Square logos usually
        want “Fit whole image” on a black background.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Fit</Label>
            <Select value={frame.fit} onValueChange={(v) => patch({ fit: v as ThumbFrame["fit"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">Fill (crops to card)</SelectItem>
                <SelectItem value="contain">Fit whole image</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Background</Label>
            <Select value={frame.bg} onValueChange={(v) => patch({ bg: v as ThumbFrame["bg"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="card">Card default</SelectItem>
                <SelectItem value="black">Black</SelectItem>
                <SelectItem value="white">White</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Vertical position</Label>
            <Select
              value={frame.position}
              onValueChange={(v) => patch({ position: v as ThumbFrame["position"] })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Top</SelectItem>
                <SelectItem value="center">Centre</SelectItem>
                <SelectItem value="bottom">Bottom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Zoom</Label>
              <span className="text-xs text-muted-foreground">{Math.round(frame.zoom)}%</span>
            </div>
            <Slider
              value={[frame.zoom]}
              min={50}
              max={150}
              step={1}
              onValueChange={([z]) => patch({ zoom: z })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Preview</Label>
          <div className={`aspect-[16/9] w-full overflow-hidden rounded-lg ${thumbFrameBgClass(frame)}`}>
            {previewUrl ? (
              <img
                src={previewUrl}
                alt=""
                className="size-full"
                style={thumbFrameImgStyle(frame)}
              />
            ) : (
              <div className="flex size-full items-center justify-center text-[10px] uppercase tracking-wider text-muted-foreground">
                No image yet
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Matches the dashboard card exactly.
          </p>
        </div>
      </div>
    </div>
  );
}
