import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type SharePreview = {
  title: string;
  description: string;
  image: string | null;
};

const Input = z.object({
  slug: z.string().trim().min(1).max(200),
  kind: z.enum(["brief", "spotlight", "roster", "report"]),
});

const SITE = "https://createracket.com";

function absolute(url: string | null | undefined): string | null {
  if (!url) return null;
  const value = String(url).trim();
  if (!value) return null;
  if (/^https:\/\//i.test(value)) return value;
  if (/^http:\/\//i.test(value)) return value.replace(/^http:/i, "https:");
  if (value.startsWith("/")) return `${SITE}${value}`;
  return null;
}

function trim(text: string | null | undefined, max = 160): string | null {
  if (!text) return null;
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (!clean) return null;
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/**
 * Public: the title / description / image a link unfurler (Slack, WhatsApp,
 * iMessage, LinkedIn) should show for a shared page. Only ever returns
 * details that are safe to show before a passcode gate.
 */
export const getSharePreview = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<SharePreview | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.kind === "brief" || data.kind === "spotlight") {
      const { data: row } = await supabaseAdmin
        .from("partner_pages")
        .select("headline, subtitle, intro, header_image_url, profile_image_url, links")
        .eq("slug", data.slug)
        .eq("published", true)
        .maybeSingle();

      const page = row as
        | {
            headline: string;
            subtitle: string | null;
            intro: string | null;
            header_image_url: string | null;
            profile_image_url: string | null;
            links: Record<string, unknown> | null;
          }
        | null;
      if (!page) return null;

      const links = page.links ?? {};
      const str = (key: string) => (typeof links[key] === "string" ? (links[key] as string) : null);

      return {
        title: (str("tab_page_name") || page.headline || "").trim() || (data.kind === "brief" ? "Brief" : "Spotlight"),
        description:
          trim(str("share_description")) ??
          trim(page.subtitle) ??
          trim(page.intro) ??
          (data.kind === "brief" ? "Campaign brief." : "Partner spotlight."),
        image:
          absolute(str("share_image_url")) ??
          absolute(page.header_image_url) ??
          absolute(page.profile_image_url),
      };
    }

    if (data.kind === "roster") {
      const { data: row } = await supabaseAdmin
        .from("rosters")
        .select("title, description, header_image_url, profile_image_url")
        .eq("slug", data.slug)
        .eq("published", true)
        .maybeSingle();

      const r = row as
        | { title: string; description: string | null; header_image_url: string | null; profile_image_url: string | null }
        | null;
      if (!r) return null;

      return {
        title: r.title?.trim() || "Roster",
        description: trim(r.description) ?? "Creator roster.",
        image: absolute(r.header_image_url) ?? absolute(r.profile_image_url),
      };
    }

    const { data: row } = await supabaseAdmin
      .from("campaign_reports")
      .select("title, description, header_image_url, profile_image_url")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();

    const r = row as
      | { title: string; description: string | null; header_image_url: string | null; profile_image_url: string | null }
      | null;
    if (!r) return null;

    return {
      title: r.title?.trim() || "Campaign report",
      description: trim(r.description) ?? "Campaign report.",
      image: absolute(r.header_image_url) ?? absolute(r.profile_image_url),
    };
  });
