export const JUNGLE_CHANNELS = ["Jungle Merch", "Merch Jungle"] as const;
export type JungleChannel = typeof JUNGLE_CHANNELS[number];
export type CalendarBrandChannels = Partial<Record<JungleChannel, { enabled: boolean; thumbnail_url?: string | null }>>;
export function channelThumbnails(events?: Array<{ brand_channels?: CalendarBrandChannels | null }> | null): CalendarBrandChannels {
  const result: CalendarBrandChannels = {};
  for (const event of events ?? []) for (const name of JUNGLE_CHANNELS) {
    const url = event.brand_channels?.[name]?.thumbnail_url;
    if (url) result[name] = { enabled: false, thumbnail_url: url };
  }
  return result;
}
export function calendarBrandChannels(slug: string): readonly JungleChannel[] {
  return slug === "jungle" ? JUNGLE_CHANNELS : [];
}
export function selectedCalendarChannels(channels?: CalendarBrandChannels | null) {
  return JUNGLE_CHANNELS.filter((name) => channels?.[name]?.enabled).map((name) => ({ name, thumbnail_url: channels?.[name]?.thumbnail_url ?? null }));
}/** Each channel uses one icon across the report: events missing a thumbnail borrow the one uploaded elsewhere. */
export function fillChannelThumbnails<T extends { brand_channels?: CalendarBrandChannels | null }>(events: T[]): T[] {
  const shared = channelThumbnails(events);
  return events.map((event) => {
    if (!event.brand_channels) return event;
    const next: CalendarBrandChannels = { ...event.brand_channels };
    for (const name of JUNGLE_CHANNELS) {
      const value = next[name];
      if (value && !value.thumbnail_url && shared[name]?.thumbnail_url) next[name] = { ...value, thumbnail_url: shared[name]!.thumbnail_url };
    }
    return { ...event, brand_channels: next };
  });
}
