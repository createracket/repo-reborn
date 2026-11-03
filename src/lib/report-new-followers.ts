// Manually entered "new followers" gained from a report post.
// A post only counts as having an entry when a non-negative number was saved.
export function hasNewFollowers(p: { new_followers?: number | null }): boolean {
  return typeof p.new_followers === "number" && p.new_followers >= 0;
}

/**
 * "Followers" ordering on live reports: only posts with a new-followers entry,
 * most new followers first; ties fall back to the provided comparator.
 */
export function orderByNewFollowers<T>(
  items: T[],
  getPost: (item: T) => { new_followers?: number | null },
  tieBreak: (a: T, b: T) => number = () => 0,
): T[] {
  return items
    .filter((i) => hasNewFollowers(getPost(i)))
    .sort(
      (a, b) =>
        (getPost(b).new_followers as number) - (getPost(a).new_followers as number) || tieBreak(a, b),
    );
}
