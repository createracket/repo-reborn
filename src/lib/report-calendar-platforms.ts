const BASE_PLATFORMS = ["IG", "TT", "YT", "Trial", "Story"] as const;

// Laylo is offered on every report builder's calendar inputs.
export function reportCalendarPlatforms(_slug?: string): readonly string[] {
  return [...BASE_PLATFORMS, "Laylo", "FB"];
}
