const BASE_PLATFORMS = ["IG", "TT", "YT", "Trial", "Story"] as const;

export function reportCalendarPlatforms(slug: string): readonly string[] {
  return slug === "stat-socials" || slug === "chats-socials"
    ? [...BASE_PLATFORMS, "Laylo"]
    : BASE_PLATFORMS;
}