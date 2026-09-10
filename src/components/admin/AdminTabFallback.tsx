/** Skeleton shown while an admin tab's code downloads. */
export function AdminTabFallback() {
  return (
    <div className="animate-pulse space-y-3" aria-hidden>
      <div className="h-8 w-48 rounded bg-muted/60" />
      <div className="h-24 rounded-xl border border-border/60 bg-muted/30" />
      <div className="h-24 rounded-xl border border-border/60 bg-muted/30" />
    </div>
  );
}
