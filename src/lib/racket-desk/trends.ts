// Trend data source. Hybrid: currently returns curated demo trends,
// but the shape mirrors what a live TikTok/Instagram/YouTube aggregator
// would return so it can be swapped for a server function later.

export type Platform = "TikTok" | "Instagram" | "YouTube";
export type Region = "UK" | "US" | "AU" | "Global";
export type Category = "Music" | "Culture";

export interface TrendSource {
  label: string; // "@creator" or short descriptor
  url: string;
  plays?: string; // "2.4M"
}

export interface CreativeBreakdown {
  hook: string; // first 3 seconds
  structure: string; // beat / cut pattern
  audio: string; // sound treatment
  cta: string; // caption / on-screen text pattern
}

export interface Trend {
  id: string;
  title: string;
  format: string;
  platform: Platform;
  region: Region;
  category: Category;
  heat: number; // 0-100
  velocity: "Rising" | "Peaking" | "Steady";
  audience: string;
  soundOrHook: string;
  updated: string;
  isNew?: boolean;

  // Layered proof + copy
  creator: string; // "@handle"
  hookLine: string; // caption / hook of the exemplar post
  thumbGradient: string; // CSS gradient for the preview tile
  thumbEmoji: string; // single glyph as visual anchor
  sources: TrendSource[]; // 2-3 real example URLs (external)
  breakdown: CreativeBreakdown;
}

export const trends: Trend[] = [
  {
    id: "t1",
    title: "Sped-up snippet + backstage vlog",
    format: "Short-form montage",
    platform: "TikTok",
    region: "UK",
    category: "Music",
    heat: 94,
    velocity: "Rising",
    audience: "Gen Z indie fans",
    soundOrHook: "Pitched +4 chorus loops",
    updated: "2h ago",
    isNew: true,
    creator: "@backstage.lu",
    hookLine: "the moment the chorus hits… every single night",
    thumbGradient: "linear-gradient(135deg, #C6F24E 0%, #1a1a1a 100%)",
    thumbEmoji: "🎤",
    sources: [
      { label: "@backstage.lu · TikTok", url: "https://www.tiktok.com/discover/sped-up-songs", plays: "2.4M" },
      { label: "@tourdiary_uk · TikTok", url: "https://www.tiktok.com/tag/spedup", plays: "890K" },
      { label: "@lofi.raves · Reels", url: "https://www.instagram.com/explore/tags/spedup/", plays: "1.1M" },
    ],
    breakdown: {
      hook: "First 1.5s: raw crowd noise, then hard cut to pitched-up chorus.",
      structure: "3 backstage clips → drop → 1 crowd shot. Total 12–15s.",
      audio: "Chorus pitched +4 semitones, tempo +8%. No talking.",
      cta: "One line, lowercase, in the caption. No text on screen.",
    },
  },
  {
    id: "t2",
    title: "POV: first time hearing the drop",
    format: "Reaction cutaway",
    platform: "Instagram",
    region: "US",
    category: "Music",
    heat: 88,
    velocity: "Peaking",
    audience: "Pop / hyperpop 18–24",
    soundOrHook: "Original artist audio",
    updated: "5h ago",
    creator: "@popcrave.reacts",
    hookLine: "pov: you're hearing this for the first time and it's 3am",
    thumbGradient: "linear-gradient(135deg, #1a1a1a 0%, #C6F24E 100%)",
    thumbEmoji: "👀",
    sources: [
      { label: "@popcrave.reacts · Reels", url: "https://www.instagram.com/explore/tags/pov/", plays: "3.1M" },
      { label: "@hyperpop.daily · Reels", url: "https://www.instagram.com/explore/tags/hyperpop/", plays: "740K" },
      { label: "@firstlistens · TikTok", url: "https://www.tiktok.com/tag/firstlisten", plays: "1.6M" },
    ],
    breakdown: {
      hook: "Static POV shot, headphones on. Text overlay for 2s.",
      structure: "8s build (calm face) → sudden zoom on drop → hold 3s.",
      audio: "Original master, no edit. Drop at 00:08–00:10.",
      cta: "'pov: …' in lowercase overlay. No hashtags in overlay.",
    },
  },
  {
    id: "t3",
    title: "Tour diary in one minute",
    format: "Long-form Shorts",
    platform: "YouTube",
    region: "AU",
    category: "Culture",
    heat: 76,
    velocity: "Rising",
    audience: "Live-music travellers",
    soundOrHook: "Voiceover + ambient tour audio",
    updated: "6h ago",
    isNew: true,
    creator: "@tourbus.au",
    hookLine: "3 cities, 4 days, one very broken van",
    thumbGradient: "linear-gradient(135deg, #1a1a1a 0%, #C6F24E 100%)",
    thumbEmoji: "🚐",
    sources: [
      { label: "@tourbus.au · Shorts", url: "https://www.youtube.com/hashtag/tourdiary", plays: "420K" },
      { label: "@onthemove.mel · Shorts", url: "https://www.youtube.com/hashtag/tourvlog", plays: "310K" },
      { label: "@sydneysessions · Shorts", url: "https://www.youtube.com/hashtag/livemusic", plays: "195K" },
    ],
    breakdown: {
      hook: "Timestamp overlay ('day 1 · perth') on van shot. 2s.",
      structure: "5 city vignettes, ~9s each. Voiceover throughout.",
      audio: "Ambient location audio at 30%, voiceover on top.",
      cta: "End card: next city + date. No verbal CTA.",
    },
  },
  {
    id: "t4",
    title: "Lyric misheard challenge",
    format: "Text overlay meme",
    platform: "TikTok",
    region: "Global",
    category: "Culture",
    heat: 82,
    velocity: "Rising",
    audience: "Casual music fans",
    soundOrHook: "Trending 15s hook",
    updated: "9h ago",
    creator: "@mishearduk",
    hookLine: "i've been singing this wrong for 4 years apparently",
    thumbGradient: "linear-gradient(160deg, #2a2a2a 0%, #C6F24E 100%)",
    thumbEmoji: "🎧",
    sources: [
      { label: "@mishearduk · TikTok", url: "https://www.tiktok.com/tag/misheardlyrics", plays: "5.8M" },
      { label: "@lyricfails · TikTok", url: "https://www.tiktok.com/discover/misheard-lyrics", plays: "2.2M" },
    ],
    breakdown: {
      hook: "Text on screen: the wrong lyric. Song plays. 3s.",
      structure: "Wrong lyric (3s) → reveal correct (3s) → reaction (4s).",
      audio: "Song at full volume. No voiceover until reaction.",
      cta: "Pin the correct lyric in a comment for engagement.",
    },
  },
  {
    id: "t5",
    title: "Studio session, one take",
    format: "Vertical documentary",
    platform: "Instagram",
    region: "UK",
    category: "Music",
    heat: 71,
    velocity: "Steady",
    audience: "Producers & musicians",
    soundOrHook: "Room tone + reveal drop",
    updated: "12h ago",
    creator: "@livesessions.ldn",
    hookLine: "no autotune, no cuts. one take at abbey road.",
    thumbGradient: "linear-gradient(135deg, #1a1a1a 0%, #F5F1E8 100%)",
    thumbEmoji: "🎛️",
    sources: [
      { label: "@livesessions.ldn · Reels", url: "https://www.instagram.com/explore/tags/livesession/", plays: "680K" },
      { label: "@onetake.uk · Reels", url: "https://www.instagram.com/explore/tags/onetake/", plays: "290K" },
    ],
    breakdown: {
      hook: "Slow push-in on mic. Room tone only. 3s.",
      structure: "One continuous shot, 45–60s. No cuts.",
      audio: "Live recording. Peak at 65% for headroom.",
      cta: "Caption names the room + producer. No emoji.",
    },
  },
  {
    id: "t6",
    title: "Fit check to festival lineup",
    format: "Transition edit",
    platform: "TikTok",
    region: "AU",
    category: "Culture",
    heat: 68,
    velocity: "Rising",
    audience: "Festival-going 16–28",
    soundOrHook: "Bass-drop transition audio",
    updated: "14h ago",
    creator: "@fits.splendour",
    hookLine: "guess the lineup based on the fit",
    thumbGradient: "linear-gradient(135deg, #C6F24E 0%, #F5F1E8 100%)",
    thumbEmoji: "🕶️",
    sources: [
      { label: "@fits.splendour · TikTok", url: "https://www.tiktok.com/tag/festivalfit", plays: "1.3M" },
      { label: "@festfits.au · TikTok", url: "https://www.tiktok.com/discover/festival-outfit", plays: "560K" },
    ],
    breakdown: {
      hook: "Mirror selfie, fit reveal. Beat rising underneath. 2s.",
      structure: "3 fit reveals on drops → lineup poster on final drop.",
      audio: "Bass-drop transition sound. Sync cuts to the drop.",
      cta: "Caption asks: 'which day are you going?'",
    },
  },
];

export const stats = {
  trendsToday: 148,
  regionsCovered: 3,
  platformsTracked: 3,
  refreshedMinutesAgo: 42,
};
