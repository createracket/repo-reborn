/**
 * Roster builder "Order by date" ordering.
 * Soonest posting date first; creators with no posting date always sort to the bottom.
 */
export function compareRosterBySoonestDate(
  a: string | null | undefined,
  b: string | null | undefined,
  fallback: number,
): number {
  const da = a ?? "";
  const db = b ?? "";
  // Undated creators always sort to the bottom, soonest date first otherwise.
  if (!da && !db) return fallback;
  if (!da) return 1;
  if (!db) return -1;
  return da.localeCompare(db) || fallback;
}
