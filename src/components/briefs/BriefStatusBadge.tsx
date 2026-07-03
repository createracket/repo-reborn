import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const BRIEF_STATUSES = [
  "submitted",
  "in_review",
  "in_progress",
  "review_your_roster",
  "review_your_report",
] as const;

export type BriefStatus = (typeof BRIEF_STATUSES)[number];

export const BRIEF_STATUS_LABEL: Record<BriefStatus, string> = {
  submitted: "Submitted",
  in_review: "In review",
  in_progress: "In progress",
  review_your_roster: "Review your roster",
  review_your_report: "Review your report",
};

const STATUS_CLASSES: Record<BriefStatus, string> = {
  submitted: "bg-muted text-foreground border-border",
  in_review: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  in_progress: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  review_your_roster: "bg-primary/15 text-primary border-primary/30",
  review_your_report: "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30",
};

export function normalizeStatus(value: string | null | undefined): BriefStatus {
  return (BRIEF_STATUSES as readonly string[]).includes(value ?? "")
    ? (value as BriefStatus)
    : "submitted";
}

export function BriefStatusBadge({
  status,
  className,
  href,
}: {
  status: string | null | undefined;
  className?: string;
  /** When provided, the badge renders as a link (used for "Review your roster" → roster page). */
  href?: string | null;
}) {
  const s = normalizeStatus(status);
  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        STATUS_CLASSES[s],
        href ? "cursor-pointer hover:brightness-110 hover:underline" : "",
        className,
      )}
    >
      {BRIEF_STATUS_LABEL[s]}
    </Badge>
  );
  if (href) {
    return (
      <a href={href} className="inline-flex">
        {badge}
      </a>
    );
  }
  return badge;
}

export function BriefStatusSelect({
  value,
  onChange,
  disabled,
  className,
}: {
  value: string | null | undefined;
  onChange: (next: BriefStatus) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
}) {
  const s = normalizeStatus(value);
  return (
    <Select value={s} onValueChange={(v) => onChange(v as BriefStatus)} disabled={disabled}>
      <SelectTrigger className={cn("h-8 w-[180px] text-xs", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {BRIEF_STATUSES.map((opt) => (
          <SelectItem key={opt} value={opt} className="text-xs">
            {BRIEF_STATUS_LABEL[opt]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
