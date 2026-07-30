/**
 * Lightweight client + server safe profanity screen for member-authored copy.
 * Intentionally conservative: it blocks slurs and hard profanity, and ignores
 * mild language so real creative writing isn't rejected.
 */
const BLOCKED = [
  "cunt",
  "faggot",
  "fag",
  "nigger",
  "nigga",
  "retard",
  "tranny",
  "kike",
  "spic",
  "chink",
  "wetback",
  "paki",
  "raghead",
  "whore",
  "rapist",
  "childporn",
  "cp",
];

// Words that only match as whole words (short/ambiguous).
const WHOLE_WORD_ONLY = new Set(["fag", "cp", "spic", "chink", "paki"]);

function normalise(input: string): string {
  return input
    .toLowerCase()
    .replace(/[àáâãäå]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/[@]/g, "a")
    .replace(/\$/g, "s")
    .replace(/[^a-z\s]/g, " ");
}

/** Returns the first blocked term found, or null when the text is clean. */
export function findProfanity(text: string | null | undefined): string | null {
  if (!text) return null;
  const cleaned = normalise(text);
  const collapsed = cleaned.replace(/\s+/g, "");
  for (const term of BLOCKED) {
    if (WHOLE_WORD_ONLY.has(term)) {
      if (new RegExp(`\\b${term}\\b`).test(cleaned)) return term;
    } else if (collapsed.includes(term)) {
      return term;
    }
  }
  return null;
}

/** Convenience: screen several fields at once. */
export function screenFields(fields: Array<string | null | undefined>): string | null {
  for (const f of fields) {
    const hit = findProfanity(f);
    if (hit) return hit;
  }
  return null;
}

export const PROFANITY_MESSAGE =
  "That wording breaks our community guidelines — please edit it and try again.";
