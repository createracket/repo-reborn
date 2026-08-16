// Dashboard display settings.
// Stored as a single JSONB row in `brief_form_config` (id = 'dashboard').
import { supabase } from "@/integrations/supabase/client";

export type DashboardConfig = {
  featuredSpotlightsEnabled: boolean;
};

export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  featuredSpotlightsEnabled: true,
};

export async function loadDashboardConfig(): Promise<DashboardConfig> {
  try {
    const { data, error } = await supabase
      .from("brief_form_config" as any)
      .select("config")
      .eq("id", "dashboard")
      .maybeSingle();
    if (error || !data) return DEFAULT_DASHBOARD_CONFIG;
    const cfg = ((data as unknown as { config: Partial<DashboardConfig> }).config ?? {});
    return {
      featuredSpotlightsEnabled:
        typeof cfg.featuredSpotlightsEnabled === "boolean"
          ? cfg.featuredSpotlightsEnabled
          : true,
    };
  } catch {
    return DEFAULT_DASHBOARD_CONFIG;
  }
}

export async function saveDashboardConfig(config: DashboardConfig): Promise<void> {
  const { error } = await supabase
    .from("brief_form_config" as any)
    .upsert({ id: "dashboard", config: config as any, updated_at: new Date().toISOString() });
  if (error) throw error;
}
