export const BRIEF_VIDEO_SLOTS = [1, 2, 3, 4] as const;
export type BriefVideoSlot = (typeof BRIEF_VIDEO_SLOTS)[number];
export type BriefVideoFields = Record<string, string>;

export function canReorderBriefVideos(fields: BriefVideoFields): boolean {
  return BRIEF_VIDEO_SLOTS.filter((n) => fields[`video${n}`]?.trim()).length >= 2;
}

export function reorderBriefVideos(fields: BriefVideoFields, from: BriefVideoSlot, to: BriefVideoSlot): BriefVideoFields {
  const videos = BRIEF_VIDEO_SLOTS.map((n) => ({ url: fields[`video${n}`] ?? "", cover: fields[`video${n}_cover`] ?? "" }));
  const moved = videos.splice(from - 1, 1)[0];
  if (!moved) return fields;
  videos.splice(to - 1, 0, moved);
  const result = { ...fields };
  videos.forEach((video, index) => {
    result[`video${index + 1}`] = video.url;
    result[`video${index + 1}_cover`] = video.cover;
  });
  return result;
}