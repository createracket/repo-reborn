// Loose, case/whitespace/punctuation-insensitive name matcher used to decide
// whether a Spotify/Apple Music artist name matches the profile's own name.

function normalizeName(v: string | null | undefined): string {
  return (v ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

/**
 * Returns true when the fetched artist name is a plausible match for any of the
 * profile identifiers (username / display name / artist name). A loose match
 * only requires that one normalized string contains the other.
 */
export function isNameMatch(
  fetchedName: string | null | undefined,
  candidates: Array<string | null | undefined>,
): boolean {
  const f = normalizeName(fetchedName);
  if (!f) return true; // nothing to compare against — don't flag
  for (const c of candidates) {
    const n = normalizeName(c);
    if (!n) continue;
    if (n === f || n.includes(f) || f.includes(n)) return true;
  }
  return false;
}

export const MISMATCH_MESSAGE =
  "FYI as this profile doesn't seem to match your username, it'll be flagged with our admins to check.";
