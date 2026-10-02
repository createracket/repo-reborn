// Client-safe field definitions for creator stats requests.
export const STATS_FIELDS = [
  { key: "views", label: "Views / plays", kind: "number" },
  { key: "reach", label: "Accounts reached", kind: "number" },
  { key: "impressions", label: "Impressions", kind: "number" },
  { key: "watch_time_hours", label: "Total watch time (hours)", kind: "number" },
  { key: "avg_watch_seconds", label: "Average watch time (seconds)", kind: "number" },
  { key: "likes", label: "Likes", kind: "number" },
  { key: "comments", label: "Comments", kind: "number" },
  { key: "shares", label: "Shares", kind: "number" },
  { key: "saves", label: "Saves", kind: "number" },
  { key: "profile_visits", label: "Profile visits", kind: "number" },
  { key: "follows", label: "Follows from this post", kind: "number" },
  { key: "top_countries", label: "Top countries", kind: "text" },
  { key: "age_split", label: "Audience age split", kind: "text" },
] as const;

export type StatsFieldKey = (typeof STATS_FIELDS)[number]["key"];
export const STATS_FIELD_KEYS = STATS_FIELDS.map((f) => f.key) as StatsFieldKey[];
export const DEFAULT_STATS_FIELDS: StatsFieldKey[] = ["views", "reach", "watch_time_hours", "shares", "saves"];
export const MAX_STATS_SCREENSHOTS = 3;
export const COMMUNITY_EMAIL = "community@createracket.com";

export type StatsAnswers = {
  values?: Partial<Record<StatsFieldKey, string>>;
  extracted?: Partial<Record<StatsFieldKey, string>>;
  note?: string;
  creator_name?: string;
};
