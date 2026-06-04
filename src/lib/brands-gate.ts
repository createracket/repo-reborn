// Lightweight client-only access gate for /brands/* and /pricing/brands.
// Shared access code distributed manually to brand leads. Unlock persists
// 30 days on the device via localStorage.

const STORAGE_KEY = "racket.brandsGate.v1";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Optional override at build time. Default kept here so the gate works
// out of the box; treat the code as low-security (shared with leads).
const ACCESS_CODE =
  (import.meta.env.VITE_BRANDS_ACCESS_CODE as string | undefined)?.trim() ||
  "RACKET-BRANDS-2026";

function normalize(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function isBrandsUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const { unlockedAt } = JSON.parse(raw) as { unlockedAt: number };
    if (!unlockedAt) return false;
    if (Date.now() - unlockedAt > TTL_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function tryUnlockBrands(code: string): boolean {
  if (normalize(code) !== normalize(ACCESS_CODE)) return false;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ unlockedAt: Date.now() }),
    );
  } catch {
    /* ignore quota errors — gate will just re-prompt */
  }
  return true;
}

export function lockBrands() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}
