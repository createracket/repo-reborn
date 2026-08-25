import { useRef, useState } from "react";
import { Bold, Italic, Link2, List, Maximize2, Minimize2 } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichText } from "@/lib/rich-text";

/**
 * Textarea with a light formatting toolbar. Values are stored as plain text
 * with simple HTML (strong/em/a/ul) which spotlight & brief pages render.
 */
export function RichTextField({
  id,
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const [expanded, setExpanded] = useState(false);

  const wrap = (open: string, close: string, fallback = "text") => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || fallback;
    const next = value.slice(0, start) + open + selected + close + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + open.length, start + open.length + selected.length);
    });
  };

  const bulletList = () => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const lines = (selected || "item").split("\n").filter((l) => l.trim().length);
    const html = `<ul>\n${lines.map((l) => `  <li>${l.trim()}</li>`).join("\n")}\n</ul>`;
    onChange(value.slice(0, start) + html + value.slice(end));
    requestAnimationFrame(() => el.focus());
  };

  const btn =
    "inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition hover:text-foreground";

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <div className="flex items-center gap-1.5">
          <button type="button" className={btn} onClick={() => wrap("<strong>", "</strong>", "bold text")} title="Bold">
            <Bold className="size-3.5" />
          </button>
          <button type="button" className={btn} onClick={() => wrap("<em>", "</em>", "italic text")} title="Italic">
            <Italic className="size-3.5" />
          </button>
          <button
            type="button"
            className={btn}
            onClick={() => wrap('<a href="https://">', "</a>", "link text")}
            title="Link"
          >
            <Link2 className="size-3.5" />
          </button>
          <button type="button" className={btn} onClick={bulletList} title="Bullet list">
            <List className="size-3.5" />
          </button>
          <button
            type="button"
            className={btn}
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Shrink box" : "Expand box"}
          >
            {expanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </button>
        </div>
      </div>
      <Textarea
        id={id}
        ref={ref}
        rows={expanded ? Math.max(rows * 3, 16) : rows}
        value={value}
        placeholder={placeholder}
        className="resize-y"
        onChange={(e) => onChange(e.target.value)}
      />
      {value.trim() ? (
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Preview</div>
          <RichText value={value} className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground" />
        </div>
      ) : null}
    </div>
  );
}
