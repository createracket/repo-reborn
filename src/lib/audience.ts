/**
 * Shared audience maths.
 *
 * "Total social audience" = followers on social platforms only.
 * "Total fans" = social audience + streaming platform numbers (Spotify monthly
 * listeners, Apple Music followers).
 */

export type AudienceSource = {
  instagram_followers?: number | null;
  tiktok_followers?: number | null;
  youtube_subscribers?: number | null;
  twitch_followers?: number | null;
  facebook_followers?: number | null;
  x_followers?: number | null;
  custom_followers?: number | null;
  spotify_monthly_listens?: number | null;
  apple_music_followers?: number | null;
};

export function socialAudience(it: AudienceSource): number {
  return (
    (it.instagram_followers ?? 0) +
    (it.tiktok_followers ?? 0) +
    (it.youtube_subscribers ?? 0) +
    (it.twitch_followers ?? 0) +
    (it.facebook_followers ?? 0) +
    (it.x_followers ?? 0) +
    (it.custom_followers ?? 0)
  );
}

export function streamingAudience(it: AudienceSource): number {
  return (it.spotify_monthly_listens ?? 0) + (it.apple_music_followers ?? 0);
}

export function totalFans(it: AudienceSource): number {
  return socialAudience(it) + streamingAudience(it);
}
