/** Strip private pricing and return only the explicitly shared rate. */
export function withVisibleRosterRate<T extends { budget: number | null; show_rate: boolean }>(item: T) {
  const { budget, show_rate, ...visibleItem } = item;
  return { ...visibleItem, rate: show_rate ? budget : null };
}