/** Builder grouping only: never use Live status to filter a public calendar. */
export function calendarEntriesByLive<T extends { live?: boolean | null }>(entries: T[]) {
  return {
    active: entries.filter((entry) => entry.live !== true),
    live: entries.filter((entry) => entry.live === true),
  };
}