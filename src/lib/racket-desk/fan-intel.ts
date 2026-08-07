// Fan intel: sentiment on your posts + where the same fan clusters engage elsewhere.
// Currently curated demo data with a shape that mirrors what a real
// comment-scrape + clustering pipeline would return.

export type Sentiment = "love" | "hype" | "curious" | "critical" | "off-topic";

export interface FanComment {
  id: string;
  handle: string;
  avatar: string; // emoji stand-in
  text: string;
  sentiment: Sentiment;
  platform: "TikTok" | "Instagram" | "YouTube";
  post: string; // which of your posts they commented on
  postUrl?: string; // direct link to the post the comment sits on
  likes: number;
  when: string; // "2h", "1d"
}

export interface SentimentBucket {
  label: string;
  sentiment: Sentiment;
  share: number; // 0-100
  delta: number; // % change vs last week
  topPhrase: string;
}

export interface FanCluster {
  id: string;
  name: string; // "The lore heads"
  size: number; // # of fans in cluster
  vibe: string; // one-line description
  topSentiment: Sentiment;
  alsoEngagingWith: Array<{
    artist: string;
    platform: "TikTok" | "Instagram" | "YouTube";
    overlap: number; // % of cluster following
    signal: string; // "78% liked her last 3 posts"
  }>;
  hooks: string[]; // content angles that resonate
}

export interface ArtistFocus {
  id: string;
  name: string;
  handle: string;
  region: "UK" | "US" | "AU";
  platform?: string;
}


export const sentimentBreakdown: SentimentBucket[] = [
  { label: "Love it", sentiment: "love", share: 46, delta: 6, topPhrase: "obsessed with the bridge" },
  { label: "Hype / share", sentiment: "hype", share: 22, delta: 3, topPhrase: "putting this on repeat" },
  { label: "Curious", sentiment: "curious", share: 14, delta: -1, topPhrase: "who produced this?" },
  { label: "Critical", sentiment: "critical", share: 11, delta: -2, topPhrase: "mix feels muddy" },
  { label: "Off-topic", sentiment: "off-topic", share: 7, delta: -1, topPhrase: "reply guy energy" },
];

export const recentComments: FanComment[] = [
  {
    id: "c1",
    handle: "@sofia.plays",
    avatar: "🎧",
    text: "the way that bridge hits at 1:14 — actually unwell about this",
    sentiment: "love",
    platform: "TikTok",
    post: "Bridge teaser · TikTok",
    likes: 412,
    when: "2h",
  },
  {
    id: "c2",
    handle: "@dexinthebooth",
    avatar: "🎚️",
    text: "who's on the mix? drums sit weird on my monitors",
    sentiment: "critical",
    platform: "YouTube",
    post: "Live from RAK · YouTube",
    likes: 38,
    when: "5h",
  },
  {
    id: "c3",
    handle: "@rainepoems",
    avatar: "📓",
    text: "the lyric 'quiet like a warning' is going in my journal forever",
    sentiment: "love",
    platform: "Instagram",
    post: "Lyric card · IG",
    likes: 289,
    when: "8h",
  },
  {
    id: "c4",
    handle: "@lo.fi.kai",
    avatar: "🌙",
    text: "need a slowed + reverb version yesterday please",
    sentiment: "hype",
    platform: "TikTok",
    post: "Bridge teaser · TikTok",
    likes: 176,
    when: "10h",
  },
  {
    id: "c5",
    handle: "@fen.reads",
    avatar: "📚",
    text: "is the second verse about the same person as track 3?",
    sentiment: "curious",
    platform: "Instagram",
    post: "Album trailer · IG",
    likes: 94,
    when: "1d",
  },
  {
    id: "c6",
    handle: "@bexmakes",
    avatar: "🎬",
    text: "the transition at :22 taught me more than film school",
    sentiment: "hype",
    platform: "TikTok",
    post: "BTS reel · TikTok",
    likes: 521,
    when: "1d",
  },
];

export const fanClusters: FanCluster[] = [
  {
    id: "lore",
    name: "The lore heads",
    size: 1840,
    vibe: "Deep-dive fans who quote lyrics and connect songs to a bigger story.",
    topSentiment: "love",
    alsoEngagingWith: [
      { artist: "Phoebe Bridgers", platform: "Instagram", overlap: 74, signal: "commenting on lyric carousels" },
      { artist: "Ethel Cain", platform: "TikTok", overlap: 62, signal: "sharing 'story reveal' edits" },
      { artist: "Gracie Abrams", platform: "YouTube", overlap: 48, signal: "watching lyric breakdowns end-to-end" },
    ],
    hooks: [
      "Annotated lyric carousel — one line, one memory",
      "'What track 3 is really about' voiceover",
      "Reply to a top-liked lyric comment on camera",
    ],
  },
  {
    id: "gear",
    name: "Producer/gear crowd",
    size: 940,
    vibe: "Musicians and bedroom producers asking about mix, chain, and process.",
    topSentiment: "curious",
    alsoEngagingWith: [
      { artist: "Fred again..", platform: "Instagram", overlap: 81, signal: "saving studio BTS reels" },
      { artist: "Jacob Collier", platform: "YouTube", overlap: 55, signal: "watching >6min breakdowns" },
      { artist: "PinkPantheress", platform: "TikTok", overlap: 44, signal: "duetting 'how it was made'" },
    ],
    hooks: [
      "60-sec 'what's on the vocal chain' teardown",
      "Split-screen: demo vs final mix",
      "Answer the top gear question in the comments as a reel",
    ],
  },
  {
    id: "hype",
    name: "Reactive hype fans",
    size: 3120,
    vibe: "Sharers and reposters — first to duet, first to make edits.",
    topSentiment: "hype",
    alsoEngagingWith: [
      { artist: "Chappell Roan", platform: "TikTok", overlap: 69, signal: "using her sounds within 24h of drop" },
      { artist: "Confidence Man", platform: "Instagram", overlap: 51, signal: "reposting tour reels to stories" },
      { artist: "The Dare", platform: "TikTok", overlap: 47, signal: "commenting on club edits" },
    ],
    hooks: [
      "Drop an official sped-up snippet before fans do",
      "Seed a 3-second hook clip with on-screen 'use this sound'",
      "Repost the best fan edit with a personal caption",
    ],
  },
];

// Best-effort deep links for demo comments: profile links resolve from the
// platform + handle, post links fall back to the commenter's profile.
export function commentProfileUrl(c: FanComment): string {
  const handle = c.handle.replace(/^@/, "");
  switch (c.platform) {
    case "TikTok":
      return `https://www.tiktok.com/@${handle}`;
    case "Instagram":
      return `https://www.instagram.com/${handle}/`;
    case "YouTube":
      return `https://www.youtube.com/@${handle}`;
  }
}

export function commentPostUrl(c: FanComment): string {
  return c.postUrl ?? commentProfileUrl(c);
}

export const sentimentColor: Record<Sentiment, string> = {
  love: "bg-lime/20 text-lime border-lime/30",
  hype: "bg-blush/20 text-blush border-blush/30",
  curious: "bg-secondary text-foreground border-border",
  critical: "bg-muted text-muted-foreground border-border",
  "off-topic": "bg-muted/50 text-muted-foreground border-border",
};
