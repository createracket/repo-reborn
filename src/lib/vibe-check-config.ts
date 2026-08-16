// Vibe Check configuration — defaults + loader/saver for admin overrides.
// Stored as a single JSONB row in `vibe_check_config` (id = 'default').

import { supabase } from "@/integrations/supabase/client";
import formsJson from "@/lib/forms.json";

// ---------- Types ----------

export type SurveyField = {
  section: number;
  type: "text" | "textarea" | "checkbox" | "radio";
  label: string;
  placeholder?: string;
  description?: string;
  options?: string[];
  dependsOn?: string;
  dependsOnValue?: string;
};

export type SurveySection = {
  title: string;
  description: string;
  timeEstimate: string;
};

export type SurveyDef = {
  totalSections: number;
  sections: SurveySection[];
  fields: Record<string, SurveyField>;
};

export type ArtistArchetypeMeta = {
  name: string;
  description: string;
  bestFor: string;
};
export type BrandArchetypeMeta = {
  name: string;
  description: string;
};

export type ArtistArchetypeKey =
  | "loyalist"
  | "changemaker"
  | "curator"
  | "builder"
  | "liveWire"
  | "maker"
  | "advocate";

export type BrandArchetypeKey =
  | "communityFirst"
  | "innovationPartner"
  | "valuesLed"
  | "cultureDriver"
  | "performanceFocused";

export type VibeCheckConfig = {
  surveys: {
    brand: SurveyDef;
    musician: SurveyDef;
  };
  artistArchetypes: Record<ArtistArchetypeKey, ArtistArchetypeMeta>;
  brandArchetypes: Record<BrandArchetypeKey, BrandArchetypeMeta>;
  weights: {
    artist: Record<ArtistArchetypeKey, Record<string, number>>;
    brand: Record<BrandArchetypeKey, Record<string, number>>;
  };
};

// ---------- Defaults ----------

export const DEFAULT_ARTIST_ARCHETYPES: Record<ArtistArchetypeKey, ArtistArchetypeMeta> = {
  loyalist: {
    name: "The Loyalist",
    description:
      "You're a community builder with deeply engaged fans who prioritise authentic connections over sheer reach. You thrive on building relationships.",
    bestFor: "Long-term ambassadorships, community engagement",
  },
  changemaker: {
    name: "The Changemaker",
    description:
      "You're a mission-driven artist who uses your platform for social and environmental impact. Your art is a vehicle for change.",
    bestFor: "Purpose-driven campaigns, impact storytelling",
  },
  curator: {
    name: "The Curator",
    description:
      "You're a style influencer and visual storyteller with a strong aesthetic direction and trend-setting appeal. Your look is as important as your sound.",
    bestFor: "Product launches, lifestyle content, visual campaigns",
  },
  builder: {
    name: "The Builder",
    description:
      "You're a business-minded artist focused on growth, professionalisation, and maximising opportunities. You see the big picture.",
    bestFor: "Performance campaigns, affiliate partnerships",
  },
  liveWire: {
    name: "The Live Wire",
    description:
      "You're a high-energy performer who thrives on stage and brings audiences to life through shows and tours. The stage is your home.",
    bestFor: "Event activations, festival partnerships, tours",
  },
  maker: {
    name: "The Maker",
    description:
      "You're a production-focused creator who excels at technical content, gear reviews, and educational storytelling. You love the process.",
    bestFor: "Product reviews, tutorials, behind-the-scenes content",
  },
  advocate: {
    name: "The Advocate",
    description:
      "You're a wellness champion and authentic voice who prioritises mental health, vulnerability, and real connection. You speak your truth.",
    bestFor: "Authentic testimonials, wellness campaigns, social impact",
  },
};

export const DEFAULT_BRAND_ARCHETYPES: Record<BrandArchetypeKey, BrandArchetypeMeta> = {
  communityFirst: {
    name: "The Community-First Brand",
    description:
      "You prioritise authentic connections and building loyal communities. You understand that real influence comes from genuine relationships, not just reach.",
  },
  innovationPartner: {
    name: "The Innovation Partner",
    description:
      "You lead with creativity and cutting-edge thinking. You're looking for creators who push boundaries and bring fresh perspectives to your brand.",
  },
  valuesLed: {
    name: "The Values-Led Brand",
    description:
      "Your brand stands for something bigger. You seek partners who share your commitment to making a positive impact and creating meaningful change.",
  },
  cultureDriver: {
    name: "The Culture Driver",
    description:
      "You're at the forefront of cultural movements. You want creators who set trends, spark conversations, and elevate your brand's cultural relevance.",
  },
  performanceFocused: {
    name: "The Performance-Focused Brand",
    description:
      "You're results-driven and data-informed. You need creators who can deliver measurable impact and drive real business outcomes.",
  },
};

const EMPTY_ARTIST_WEIGHTS: Record<ArtistArchetypeKey, Record<string, number>> = {
  loyalist: {},
  changemaker: {},
  curator: {},
  builder: {},
  liveWire: {},
  maker: {},
  advocate: {},
};

const EMPTY_BRAND_WEIGHTS: Record<BrandArchetypeKey, Record<string, number>> = {
  communityFirst: {},
  innovationPartner: {},
  valuesLed: {},
  cultureDriver: {},
  performanceFocused: {},
};

export const DEFAULT_VIBE_CONFIG: VibeCheckConfig = {
  surveys: {
    brand: (formsJson as any).brand as SurveyDef,
    musician: (formsJson as any).musician as SurveyDef,
  },
  artistArchetypes: DEFAULT_ARTIST_ARCHETYPES,
  brandArchetypes: DEFAULT_BRAND_ARCHETYPES,
  weights: { artist: EMPTY_ARTIST_WEIGHTS, brand: EMPTY_BRAND_WEIGHTS },
};

// ---------- Key ⇄ label resolution (rename-proof) ----------

const ARTIST_KEYS = Object.keys(DEFAULT_ARTIST_ARCHETYPES) as ArtistArchetypeKey[];
const BRAND_KEYS = Object.keys(DEFAULT_BRAND_ARCHETYPES) as BrandArchetypeKey[];

const norm = (v: string) => v.trim().toLowerCase();

/** Resolve a stored artist archetype value (key or any past/current display name) to its stable key. */
export function artistArchetypeKeyFromLabel(
  label: string,
  config?: VibeCheckConfig | null,
): ArtistArchetypeKey | null {
  if (!label) return null;
  const v = norm(label);
  const key = ARTIST_KEYS.find((k) => norm(k) === v);
  if (key) return key;
  const fromConfig = config
    ? ARTIST_KEYS.find((k) => norm(config.artistArchetypes?.[k]?.name ?? "") === v)
    : undefined;
  if (fromConfig) return fromConfig;
  return ARTIST_KEYS.find((k) => norm(DEFAULT_ARTIST_ARCHETYPES[k].name) === v) ?? null;
}

/** Resolve a stored brand archetype value (key or any past/current display name) to its stable key. */
export function brandArchetypeKeyFromLabel(
  label: string,
  config?: VibeCheckConfig | null,
): BrandArchetypeKey | null {
  if (!label) return null;
  const v = norm(label);
  const key = BRAND_KEYS.find((k) => norm(k) === v);
  if (key) return key;
  const fromConfig = config
    ? BRAND_KEYS.find((k) => norm(config.brandArchetypes?.[k]?.name ?? "") === v)
    : undefined;
  if (fromConfig) return fromConfig;
  return BRAND_KEYS.find((k) => norm(DEFAULT_BRAND_ARCHETYPES[k].name) === v) ?? null;
}

export function artistArchetypeOptions(config?: VibeCheckConfig | null) {
  return ARTIST_KEYS.map((key) => ({
    key: key as string,
    label: config?.artistArchetypes?.[key]?.name ?? DEFAULT_ARTIST_ARCHETYPES[key].name,
  }));
}

export function brandArchetypeOptions(config?: VibeCheckConfig | null) {
  return BRAND_KEYS.map((key) => ({
    key: key as string,
    label: config?.brandArchetypes?.[key]?.name ?? DEFAULT_BRAND_ARCHETYPES[key].name,
  }));
}

// ---------- Merge ----------


/**
 * Deep-ish merge: any field missing from overrides falls back to default.
 * Survey defs and archetype meta are object-shaped; weights are rule-id → number maps.
 */
export function mergeVibeConfig(overrides?: Partial<VibeCheckConfig> | null): VibeCheckConfig {
  if (!overrides) return DEFAULT_VIBE_CONFIG;

  return {
    surveys: {
      brand: overrides.surveys?.brand ?? DEFAULT_VIBE_CONFIG.surveys.brand,
      musician: overrides.surveys?.musician ?? DEFAULT_VIBE_CONFIG.surveys.musician,
    },
    artistArchetypes: {
      ...DEFAULT_ARTIST_ARCHETYPES,
      ...(overrides.artistArchetypes ?? {}),
    } as Record<ArtistArchetypeKey, ArtistArchetypeMeta>,
    brandArchetypes: {
      ...DEFAULT_BRAND_ARCHETYPES,
      ...(overrides.brandArchetypes ?? {}),
    } as Record<BrandArchetypeKey, BrandArchetypeMeta>,
    weights: {
      artist: { ...EMPTY_ARTIST_WEIGHTS, ...(overrides.weights?.artist ?? {}) },
      brand: { ...EMPTY_BRAND_WEIGHTS, ...(overrides.weights?.brand ?? {}) },
    },
  };
}

// ---------- Loader (cached) ----------

let cachedConfigPromise: Promise<VibeCheckConfig> | null = null;

export async function loadVibeCheckConfig(force = false): Promise<VibeCheckConfig> {
  if (!force && cachedConfigPromise) return cachedConfigPromise;
  cachedConfigPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from("vibe_check_config")
        .select("config")
        .eq("id", "default")
        .maybeSingle();
      if (error || !data) return DEFAULT_VIBE_CONFIG;
      return mergeVibeConfig((data as { config: Partial<VibeCheckConfig> }).config ?? {});
    } catch {
      return DEFAULT_VIBE_CONFIG;
    }
  })();
  return cachedConfigPromise;
}

export function clearVibeCheckConfigCache() {
  cachedConfigPromise = null;
}

// ---------- Realtime subscription ----------
// Subscribe once (in the browser) to config changes so cached config is
// invalidated whenever an admin saves. Existing in-progress survey sessions
// keep the config they loaded at mount; new mounts (e.g. retakes) fetch fresh.
let realtimeStarted = false;
export function startVibeCheckConfigRealtime() {
  if (realtimeStarted || typeof window === "undefined") return;
  realtimeStarted = true;
  try {
    supabase
      .channel("vibe_check_config_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vibe_check_config" },
        () => {
          clearVibeCheckConfigCache();
        },
      )
      .subscribe();
  } catch {
    realtimeStarted = false;
  }
}

// ---------- Saver (admin-only via RLS) ----------

export async function saveVibeCheckConfig(config: VibeCheckConfig): Promise<void> {
  const { error } = await supabase
    .from("vibe_check_config")
    .upsert({ id: "default", config: config as any, updated_at: new Date().toISOString() });
  if (error) throw error;
  clearVibeCheckConfigCache();
}
