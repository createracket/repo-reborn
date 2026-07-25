export type Platform = "TikTok" | "Instagram" | "YouTube";
export type Region = "UK" | "US" | "AU";

export interface Profile {
  id: string;
  platform: Platform;
  handle: string;
  regions: Region[];
}

export interface DailyIdea {
  date: string; // YYYY-MM-DD
  hook: string;
  format: string;
  structure: string[];
  audio: string;
  cta: string;
  matchedTrend?: string;
}

export interface BankedIdea extends DailyIdea {
  id: string;
  bankedAt: string; // ISO timestamp
}

const PROFILES_KEY = "racket.profiles.v1";
const IDEA_KEY = "racket.dailyIdea.v1";
const BANK_KEY = "racket.bankedIdeas.v1";

export function loadProfiles(): Profile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PROFILES_KEY);
    return raw ? (JSON.parse(raw) as Profile[]) : [];
  } catch {
    return [];
  }
}

export function saveProfiles(profiles: Profile[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export function loadCachedIdea(): DailyIdea | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(IDEA_KEY);
    return raw ? (JSON.parse(raw) as DailyIdea) : null;
  } catch {
    return null;
  }
}

export function saveCachedIdea(idea: DailyIdea) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(IDEA_KEY, JSON.stringify(idea));
}

export function loadBankedIdeas(): BankedIdea[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BANK_KEY);
    return raw ? (JSON.parse(raw) as BankedIdea[]) : [];
  } catch {
    return [];
  }
}

export function saveBankedIdeas(ideas: BankedIdea[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BANK_KEY, JSON.stringify(ideas));
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export const PLATFORMS: Platform[] = ["TikTok", "Instagram", "YouTube"];
export const REGIONS: Region[] = ["UK", "US", "AU"];

