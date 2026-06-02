// Blanket profanity / offensive-language filter applied across all user-submitted
// content (profiles, briefs, spotlights, contact, fan signups, interest notes).
// Curated list — covers common English profanity and slurs. Matches whole words
// (with common letter-substitution variants like @ -> a, 1 -> i, 0 -> o, $ -> s).

const BLOCKED_WORDS = [
  // profanity
  "fuck", "fucker", "fucking", "motherfucker", "shit", "bullshit", "bitch",
  "bastard", "asshole", "arsehole", "dick", "dickhead", "prick", "cock",
  "cocksucker", "cunt", "twat", "wanker", "bollocks", "piss", "pissed",
  "crap", "damn", "dammit", "douche", "douchebag", "jackass", "jerkoff",
  "slut", "whore", "skank",
  // slurs / hateful terms
  "faggot", "fag", "dyke", "tranny", "retard", "retarded", "nigger", "nigga",
  "chink", "spic", "kike", "gook", "wetback", "paki", "coon",
  // sexual
  "pussy", "pussies", "boner", "cum", "blowjob", "handjob", "rimjob",
  "anal", "porn", "pornhub", "xxx",
];

// Map common leet substitutions back to plain letters for matching.
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[@4]/g, "a")
    .replace(/[1!|]/g, "i")
    .replace(/0/g, "o")
    .replace(/[$5]/g, "s")
    .replace(/3/g, "e")
    .replace(/7/g, "t")
    .replace(/[^a-z\s]/g, " ");
}

const WORD_REGEX = new RegExp(
  `\\b(${BLOCKED_WORDS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
  "i",
);

export function findProfanity(text: unknown): string | null {
  if (typeof text !== "string" || !text) return null;
  const m = normalize(text).match(WORD_REGEX);
  return m ? m[1] : null;
}

/** Walks an object/array of values and returns the first offending word, or null. */
export function findProfanityIn(values: unknown): string | null {
  if (values == null) return null;
  if (typeof values === "string") return findProfanity(values);
  if (Array.isArray(values)) {
    for (const v of values) {
      const hit = findProfanityIn(v);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof values === "object") {
    for (const v of Object.values(values as Record<string, unknown>)) {
      const hit = findProfanityIn(v);
      if (hit) return hit;
    }
  }
  return null;
}

/**
 * Throws a user-friendly Error if any string in `values` contains a blocked word.
 * Use at form submission boundaries.
 */
export function assertClean(values: unknown, label = "submission"): void {
  const hit = findProfanityIn(values);
  if (hit) {
    throw new Error(
      `Please remove offensive or inappropriate language from your ${label} before continuing.`,
    );
  }
}
