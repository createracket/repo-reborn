// ============================================
// VIBE CHECK — scoring engine
// Ported verbatim from the original createracket.com logic.
// Two flows:
//   - calculateBrandVibe(brandData)   -> { brandArchetype, artistMatches }
//   - calculateVibeScore(musicianData) -> { primary, secondary, isMultiHyphenate, ... }
// ============================================

/* eslint-disable @typescript-eslint/no-explicit-any */

// ============================================
// BRAND SCORING
// ============================================

function determineBrandArchetype(data: any) {
  const archetypes: Record<string, number> = {
    communityFirst: 0,
    innovationPartner: 0,
    valuesLed: 0,
    cultureDriver: 0,
    performanceFocused: 0,
  };

  const brandValues = data.brandValues || [];
  if (brandValues.includes("Community & connection")) archetypes.communityFirst += 25;
  if (brandValues.includes("Authenticity & realness")) archetypes.communityFirst += 20;

  if (brandValues.includes("Innovation & creativity")) archetypes.innovationPartner += 25;
  if (brandValues.includes("Quality & craftsmanship")) archetypes.innovationPartner += 15;

  if (brandValues.includes("Sustainability & environmental responsibility")) archetypes.valuesLed += 25;
  if (brandValues.includes("Diversity & inclusion")) archetypes.valuesLed += 20;
  if (brandValues.includes("Social impact & purpose")) archetypes.valuesLed += 15;

  if (brandValues.includes("Fun & entertainment")) archetypes.cultureDriver += 20;
  if (brandValues.includes("Luxury & aspiration")) archetypes.cultureDriver += 15;

  if (data.primaryGoal === "Drive purchases or conversions") archetypes.performanceFocused += 30;
  if (data.primaryGoal === "Engagement (build community and connection)") archetypes.communityFirst += 25;
  if (data.primaryGoal === "Brand awareness (reach new audiences)") archetypes.cultureDriver += 20;
  if (data.primaryGoal === "Content creation (UGC, social content)") archetypes.innovationPartner += 20;

  const category = data.industry || "";
  if (["Sustainability & Eco-Conscious", "Wellness & Lifestyle"].some((c) => category.includes(c))) {
    archetypes.valuesLed += 15;
  }
  if (["Tech & Gadgets", "Gaming & Esports"].some((c) => category.includes(c))) {
    archetypes.innovationPartner += 15;
  }
  if (["Fashion & Lifestyle", "Arts & Culture"].some((c) => category.includes(c))) {
    archetypes.cultureDriver += 15;
  }

  const topArchetype = Object.entries(archetypes).sort((a, b) => b[1] - a[1])[0];

  return {
    type: formatBrandArchetype(topArchetype[0]),
    score: topArchetype[1],
    description: getBrandArchetypeDescription(topArchetype[0]),
    allScores: archetypes,
  };
}

function formatBrandArchetype(type: string) {
  const names: Record<string, string> = {
    communityFirst: "The Community-First Brand",
    innovationPartner: "The Innovation Partner",
    valuesLed: "The Values-Led Brand",
    cultureDriver: "The Culture Driver",
    performanceFocused: "The Performance-Focused Brand",
  };
  return names[type] || type;
}

function getBrandArchetypeDescription(type: string) {
  const descriptions: Record<string, string> = {
    communityFirst:
      "You prioritize authentic connections and building loyal communities. You understand that real influence comes from genuine relationships, not just reach.",
    innovationPartner:
      "You lead with creativity and cutting-edge thinking. You're looking for creators who push boundaries and bring fresh perspectives to your brand.",
    valuesLed:
      "Your brand stands for something bigger. You seek partners who share your commitment to making a positive impact and creating meaningful change.",
    cultureDriver:
      "You're at the forefront of cultural movements. You want creators who set trends, spark conversations, and elevate your brand's cultural relevance.",
    performanceFocused:
      "You're results-driven and data-informed. You need creators who can deliver measurable impact and drive real business outcomes.",
  };
  return descriptions[type] || "";
}

function calculateArtistMatches(data: any) {
  const matches: Record<string, { score: number; reasons: string[] }> = {
    loyalist: { score: 0, reasons: [] },
    changemaker: { score: 0, reasons: [] },
    curator: { score: 0, reasons: [] },
    builder: { score: 0, reasons: [] },
    liveWire: { score: 0, reasons: [] },
    maker: { score: 0, reasons: [] },
    advocate: { score: 0, reasons: [] },
  };

  const category = data.industry || "";
  const categoryMatches: Record<string, string[]> = {
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
        const score = 25 - index * 5; // 25, 20, 15
        matches[artist].score += score;
        matches[artist].reasons.push(`Strong category fit for ${key}`);
      });
    }
  });

  const brandValues = data.brandValues || [];
  if (brandValues.includes("Sustainability")) {
    matches.changemaker.score += 20;
    matches.changemaker.reasons.push("Shared sustainability values");
  }
  if (brandValues.includes("Authenticity")) {
    matches.loyalist.score += 20;
    matches.advocate.score += 15;
    matches.loyalist.reasons.push("Authenticity alignment");
    matches.advocate.reasons.push("Authentic storytelling focus");
  }
  if (brandValues.includes("Innovation")) {
    matches.maker.score += 20;
    matches.curator.score += 15;
    matches.maker.reasons.push("Innovation-driven approach");
    matches.curator.reasons.push("Creative excellence");
  }
  if (brandValues.includes("Diversity")) {
    matches.changemaker.score += 15;
    matches.advocate.score += 15;
    matches.changemaker.reasons.push("Diversity commitment");
    matches.advocate.reasons.push("Inclusive representation");
  }
  if (brandValues.includes("Community")) {
    matches.loyalist.score += 20;
    matches.loyalist.reasons.push("Community-building expertise");
  }
  if (brandValues.includes("Wellness")) {
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

  const sortedMatches = Object.entries(matches)
    .map(([archetype, info]) => ({
      archetype: formatArtistArchetype(archetype),
      score: Math.min(100, info.score),
      reasons: [...new Set(info.reasons)],
      bestFor: getBestCampaignType(archetype),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return sortedMatches;
}

function getBestCampaignType(archetype: string) {
  const campaignTypes: Record<string, string> = {
    loyalist: "Long-term ambassadorships, community engagement",
    changemaker: "Purpose-driven campaigns, impact storytelling",
    curator: "Product launches, lifestyle content, visual campaigns",
    builder: "Performance campaigns, affiliate partnerships",
    liveWire: "Event activations, festival partnerships, tours",
    maker: "Product reviews, tutorials, behind-the-scenes content",
    advocate: "Authentic testimonials, wellness campaigns, social impact",
  };
  return campaignTypes[archetype] || "Various partnership types";
}

export function calculateBrandVibe(brandData: any) {
  const brandArchetype = determineBrandArchetype(brandData);
  const artistMatches = calculateArtistMatches(brandData);
  return { brandArchetype, artistMatches };
}

function formatArtistArchetype(archetype: string) {
  const names: Record<string, string> = {
    loyalist: "The Loyalist",
    changemaker: "The Changemaker",
    curator: "The Curator",
    builder: "The Builder",
    liveWire: "The Live Wire",
    maker: "The Maker",
    advocate: "The Advocate",
  };
  return names[archetype] || archetype;
}

// ============================================
// MUSICIAN SCORING
// ============================================

function containsKeywords(text: string | undefined, keywords: string[]) {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return keywords.some((keyword) => lowerText.includes(keyword.toLowerCase()));
}

// contentComfortLevel comes through as "1 (Not at all)", "2", ... "5 (Very comfortable)".
// Parse the leading digit so >= 3 comparisons work.
function comfort(level: any): number {
  if (typeof level === "number") return level;
  if (typeof level !== "string") return 0;
  const n = parseInt(level, 10);
  return Number.isNaN(n) ? 0 : n;
}

function calculateLoyalistScore(data: any) {
  let score = 0;
  if (data.goals?.includes("Deepen fan engagement")) score += 20;
  if (data.support?.includes("Connect with creators or collaborators")) score += 15;
  if (comfort(data.contentComfortLevel) >= 3 && containsKeywords(data.story, ["engagement", "connection", "community", "fans"])) score += 15;
  if (containsKeywords(data.audienceSnapshot, ["engaged", "engagement", "community", "loyal"])) score += 20;
  if (data.support?.includes("Industry intros & networking")) score += 10;
  if (data.interests?.includes("Parenting/Family")) score += 5;
  if (data.interests?.includes("Mental Health")) score += 5;
  if (data.interests?.includes("Arts & Culture")) score += 5;
  if (containsKeywords(data.tellUsMore, ["fans", "community", "connection", "relationships"])) score += 10;
  if (data.goals?.includes("Grow my audience & streams") && !data.goals?.includes("Increase profile or recognition")) score += 5;
  if (data.artistType?.includes("In a band") || data.artistType?.includes("Both")) score += 3;
  if (data.upcomingShows && data.upcomingShows.length > 0) score += 3;
  if (data.goals?.includes("Increase profile or recognition") && data.goals?.length === 1) score -= 10;
  return Math.max(0, Math.min(100, score));
}

function calculateChangemakerScore(data: any) {
  let score = 0;
  if (data.sustainabilityImportance === "Very important") score += 25;
  if (data.ecoConsciousBrands === "Yes, definitely") score += 25;
  if (data.interests?.includes("Sustainability/Environment")) score += 15;
  if (data.interests?.includes("First Nations")) score += 15;
  if (data.representationImportance === "Very important") score += 15;
  if (data.sustainabilityImportance === "Important") score += 10;
  if (data.ecoConsciousBrands === "Yes, when possible") score += 10;
  if (data.interests?.includes("LGBTQIA+")) score += 5;
  if (data.interests?.includes("Arts & Culture")) score += 5;
  if (data.causeOrCharity && data.causeOrCharity.length > 0) score += 5;
  if (data.interests?.includes("Vegan/Vegetarian")) score += 8;
  if (data.interests?.includes("Current Events")) score += 5;
  if (data.interests?.includes("Education/Learning")) score += 5;
  if (containsKeywords(data.tellUsMore, ["values", "mission", "impact", "change", "purpose"])) score += 10;
  if (data.support?.includes("Brand partnerships") && containsKeywords(data.tellUsMore, ["align", "values"])) score += 5;
  if (data.interests?.includes("Wellness")) score += 3;
  if (containsKeywords(data.story, ["social", "justice", "equality", "representation"])) score += 5;
  if (data.support?.includes("All of the above") && !containsKeywords(data.tellUsMore, ["values", "mission"])) score -= 5;
  if (data.sustainabilityImportance === "Not a priority") score -= 15;
  return Math.max(0, Math.min(100, score));
}

function calculateCuratorScore(data: any) {
  let score = 0;
  if (data.interests?.includes("Fashion (designer, luxury)")) score += 20;
  if (data.interests?.includes("Fashion (casual, streetwear)")) score += 20;
  if (data.creativeAesthetic && data.creativeAesthetic.length > 50) score += 20;
  if (data.interests?.includes("Photography/Videography")) score += 15;
  if (data.interests?.includes("Fine Art")) score += 15;
  if (data.interests?.includes("Interior Design")) score += 15;
  if (comfort(data.contentComfortLevel) >= 4) score += 10;
  if (data.interests?.includes("Arts & Crafts")) score += 5;
  if (data.interests?.includes("Books/Reading")) score += 5;
  if (data.goals?.includes("Increase profile or recognition")) score += 10;
  if (containsKeywords(data.creativeAesthetic, ["visual", "aesthetic", "style", "look", "design"])) score += 10;
  if (containsKeywords(data.story, ["visual", "aesthetic", "style", "fashion", "design"])) score += 8;
  if (data.interests?.includes("Movies")) score += 3;
  if (data.interests?.includes("Travel")) score += 3;
  if (containsKeywords(data.genres, ["visual", "aesthetic", "cinematic"])) score += 5;
  if (!data.creativeAesthetic || data.creativeAesthetic.length === 0) score -= 10;
  if (comfort(data.contentComfortLevel) <= 2) score -= 5;
  return Math.max(0, Math.min(100, score));
}

function calculateBuilderScore(data: any) {
  let score = 0;
  if (data.support?.includes("All of the above")) score += 25;
  if (data.interests?.includes("Business/Finance")) score += 20;
  if (data.currentDeals?.includes("independent") && data.goals?.includes("Build industry connections")) score += 20;
  if (data.goals?.includes("Secure funding for a project")) score += 15;
  if (data.currentDeals?.includes("Management") || data.currentDeals?.includes("Brand / partnership agency")) score += 15;
  if (data.support && data.support.length >= 4) score += 10;
  if (data.support?.includes("Strategy, analytics or audience growth")) score += 10;
  if (data.interests?.includes("Tech/Gadgets")) score += 8;
  if (data.goals?.includes("Build industry connections")) score += 10;
  if (containsKeywords(data.tellUsMore, ["business", "growth", "building", "scaling", "revenue"])) score += 10;
  if (data.goals && data.goals.length >= 5) score += 8;
  if (data.recordContract === "Currently in negotiations") score += 5;
  if (containsKeywords(data.tellUsMore, ["timeline", "urgent", "asap"])) score += 5;
  if (data.interests?.includes("Crypto/Web3")) score += 5;
  if (comfort(data.contentComfortLevel) <= 2 && !containsKeywords(data.tellUsMore, ["team", "support", "help"])) score -= 5;
  if (data.support && data.support.length <= 2) score -= 8;
  return Math.max(0, Math.min(100, score));
}

function calculateLiveWireScore(data: any) {
  let score = 0;
  if (data.goals?.includes("Expand live shows / touring")) score += 25;
  if (data.upcomingShows && data.upcomingShows.length > 20) score += 20;
  if (data.targetMarkets?.includes("Regional") || data.targetMarkets?.includes("International")) score += 15;
  if (containsKeywords(data.tellUsMore, ["tour", "touring", "festival", "live"])) score += 15;
  if (data.interests?.includes("Sports")) score += 8;
  if (data.interests?.includes("Outdoor/Adventure")) score += 8;
  if (data.interests?.includes("Travel")) score += 10;
  if (data.interests?.includes("Automotive")) score += 5;
  if (data.support?.includes("Connect with creators or collaborators")) score += 8;
  if (data.artistType?.includes("In a band") || data.artistType?.includes("Both")) score += 8;
  if (containsKeywords(data.tellUsMore, ["tour", "live", "performance", "energy", "stage"])) score += 10;
  if (data.targetMarkets && data.targetMarkets.length >= 3) score += 5;
  if (containsKeywords(data.story, ["festival", "tour", "live"])) score += 5;
  if (data.artistType?.includes("Solo artist")) score += 3;
  if (data.interests?.includes("Food")) score += 3;
  if (!data.upcomingShows && !data.goals?.includes("Expand live shows / touring")) score -= 15;
  if (data.goals?.length === 1 && data.goals[0].includes("studio")) score -= 8;
  return Math.max(0, Math.min(100, score));
}

function calculateMakerScore(data: any) {
  let score = 0;
  if (data.artistType?.includes("DJ") || data.artistType?.includes("Producer")) score += 25;
  if (data.interests?.includes("Tech/Gadgets")) score += 20;
  if (data.support?.includes("Creative content (video, photo)")) score += 15;
  if (data.interests?.includes("Gaming")) score += 15;
  if (data.interests?.includes("Photography/Videography")) score += 10;
  if (data.artistType?.includes("Songwriter") || data.artistType?.includes("Composer")) score += 10;
  if (comfort(data.contentComfortLevel) >= 4) score += 8;
  if (data.support?.includes("Strategy, analytics or audience growth")) score += 8;
  if (containsKeywords(data.creativeAesthetic, ["production", "technical", "gear", "studio"])) score += 10;
  if (containsKeywords(data.genres, ["production", "electronic", "beat", "produced"])) score += 8;
  if (containsKeywords(data.story, ["production", "studio", "gear", "software"])) score += 5;
  if (data.artistType?.includes("Session musician")) score += 5;
  if (data.interests?.includes("Business/Finance")) score += 3;
  if (data.interests?.includes("DIY/Home Improvements")) score += 3;
  if (!data.interests?.includes("Tech/Gadgets") && !data.artistType?.includes("Producer")) score -= 10;
  if (comfort(data.contentComfortLevel) <= 2 && !data.artistType?.includes("Producer")) score -= 8;
  return Math.max(0, Math.min(100, score));
}

function calculateAdvocateScore(data: any) {
  let score = 0;
  if (data.interests?.includes("Mental Health")) score += 25;
  if (data.underrepresentedCommunities?.includes("Neurodivergent")) score += 20;
  if (data.underrepresentedCommunities && data.underrepresentedCommunities.length > 0) score += 15;
  if (data.representationImportance === "Very important") score += 15;
  if (data.interests?.includes("Wellness")) score += 20;
  if (data.interests?.includes("Health/Beauty")) score += 8;
  if (data.interests?.includes("Vegan/Vegetarian")) score += 8;
  if (data.interests?.includes("Fitness")) score += 8;
  if (data.interests?.includes("LGBTQIA+") || data.underrepresentedCommunities?.includes("LGBTQIA+")) score += 10;
  if (containsKeywords(data.tellUsMore, ["vulnerable", "authentic", "real", "honest", "mental health"])) score += 10;
  if (data.interests?.includes("Sustainability/Environment")) score += 5;
  if (data.interests?.includes("Parenting/Family")) score += 5;
  if (data.interests?.includes("Books/Reading")) score += 3;
  if (data.interests?.includes("Podcasts")) score += 3;
  if (containsKeywords(data.creativeAesthetic, ["raw", "unfiltered", "honest", "real"])) score += 5;
  if (containsKeywords(data.story, ["mental health", "wellness", "authentic", "vulnerable"])) score += 5;
  if (!data.interests?.some((i: string) => ["Mental Health", "Wellness", "Health/Beauty", "Fitness"].includes(i))) score -= 10;
  return Math.max(0, Math.min(100, score));
}

function assignArchetypes(scores: Record<string, number>) {
  const sortedScores = Object.entries(scores)
    .map(([archetype, score]) => ({ archetype, score }))
    .sort((a, b) => b.score - a.score);

  const highScorers = sortedScores.filter((s) => s.score >= 35);
  const isMultiHyphenate = highScorers.length >= 3;

  const primary = sortedScores[0].score >= 40 ? sortedScores[0].archetype : "builder";

  let secondary: string | null = null;
  if (sortedScores[1] && sortedScores[1].score >= 30 && sortedScores[0].score - sortedScores[1].score >= 15) {
    secondary = sortedScores[1].archetype;
  }
  if (sortedScores[1] && sortedScores[0].score - sortedScores[1].score < 10 && sortedScores[0].score >= 35 && sortedScores[1].score >= 35) {
    secondary = sortedScores[1].archetype;
  }

  const formatName = (archetype: string) => {
    const names: Record<string, string> = {
      loyalist: "The Loyalist",
      changemaker: "The Changemaker",
      curator: "The Curator",
      builder: "The Builder",
      liveWire: "The Live Wire",
      maker: "The Maker",
      advocate: "The Advocate",
    };
    return names[archetype] || archetype;
  };

  return {
    primary: formatName(primary),
    secondary: secondary ? formatName(secondary) : null,
    isMultiHyphenate,
    allScores: scores,
    sortedScores: sortedScores.map((s) => ({ archetype: formatName(s.archetype), score: s.score })),
  };
}

export function calculateVibeScore(surveyData: any) {
  const scores = {
    loyalist: calculateLoyalistScore(surveyData),
    changemaker: calculateChangemakerScore(surveyData),
    curator: calculateCuratorScore(surveyData),
    builder: calculateBuilderScore(surveyData),
    liveWire: calculateLiveWireScore(surveyData),
    maker: calculateMakerScore(surveyData),
    advocate: calculateAdvocateScore(surveyData),
  };
  return assignArchetypes(scores);
}

export function getArtistArchetypeDescription(type: string) {
  const descriptions: Record<string, string> = {
    "The Loyalist":
      "You're a community builder with deeply engaged fans who prioritize authentic connections over sheer reach. You thrive on building relationships.",
    "The Changemaker":
      "You're a mission-driven artist who uses your platform for social and environmental impact. Your art is a vehicle for change.",
    "The Curator":
      "You're a style influencer and visual storyteller with a strong aesthetic direction and trend-setting appeal. Your look is as important as your sound.",
    "The Builder":
      "You're a business-minded artist focused on growth, professionalization, and maximizing opportunities. You see the big picture.",
    "The Live Wire":
      "You're a high-energy performer who thrives on stage and brings audiences to life through shows and tours. The stage is your home.",
    "The Maker":
      "You're a production-focused creator who excels at technical content, gear reviews, and educational storytelling. You love the process.",
    "The Advocate":
      "You're a wellness champion and authentic voice who prioritizes mental health, vulnerability, and real connection. You speak your truth.",
  };
  return descriptions[type] || "A unique creative force with a distinct vibe.";
}
