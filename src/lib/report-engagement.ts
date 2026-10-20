/** Non-video engagement excludes views, shares and saves. */
export function erByLikesAndComments(input: {
  likes: number | null;
  comments: number | null;
  followers: number | null;
  coFollowers?: number;
}): number | null {
  const followers = (input.followers ?? 0) + (input.coFollowers ?? 0);
  const total = (input.likes ?? 0) + (input.comments ?? 0);
  if (!Number.isFinite(followers) || followers <= 0 || !Number.isFinite(total) || total < 0) return null;
  if (input.likes == null && input.comments == null) return null;
  return (total / followers) * 100;
}