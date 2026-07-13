// Briefing form configuration — defaults + loader/saver for admin overrides.
// Stored as a single JSONB row in `brief_form_config` (id = 'default').

import { supabase } from "@/integrations/supabase/client";

// ---------- Types ----------

export type BriefFieldKey =
  | "title"
  | "description"
  | "budget"
  | "timeline"
  | "target_audience"
  | "contact_email"
  | "additional_info";


export type BriefFieldDef = {
  label: string;
  placeholder?: string;
};

export type BriefSection = {
  title: string;
  description: string;
};

export type BriefFormConfig = {
  page: {
    eyebrow: string;
    heading: string;
    cardTitle: string;
    cardDescription: string;
    submitLabel: string;
    submittingLabel: string;
    successMessage: string;
  };
  sections: {
    core: BriefSection;
    vibe: BriefSection;
    contact: BriefSection;
    extras: BriefSection;
  };
  fields: Record<BriefFieldKey, BriefFieldDef>;
  coreValuesLabel: string;
  coreValuesMax: number;
  coreValues: string[];
  collaborationTypesLabel: string;
  collaborationTypes: string[];
  collaborationTypesBrand?: string[];
};


// ---------- Defaults ----------

export const DEFAULT_BRIEF_FORM_CONFIG: BriefFormConfig = {
  page: {
    eyebrow: "Connect",
    heading: "Submit a brief",
    cardTitle: "Plan your next campaign",
    cardDescription:
      "Tell us about the project and we'll match you with creative partners who fit your vibe.",
    submitLabel: "Submit brief",
    submittingLabel: "Submitting…",
    successMessage: "Brief submitted! We'll be in touch shortly.",
  },
  sections: {
    core: {
      title: "Core campaign details",
      description: "Start with the basics.",
    },
    vibe: {
      title: "The vibe check",
      description:
        "Help us find the perfect match by describing the vibe you're going for.",
    },
    contact: {
      title: "Contact",
      description: "We'll use this to follow up. Defaults to your account email.",
    },
    extras: {
      title: "Anything else?",
      description: "Optional — share anything else that would help us match you with the right partners.",
    },
  },
  fields: {
    title: { label: "Campaign title", placeholder: "e.g., Summer Vibes album launch" },
    description: {
      label: "Project description",
      placeholder:
        "Describe your goals, who you're trying to reach, and what you're looking for in a partner…",
    },
    budget: { label: "Estimated budget ($)", placeholder: "e.g., 10000" },
    timeline: { label: "Timeline", placeholder: "e.g., 3 months" },
    target_audience: {
      label: "Describe your target audience",
      placeholder: "e.g., Ages 18–25, into indie music, sustainable fashion, outdoor scenes.",
    },
    contact_email: { label: "Contact email", placeholder: "you@example.com" },
    additional_info: {
      label: "Anything else?",
      placeholder: "Share extra context, references, links, or questions…",
    },
  },
  coreValuesLabel: "Ideal partner's core values (pick up to 3)",
  coreValuesMax: 3,
  coreValues: [
    "Authenticity",
    "Creativity",
    "Community",
    "Sustainability",
    "Innovation",
    "Inclusivity",
  ],
  collaborationTypesLabel: "Collaboration type",
  collaborationTypes: [
    "Social Media Campaign",
    "Live Performance",
    "Content Creation",
    "Brand Ambassadorship",
    "Merchandise Collaboration",
    "Sponsored Song/Video",
    "Fan page creation and/or management",
    "I'd like your recommendation based on my campaign",
  ],
  collaborationTypesBrand: [
    "Organic Social Content\n(Strategy, Planning and/or Production)",
    "Paid Social Content\n(Strategy, Planning and/or Production)",
    "Creator content (Organic Socials)",
    "Creator content (Paid Media)",
    "Ambassador talent and/or Creators",
    "Talent to appear in my brand content",
    "Event or Real World Activations\n(Strategy, Planning and/or Production)",
    "E-Commerce Collaborations",
    "Artist Playlists and Streaming Integration",
    "I'd like your recommendation based on my campaign",
  ],
  ],
};

// ---------- Merge ----------

export function mergeBriefFormConfig(
  overrides?: Partial<BriefFormConfig> | null,
): BriefFormConfig {
  if (!overrides) return DEFAULT_BRIEF_FORM_CONFIG;
  return {
    page: { ...DEFAULT_BRIEF_FORM_CONFIG.page, ...(overrides.page ?? {}) },
    sections: {
      core: { ...DEFAULT_BRIEF_FORM_CONFIG.sections.core, ...(overrides.sections?.core ?? {}) },
      vibe: { ...DEFAULT_BRIEF_FORM_CONFIG.sections.vibe, ...(overrides.sections?.vibe ?? {}) },
      contact: {
        ...DEFAULT_BRIEF_FORM_CONFIG.sections.contact,
        ...(overrides.sections?.contact ?? {}),
      },
      extras: {
        ...DEFAULT_BRIEF_FORM_CONFIG.sections.extras,
        ...(overrides.sections?.extras ?? {}),
      },
    },
    fields: {
      title: { ...DEFAULT_BRIEF_FORM_CONFIG.fields.title, ...(overrides.fields?.title ?? {}) },
      description: {
        ...DEFAULT_BRIEF_FORM_CONFIG.fields.description,
        ...(overrides.fields?.description ?? {}),
      },
      budget: { ...DEFAULT_BRIEF_FORM_CONFIG.fields.budget, ...(overrides.fields?.budget ?? {}) },
      timeline: {
        ...DEFAULT_BRIEF_FORM_CONFIG.fields.timeline,
        ...(overrides.fields?.timeline ?? {}),
      },
      target_audience: {
        ...DEFAULT_BRIEF_FORM_CONFIG.fields.target_audience,
        ...(overrides.fields?.target_audience ?? {}),
      },
      contact_email: {
        ...DEFAULT_BRIEF_FORM_CONFIG.fields.contact_email,
        ...(overrides.fields?.contact_email ?? {}),
      },
      additional_info: {
        ...DEFAULT_BRIEF_FORM_CONFIG.fields.additional_info,
        ...(overrides.fields?.additional_info ?? {}),
      },
    },
    coreValuesLabel: overrides.coreValuesLabel ?? DEFAULT_BRIEF_FORM_CONFIG.coreValuesLabel,
    coreValuesMax: overrides.coreValuesMax ?? DEFAULT_BRIEF_FORM_CONFIG.coreValuesMax,
    coreValues:
      overrides.coreValues && overrides.coreValues.length > 0
        ? overrides.coreValues
        : DEFAULT_BRIEF_FORM_CONFIG.coreValues,
    collaborationTypesLabel:
      overrides.collaborationTypesLabel ?? DEFAULT_BRIEF_FORM_CONFIG.collaborationTypesLabel,
    collaborationTypes:
      overrides.collaborationTypes && overrides.collaborationTypes.length > 0
        ? overrides.collaborationTypes
        : DEFAULT_BRIEF_FORM_CONFIG.collaborationTypes,
    collaborationTypesBrand:
      overrides.collaborationTypesBrand && overrides.collaborationTypesBrand.length > 0
        ? overrides.collaborationTypesBrand
        : DEFAULT_BRIEF_FORM_CONFIG.collaborationTypesBrand,
  };
}

// ---------- Loader (cached) ----------

let cachedConfigPromise: Promise<BriefFormConfig> | null = null;

export async function loadBriefFormConfig(force = false): Promise<BriefFormConfig> {
  if (!force && cachedConfigPromise) return cachedConfigPromise;
  cachedConfigPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from("brief_form_config" as any)
        .select("config")
        .eq("id", "default")
        .maybeSingle();
      if (error || !data) return DEFAULT_BRIEF_FORM_CONFIG;
      return mergeBriefFormConfig(
        (data as unknown as { config: Partial<BriefFormConfig> }).config ?? {},
      );
    } catch {
      return DEFAULT_BRIEF_FORM_CONFIG;
    }
  })();
  return cachedConfigPromise;
}

export function clearBriefFormConfigCache() {
  cachedConfigPromise = null;
}

// ---------- Saver (admin-only via RLS) ----------

export async function saveBriefFormConfig(config: BriefFormConfig): Promise<void> {
  const { error } = await supabase
    .from("brief_form_config" as any)
    .upsert({ id: "default", config: config as any, updated_at: new Date().toISOString() });
  if (error) throw error;
  clearBriefFormConfigCache();
}
