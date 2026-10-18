type ReportPostOrder = {
  posted_at: string | null;
  created_at?: string | null;
  position: number;
};

/** An unknown publication date stays unknown; insertion time only orders the feed. */
export function reportPostTime(post: ReportPostOrder): number | null {
  for (const value of [post.posted_at, post.created_at]) {
    if (!value) continue;
    const time = new Date(value).getTime();
    if (Number.isFinite(time)) return time;
  }
  return null;
}

export function compareReportPosts(a: ReportPostOrder, b: ReportPostOrder): number {
  const ta = reportPostTime(a);
  const tb = reportPostTime(b);
  if (ta == null && tb == null) return a.position - b.position;
  if (ta == null) return 1;
  if (tb == null) return -1;
  return tb - ta;
}