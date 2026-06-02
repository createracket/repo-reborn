// ============================================
// VIBE CHECK — rule-based scoring engine
// Rules are defined in code (logic + id + default points + human label).
// Point values are overridable at runtime from VibeCheckConfig.weights.
// ============================================

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { VibeCheckConfig } from "./vibe-check-config";
import {
  DEFAULT_ARTIST_ARCHETYPES,
  DEFAULT_BRAND_ARCHETYPES,
  mergeVibeConfig,
} from "./vibe-check-config";

// ============================================
// Helpers
// ============================================

function containsKeywords(text: string | undefined, keywords: string[]) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

// contentComfortLevel arrives as "1 (Not at all)" .. "5 (Very comfortable)".
function comfort(level: any): number {
  if (typeof level === "number") return level;
  if (typeof level !== "string") return 0;
  const n = parseInt(level, 10);
  return Number.isNaN(n) ? 0 : n;
}

export type ScoringRule = {
  id: string;
  label: string;
  points: number;
  when: (d: any) => boolean;
};

// ============================================
// ARTIST RULES (musician → archetype)
// ============================================

export const ARTIST_ARCHETYPE_KEYS = [
  "loyalist",
  "changemaker",
  "curator",
  "builder",
  "liveWire",
  "maker",
  "advocate",
] as const;
export type ArtistArchetypeKey = (typeof ARTIST_ARCHETYPE_KEYS)[number];

export const ARTIST_RULES: Record<ArtistArchetypeKey, ScoringRule[]> = {
  loyalist: [
    { id: "goal_deepen_engagement", label: 'Goal: "Deepen fan engagement"', points: 20, when: (d) => d.goals?.includes("Deepen fan engagement") },
    { id: "support_connect_creators", label: 'Support: "Connect with creators or collaborators"', points: 15, when: (d) => d.support?.includes("Connect with creators or collaborators") },
    { id: "story_engagement_words", label: "Story mentions community/fans + comfort ≥ 3", points: 15, when: (d) => comfort(d.contentComfortLevel) >= 3 && containsKeywords(d.story, ["engagement", "connection", "community", "fans"]) },
    { id: "audience_engaged_words", label: "Audience snapshot mentions engagement/community", points: 20, when: (d) => containsKeywords(d.audienceSnapshot, ["engaged", "engagement", "community", "loyal"]) },
    { id: "support_industry_intros", label: 'Support: "Industry intros & networking"', points: 10, when: (d) => d.support?.includes("Industry intros & networking") },
    { id: "interest_parenting", label: "Interest: Parenting/Family", points: 5, when: (d) => d.interests?.includes("Parenting/Family") },
    { id: "interest_mental_health", label: "Interest: Mental Health", points: 5, when: (d) => d.interests?.includes("Mental Health") },
    { id: "interest_arts_culture", label: "Interest: Arts & Culture", points: 5, when: (d) => d.interests?.includes("Arts & Culture") },
    { id: "tellusmore_fans", label: 'Tell us more mentions "fans/community/relationships"', points: 10, when: (d) => containsKeywords(d.tellUsMore, ["fans", "community", "connection", "relationships"]) },
    { id: "goal_grow_without_profile", label: '"Grow audience" without "Increase profile"', points: 5, when: (d) => d.goals?.includes("Grow my audience & streams") && !d.goals?.includes("Increase profile or recognition") },
    { id: "artist_type_band", label: "Artist type: In a band / Both", points: 3, when: (d) => d.artistType?.includes("In a band") || d.artistType?.includes("Both") },
    { id: "has_upcoming_shows", label: "Has upcoming shows", points: 3, when: (d) => d.upcomingShows && d.upcomingShows.length > 0 },
    { id: "penalty_only_profile_goal", label: "Penalty: only goal is profile/recognition", points: -10, when: (d) => d.goals?.includes("Increase profile or recognition") && d.goals?.length === 1 },
  ],
  changemaker: [
    { id: "sustainability_very_important", label: "Sustainability: Very important", points: 25, when: (d) => d.sustainabilityImportance === "Very important" },
    { id: "eco_brands_definitely", label: "Eco-conscious brands: Yes, definitely", points: 25, when: (d) => d.ecoConsciousBrands === "Yes, definitely" },
    { id: "interest_sustainability", label: "Interest: Sustainability/Environment", points: 15, when: (d) => d.interests?.includes("Sustainability/Environment") },
    { id: "interest_first_nations", label: "Interest: First Nations", points: 15, when: (d) => d.interests?.includes("First Nations") },
    { id: "representation_very_important", label: "Representation: Very important", points: 15, when: (d) => d.representationImportance === "Very important" },
    { id: "sustainability_important", label: "Sustainability: Important", points: 10, when: (d) => d.sustainabilityImportance === "Important" },
    { id: "eco_brands_when_possible", label: "Eco-conscious brands: Yes, when possible", points: 10, when: (d) => d.ecoConsciousBrands === "Yes, when possible" },
    { id: "interest_lgbtqia", label: "Interest: LGBTQIA+", points: 5, when: (d) => d.interests?.includes("LGBTQIA+") },
    { id: "interest_arts_culture", label: "Interest: Arts & Culture", points: 5, when: (d) => d.interests?.includes("Arts & Culture") },
    { id: "has_cause_or_charity", label: "Has a cause or charity", points: 5, when: (d) => d.causeOrCharity && d.causeOrCharity.length > 0 },
    { id: "interest_vegan", label: "Interest: Vegan/Vegetarian", points: 8, when: (d) => d.interests?.includes("Vegan/Vegetarian") },
    { id: "interest_current_events", label: "Interest: Current Events", points: 5, when: (d) => d.interests?.includes("Current Events") },
    { id: "interest_education", label: "Interest: Education/Learning", points: 5, when: (d) => d.interests?.includes("Education/Learning") },
    { id: "tellusmore_values", label: 'Tell us more mentions "values/mission/impact"', points: 10, when: (d) => containsKeywords(d.tellUsMore, ["values", "mission", "impact", "change", "purpose"]) },
    { id: "brand_partner_aligned", label: 'Support brand partnerships + "align/values"', points: 5, when: (d) => d.support?.includes("Brand partnerships") && containsKeywords(d.tellUsMore, ["align", "values"]) },
    { id: "interest_wellness", label: "Interest: Wellness", points: 3, when: (d) => d.interests?.includes("Wellness") },
    { id: "story_social_justice", label: 'Story mentions social/justice/equality', points: 5, when: (d) => containsKeywords(d.story, ["social", "justice", "equality", "representation"]) },
    { id: "penalty_all_support_no_values", label: 'Penalty: "All of the above" support, no values mentioned', points: -5, when: (d) => d.support?.includes("All of the above") && !containsKeywords(d.tellUsMore, ["values", "mission"]) },
    { id: "penalty_sustainability_not_priority", label: "Penalty: Sustainability not a priority", points: -15, when: (d) => d.sustainabilityImportance === "Not a priority" },
  ],
  curator: [
    { id: "interest_fashion_luxury", label: "Interest: Fashion (designer, luxury)", points: 20, when: (d) => d.interests?.includes("Fashion (designer, luxury)") },
    { id: "interest_fashion_casual", label: "Interest: Fashion (casual, streetwear)", points: 20, when: (d) => d.interests?.includes("Fashion (casual, streetwear)") },
    { id: "detailed_aesthetic", label: "Detailed creative aesthetic (>50 chars)", points: 20, when: (d) => d.creativeAesthetic && d.creativeAesthetic.length > 50 },
    { id: "interest_photography", label: "Interest: Photography/Videography", points: 15, when: (d) => d.interests?.includes("Photography/Videography") },
    { id: "interest_fine_art", label: "Interest: Fine Art", points: 15, when: (d) => d.interests?.includes("Fine Art") },
    { id: "interest_interior_design", label: "Interest: Interior Design", points: 15, when: (d) => d.interests?.includes("Interior Design") },
    { id: "comfort_high", label: "Content comfort ≥ 4", points: 10, when: (d) => comfort(d.contentComfortLevel) >= 4 },
    { id: "interest_arts_crafts", label: "Interest: Arts & Crafts", points: 5, when: (d) => d.interests?.includes("Arts & Crafts") },
    { id: "interest_books", label: "Interest: Books/Reading", points: 5, when: (d) => d.interests?.includes("Books/Reading") },
    { id: "goal_profile", label: 'Goal: "Increase profile or recognition"', points: 10, when: (d) => d.goals?.includes("Increase profile or recognition") },
    { id: "aesthetic_visual_words", label: "Aesthetic mentions visual/aesthetic/style", points: 10, when: (d) => containsKeywords(d.creativeAesthetic, ["visual", "aesthetic", "style", "look", "design"]) },
    { id: "story_visual_words", label: "Story mentions visual/aesthetic/fashion", points: 8, when: (d) => containsKeywords(d.story, ["visual", "aesthetic", "style", "fashion", "design"]) },
    { id: "interest_movies", label: "Interest: Movies", points: 3, when: (d) => d.interests?.includes("Movies") },
    { id: "interest_travel", label: "Interest: Travel", points: 3, when: (d) => d.interests?.includes("Travel") },
    { id: "genres_visual", label: "Genres mention visual/aesthetic/cinematic", points: 5, when: (d) => containsKeywords(d.genres, ["visual", "aesthetic", "cinematic"]) },
    { id: "penalty_no_aesthetic", label: "Penalty: no creative aesthetic", points: -10, when: (d) => !d.creativeAesthetic || d.creativeAesthetic.length === 0 },
    { id: "penalty_low_comfort", label: "Penalty: comfort ≤ 2", points: -5, when: (d) => comfort(d.contentComfortLevel) <= 2 },
  ],
  builder: [
    { id: "support_all", label: 'Support: "All of the above"', points: 25, when: (d) => d.support?.includes("All of the above") },
    { id: "interest_business", label: "Interest: Business/Finance", points: 20, when: (d) => d.interests?.includes("Business/Finance") },
    { id: "indie_plus_connections", label: "Independent + goal: build industry connections", points: 20, when: (d) => d.currentDeals?.includes("independent") && d.goals?.includes("Build industry connections") },
    { id: "goal_funding", label: 'Goal: "Secure funding for a project"', points: 15, when: (d) => d.goals?.includes("Secure funding for a project") },
    { id: "current_deals_management", label: "Current deal: Management / Brand partnership agency", points: 15, when: (d) => d.currentDeals?.includes("Management") || d.currentDeals?.includes("Brand / partnership agency") },
    { id: "support_breadth", label: "Selected 4+ support options", points: 10, when: (d) => d.support && d.support.length >= 4 },
    { id: "support_strategy", label: 'Support: "Strategy, analytics or audience growth"', points: 10, when: (d) => d.support?.includes("Strategy, analytics or audience growth") },
    { id: "interest_tech", label: "Interest: Tech/Gadgets", points: 8, when: (d) => d.interests?.includes("Tech/Gadgets") },
    { id: "goal_connections", label: 'Goal: "Build industry connections"', points: 10, when: (d) => d.goals?.includes("Build industry connections") },
    { id: "tellusmore_business", label: 'Tell us more mentions business/growth/revenue', points: 10, when: (d) => containsKeywords(d.tellUsMore, ["business", "growth", "building", "scaling", "revenue"]) },
    { id: "goals_breadth", label: "Selected 5+ goals", points: 8, when: (d) => d.goals && d.goals.length >= 5 },
    { id: "contract_negotiations", label: "Record contract: in negotiations", points: 5, when: (d) => d.recordContract === "Currently in negotiations" },
    { id: "tellusmore_urgent", label: 'Tell us more mentions "timeline/urgent/asap"', points: 5, when: (d) => containsKeywords(d.tellUsMore, ["timeline", "urgent", "asap"]) },
    { id: "interest_crypto", label: "Interest: Crypto/Web3", points: 5, when: (d) => d.interests?.includes("Crypto/Web3") },
    { id: "penalty_low_comfort_no_team", label: "Penalty: low comfort, no mention of team/support", points: -5, when: (d) => comfort(d.contentComfortLevel) <= 2 && !containsKeywords(d.tellUsMore, ["team", "support", "help"]) },
    { id: "penalty_narrow_support", label: "Penalty: ≤2 support options selected", points: -8, when: (d) => d.support && d.support.length <= 2 },
  ],
  liveWire: [
    { id: "goal_touring", label: 'Goal: "Expand live shows / touring"', points: 25, when: (d) => d.goals?.includes("Expand live shows / touring") },
    { id: "many_upcoming_shows", label: ">20 upcoming shows", points: 20, when: (d) => d.upcomingShows && d.upcomingShows.length > 20 },
    { id: "regional_or_intl", label: "Target market: Regional or International", points: 15, when: (d) => d.targetMarkets?.includes("Regional") || d.targetMarkets?.includes("International") },
    { id: "tellusmore_tour", label: 'Tell us more mentions tour/festival/live', points: 15, when: (d) => containsKeywords(d.tellUsMore, ["tour", "touring", "festival", "live"]) },
    { id: "interest_sports", label: "Interest: Sports", points: 8, when: (d) => d.interests?.includes("Sports") },
    { id: "interest_outdoor", label: "Interest: Outdoor/Adventure", points: 8, when: (d) => d.interests?.includes("Outdoor/Adventure") },
    { id: "interest_travel", label: "Interest: Travel", points: 10, when: (d) => d.interests?.includes("Travel") },
    { id: "interest_automotive", label: "Interest: Automotive", points: 5, when: (d) => d.interests?.includes("Automotive") },
    { id: "support_connect_creators", label: 'Support: "Connect with creators or collaborators"', points: 8, when: (d) => d.support?.includes("Connect with creators or collaborators") },
    { id: "artist_band_both", label: "Artist type: In a band / Both", points: 8, when: (d) => d.artistType?.includes("In a band") || d.artistType?.includes("Both") },
    { id: "tellusmore_live_energy", label: 'Tell us more mentions live/performance/stage', points: 10, when: (d) => containsKeywords(d.tellUsMore, ["tour", "live", "performance", "energy", "stage"]) },
    { id: "many_target_markets", label: "Selected 3+ target markets", points: 5, when: (d) => d.targetMarkets && d.targetMarkets.length >= 3 },
    { id: "story_festival_tour", label: "Story mentions festival/tour/live", points: 5, when: (d) => containsKeywords(d.story, ["festival", "tour", "live"]) },
    { id: "artist_solo", label: "Artist type: Solo artist", points: 3, when: (d) => d.artistType?.includes("Solo artist") },
    { id: "interest_food", label: "Interest: Food", points: 3, when: (d) => d.interests?.includes("Food") },
    { id: "penalty_no_shows_no_touring", label: "Penalty: no shows + no touring goal", points: -15, when: (d) => !d.upcomingShows && !d.goals?.includes("Expand live shows / touring") },
    { id: "penalty_only_studio_goal", label: "Penalty: only goal mentions studio", points: -8, when: (d) => d.goals?.length === 1 && d.goals[0]?.includes("studio") },
  ],
  maker: [
    { id: "artist_dj_producer", label: "Artist type: DJ / Producer", points: 25, when: (d) => d.artistType?.includes("DJ") || d.artistType?.includes("Producer") },
    { id: "interest_tech", label: "Interest: Tech/Gadgets", points: 20, when: (d) => d.interests?.includes("Tech/Gadgets") },
    { id: "support_creative_content", label: 'Support: "Creative content (video, photo)"', points: 15, when: (d) => d.support?.includes("Creative content (video, photo)") },
    { id: "interest_gaming", label: "Interest: Gaming", points: 15, when: (d) => d.interests?.includes("Gaming") },
    { id: "interest_photography", label: "Interest: Photography/Videography", points: 10, when: (d) => d.interests?.includes("Photography/Videography") },
    { id: "artist_songwriter_composer", label: "Artist type: Songwriter / Composer", points: 10, when: (d) => d.artistType?.includes("Songwriter") || d.artistType?.includes("Composer") },
    { id: "comfort_high", label: "Content comfort ≥ 4", points: 8, when: (d) => comfort(d.contentComfortLevel) >= 4 },
    { id: "support_strategy", label: 'Support: "Strategy, analytics or audience growth"', points: 8, when: (d) => d.support?.includes("Strategy, analytics or audience growth") },
    { id: "aesthetic_production", label: "Aesthetic mentions production/technical/studio", points: 10, when: (d) => containsKeywords(d.creativeAesthetic, ["production", "technical", "gear", "studio"]) },
    { id: "genres_production", label: "Genres mention production/electronic/beat", points: 8, when: (d) => containsKeywords(d.genres, ["production", "electronic", "beat", "produced"]) },
    { id: "story_production", label: "Story mentions production/studio/gear", points: 5, when: (d) => containsKeywords(d.story, ["production", "studio", "gear", "software"]) },
    { id: "artist_session", label: "Artist type: Session musician", points: 5, when: (d) => d.artistType?.includes("Session musician") },
    { id: "interest_business", label: "Interest: Business/Finance", points: 3, when: (d) => d.interests?.includes("Business/Finance") },
    { id: "interest_diy", label: "Interest: DIY/Home Improvements", points: 3, when: (d) => d.interests?.includes("DIY/Home Improvements") },
    { id: "penalty_no_tech_no_producer", label: "Penalty: no tech interest and not a producer", points: -10, when: (d) => !d.interests?.includes("Tech/Gadgets") && !d.artistType?.includes("Producer") },
    { id: "penalty_low_comfort_no_producer", label: "Penalty: low comfort and not a producer", points: -8, when: (d) => comfort(d.contentComfortLevel) <= 2 && !d.artistType?.includes("Producer") },
  ],
  advocate: [
    { id: "interest_mental_health", label: "Interest: Mental Health", points: 25, when: (d) => d.interests?.includes("Mental Health") },
    { id: "underrep_neurodivergent", label: "Underrepresented: Neurodivergent", points: 20, when: (d) => d.underrepresentedCommunities?.includes("Neurodivergent") },
    { id: "any_underrep", label: "Identifies with any underrepresented community", points: 15, when: (d) => d.underrepresentedCommunities && d.underrepresentedCommunities.length > 0 },
    { id: "representation_very_important", label: "Representation: Very important", points: 15, when: (d) => d.representationImportance === "Very important" },
    { id: "interest_wellness", label: "Interest: Wellness", points: 20, when: (d) => d.interests?.includes("Wellness") },
    { id: "interest_health_beauty", label: "Interest: Health/Beauty", points: 8, when: (d) => d.interests?.includes("Health/Beauty") },
    { id: "interest_vegan", label: "Interest: Vegan/Vegetarian", points: 8, when: (d) => d.interests?.includes("Vegan/Vegetarian") },
    { id: "interest_fitness", label: "Interest: Fitness", points: 8, when: (d) => d.interests?.includes("Fitness") },
    { id: "lgbtqia", label: "LGBTQIA+ interest or community", points: 10, when: (d) => d.interests?.includes("LGBTQIA+") || d.underrepresentedCommunities?.includes("LGBTQIA+") },
    { id: "tellusmore_vulnerable", label: 'Tell us more mentions vulnerable/authentic/real', points: 10, when: (d) => containsKeywords(d.tellUsMore, ["vulnerable", "authentic", "real", "honest", "mental health"]) },
    { id: "interest_sustainability", label: "Interest: Sustainability/Environment", points: 5, when: (d) => d.interests?.includes("Sustainability/Environment") },
    { id: "interest_parenting", label: "Interest: Parenting/Family", points: 5, when: (d) => d.interests?.includes("Parenting/Family") },
    { id: "interest_books", label: "Interest: Books/Reading", points: 3, when: (d) => d.interests?.includes("Books/Reading") },
    { id: "interest_podcasts", label: "Interest: Podcasts", points: 3, when: (d) => d.interests?.includes("Podcasts") },
    { id: "aesthetic_raw", label: 'Aesthetic mentions raw/unfiltered/honest', points: 5, when: (d) => containsKeywords(d.creativeAesthetic, ["raw", "unfiltered", "honest", "real"]) },
    { id: "story_mental_health", label: 'Story mentions mental health/wellness/vulnerable', points: 5, when: (d) => containsKeywords(d.story, ["mental health", "wellness", "authentic", "vulnerable"]) },
    { id: "penalty_no_wellness_interests", label: "Penalty: no wellness-adjacent interests", points: -10, when: (d) => !d.interests?.some((i: string) => ["Mental Health", "Wellness", "Health/Beauty", "Fitness"].includes(i)) },
  ],
};

// ============================================
// BRAND RULES
// ============================================

export const BRAND_ARCHETYPE_KEYS = [
  "communityFirst",
  "innovationPartner",
  "valuesLed",
  "cultureDriver",
  "performanceFocused",
] as const;
export type BrandArchetypeKey = (typeof BRAND_ARCHETYPE_KEYS)[number];

export const BRAND_RULES: Record<BrandArchetypeKey, ScoringRule[]> = {
  communityFirst: [
    { id: "value_community", label: 'Brand value: "Community & connection"', points: 25, when: (d) => (d.brandValues || []).includes("Community & connection") },
    { id: "value_authenticity", label: 'Brand value: "Authenticity & realness"', points: 20, when: (d) => (d.brandValues || []).includes("Authenticity & realness") },
    { id: "goal_engagement", label: 'Primary goal: Engagement (build community)', points: 25, when: (d) => d.primaryGoal === "Engagement (build community and connection)" },
  ],
  innovationPartner: [
    { id: "value_innovation", label: 'Brand value: "Innovation & creativity"', points: 25, when: (d) => (d.brandValues || []).includes("Innovation & creativity") },
    { id: "value_quality", label: 'Brand value: "Quality & craftsmanship"', points: 15, when: (d) => (d.brandValues || []).includes("Quality & craftsmanship") },
    { id: "goal_content_creation", label: 'Primary goal: Content creation (UGC)', points: 20, when: (d) => d.primaryGoal === "Content creation (UGC, social content)" },
    { id: "industry_tech_gaming", label: "Industry: Tech / Gaming", points: 15, when: (d) => ["Tech & Gadgets", "Gaming & Esports"].some((c) => (d.industry || "").includes(c)) },
  ],
  valuesLed: [
    { id: "value_sustainability", label: 'Brand value: Sustainability', points: 25, when: (d) => (d.brandValues || []).includes("Sustainability & environmental responsibility") },
    { id: "value_diversity", label: 'Brand value: Diversity & inclusion', points: 20, when: (d) => (d.brandValues || []).includes("Diversity & inclusion") },
    { id: "value_social_impact", label: 'Brand value: Social impact & purpose', points: 15, when: (d) => (d.brandValues || []).includes("Social impact & purpose") },
    { id: "industry_sustainability_wellness", label: "Industry: Sustainability / Wellness", points: 15, when: (d) => ["Sustainability & Eco-Conscious", "Wellness & Lifestyle"].some((c) => (d.industry || "").includes(c)) },
  ],
  cultureDriver: [
    { id: "value_fun", label: 'Brand value: Fun & entertainment', points: 20, when: (d) => (d.brandValues || []).includes("Fun & entertainment") },
    { id: "value_luxury", label: 'Brand value: Luxury & aspiration', points: 15, when: (d) => (d.brandValues || []).includes("Luxury & aspiration") },
    { id: "goal_brand_awareness", label: "Primary goal: Brand awareness", points: 20, when: (d) => d.primaryGoal === "Brand awareness (reach new audiences)" },
    { id: "industry_fashion_arts", label: "Industry: Fashion / Arts & Culture", points: 15, when: (d) => ["Fashion & Lifestyle", "Arts & Culture"].some((c) => (d.industry || "").includes(c)) },
  ],
  performanceFocused: [
    { id: "goal_purchases", label: "Primary goal: Drive purchases/conversions", points: 30, when: (d) => d.primaryGoal === "Drive purchases or conversions" },
  ],
};

// ============================================
// Scoring engine
// ============================================

function runRules(
  rules: ScoringRule[],
  data: any,
  weightOverrides?: Record<string, number>,
): number {
  let score = 0;
  for (const rule of rules) {
    if (rule.when(data)) {
      const pts = weightOverrides && rule.id in weightOverrides ? weightOverrides[rule.id] : rule.points;
      score += pts;
    }
  }
  return Math.max(0, Math.min(100, score));
}

// ---------- Musician (artist) ----------

function assignArchetypes(
  scores: Record<ArtistArchetypeKey, number>,
  archetypeNames: Record<ArtistArchetypeKey, string>,
) {
  const sortedScores = (Object.entries(scores) as [ArtistArchetypeKey, number][])
    .map(([archetype, score]) => ({ archetype, score }))
    .sort((a, b) => b.score - a.score);

  const highScorers = sortedScores.filter((s) => s.score >= 35);
  const isMultiHyphenate = highScorers.length >= 3;

  const primary: ArtistArchetypeKey = sortedScores[0].score >= 40 ? sortedScores[0].archetype : "builder";

  let secondary: ArtistArchetypeKey | null = null;
  if (sortedScores[1] && sortedScores[1].score >= 30 && sortedScores[0].score - sortedScores[1].score >= 15) {
    secondary = sortedScores[1].archetype;
  }
  if (sortedScores[1] && sortedScores[0].score - sortedScores[1].score < 10 && sortedScores[0].score >= 35 && sortedScores[1].score >= 35) {
    secondary = sortedScores[1].archetype;
  }

  return {
    primary: archetypeNames[primary],
    secondary: secondary ? archetypeNames[secondary] : null,
    isMultiHyphenate,
    allScores: scores,
    sortedScores: sortedScores.map((s) => ({ archetype: archetypeNames[s.archetype], score: s.score })),
  };
}

export function calculateVibeScore(surveyData: any, config?: VibeCheckConfig) {
  const cfg = mergeVibeConfig(config);
  const scores = {} as Record<ArtistArchetypeKey, number>;
  for (const key of ARTIST_ARCHETYPE_KEYS) {
    scores[key] = runRules(ARTIST_RULES[key], surveyData, cfg.weights.artist[key]);
  }
  const archetypeNames = {} as Record<ArtistArchetypeKey, string>;
  for (const key of ARTIST_ARCHETYPE_KEYS) {
    archetypeNames[key] = cfg.artistArchetypes[key]?.name ?? DEFAULT_ARTIST_ARCHETYPES[key].name;
  }
  return assignArchetypes(scores, archetypeNames);
}

// ---------- Brand ----------

function determineBrandArchetype(data: any, config: VibeCheckConfig) {
  const scores = {} as Record<BrandArchetypeKey, number>;
  for (const key of BRAND_ARCHETYPE_KEYS) {
    // Brand rules can stack across archetypes (one rule per archetype), no cap from runRules either way.
    let s = 0;
    for (const rule of BRAND_RULES[key]) {
      if (rule.when(data)) {
        const overrides = config.weights.brand[key];
        const pts = overrides && rule.id in overrides ? overrides[rule.id] : rule.points;
        s += pts;
      }
    }
    scores[key] = s;
  }

  const top = (Object.entries(scores) as [BrandArchetypeKey, number][])
    .sort((a, b) => b[1] - a[1])[0];

  const meta = config.brandArchetypes[top[0]] ?? DEFAULT_BRAND_ARCHETYPES[top[0]];
  return {
    type: meta.name,
    score: top[1],
    description: meta.description,
    allScores: scores,
  };
}

function calculateArtistMatches(data: any, config: VibeCheckConfig) {
  const matches: Record<ArtistArchetypeKey, { score: number; reasons: string[] }> = {
    loyalist: { score: 0, reasons: [] },
    changemaker: { score: 0, reasons: [] },
    curator: { score: 0, reasons: [] },
    builder: { score: 0, reasons: [] },
    liveWire: { score: 0, reasons: [] },
    maker: { score: 0, reasons: [] },
    advocate: { score: 0, reasons: [] },
  };

  const category = data.industry || "";
  const categoryMatches: Record<string, ArtistArchetypeKey[]> = {
    "Food & Beverage": ["loyalist", "liveWire", "advocate"],
    Fashion: ["curator", "changemaker", "advocate"],
    Tech: ["maker", "builder", "curator"],
    Gaming: ["maker", "liveWire", "builder"],
    Travel: ["liveWire", "curator", "loyalist"],
    Music: ["liveWire", "loyalist", "changemaker"],
    Wellness: ["advocate", "changemaker", "loyalist"],
    Automotive: ["liveWire", "curator", "builder"],
    Sustainability: ["changemaker", "advocate", "curator"],
    "Arts & Culture": ["curator", "changemaker", "maker"],
    Finance: ["builder", "maker", "advocate"],
  };

  Object.keys(categoryMatches).forEach((key) => {
    if (category.toLowerCase().includes(key.toLowerCase())) {
      categoryMatches[key].forEach((artist, index) => {
        const score = 25 - index * 5;
        matches[artist].score += score;
        matches[artist].reasons.push(`Strong category fit for ${key}`);
      });
    }
  });

  const brandValues: string[] = data.brandValues || [];
  if (brandValues.some((v) => v.includes("Sustainability"))) {
    matches.changemaker.score += 20;
    matches.changemaker.reasons.push("Shared sustainability values");
  }
  if (brandValues.some((v) => v.includes("Authenticity"))) {
    matches.loyalist.score += 20;
    matches.advocate.score += 15;
    matches.loyalist.reasons.push("Authenticity alignment");
    matches.advocate.reasons.push("Authentic storytelling focus");
  }
  if (brandValues.some((v) => v.includes("Innovation"))) {
    matches.maker.score += 20;
    matches.curator.score += 15;
    matches.maker.reasons.push("Innovation-driven approach");
    matches.curator.reasons.push("Creative excellence");
  }
  if (brandValues.some((v) => v.includes("Diversity"))) {
    matches.changemaker.score += 15;
    matches.advocate.score += 15;
    matches.changemaker.reasons.push("Diversity commitment");
    matches.advocate.reasons.push("Inclusive representation");
  }
  if (brandValues.some((v) => v.includes("Community"))) {
    matches.loyalist.score += 20;
    matches.loyalist.reasons.push("Community-building expertise");
  }
  if (brandValues.some((v) => v.includes("Wellness"))) {
    matches.advocate.score += 20;
    matches.advocate.reasons.push("Wellness advocacy");
  }

  if (data.collaborationGoals?.includes("awareness")) {
    matches.curator.score += 15;
    matches.liveWire.score += 15;
  }
  if (data.collaborationGoals?.includes("engagement")) {
    matches.loyalist.score += 20;
    matches.advocate.score += 15;
  }

  return (Object.entries(matches) as [ArtistArchetypeKey, { score: number; reasons: string[] }][])
    .map(([archetype, info]) => {
      const meta = config.artistArchetypes[archetype] ?? DEFAULT_ARTIST_ARCHETYPES[archetype];
      return {
        archetype: meta.name,
        score: Math.min(100, info.score),
        reasons: [...new Set(info.reasons)],
        bestFor: meta.bestFor,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

export function calculateBrandVibe(brandData: any, config?: VibeCheckConfig) {
  const cfg = mergeVibeConfig(config);
  const brandArchetype = determineBrandArchetype(brandData, cfg);
  const artistMatches = calculateArtistMatches(brandData, cfg);
  return { brandArchetype, artistMatches };
}

// ---------- Archetype description lookup ----------

export function getArtistArchetypeDescription(name: string, config?: VibeCheckConfig): string {
  const cfg = mergeVibeConfig(config);
  for (const key of ARTIST_ARCHETYPE_KEYS) {
    const meta = cfg.artistArchetypes[key] ?? DEFAULT_ARTIST_ARCHETYPES[key];
    if (meta.name === name) return meta.description;
  }
  return "A unique creative force with a distinct vibe.";
}
