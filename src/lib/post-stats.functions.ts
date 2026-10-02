import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  STATS_FIELDS,
  STATS_FIELD_KEYS,
  MAX_STATS_SCREENSHOTS,
  COMMUNITY_EMAIL,
  type StatsAnswers,
  type StatsFieldKey,
} from "./post-stats-fields";

const SITE = "https://createracket.com";
const TokenSchema = z.string().trim().regex(/^[a-f0-9]{32,64}$/);
const FieldEnum = z.enum(STATS_FIELD_KEYS as [StatsFieldKey, ...StatsFieldKey[]]);

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function newToken() {
  const b = new Uint8Array(20);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

function labelFor(k: string) {
  return STATS_FIELDS.find((f) => f.key === k)?.label ?? k;
}

/* ---------------- Admin: create + send ---------------- */

export const createStatsRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        postId: z.string().uuid(),
        email: z.string().trim().email().max(254).optional().or(z.literal("")),
        fields: z.array(FieldEnum).min(1).max(STATS_FIELDS.length),
        message: z.string().trim().max(3000).optional(),
        send: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Only admins can request stats.");
    if (data.send && !data.email) throw new Error("Add the creator's email to send the request.");

    const db = await admin();
    const { data: post, error: pErr } = await db
      .from("campaign_report_posts")
      .select("id, post_url, creator_id, campaign_report_creators(id, name, report_id, campaign_reports(id, title))")
      .eq("id", data.postId)
      .maybeSingle();
    if (pErr || !post) throw new Error("Post not found.");
    const creator = (post as any).campaign_report_creators;
    const report = creator?.campaign_reports;

    const token = newToken();
    const { data: row, error } = await db
      .from("post_stats_requests")
      .insert({
        token,
        report_id: report.id,
        post_id: post.id,
        creator_id: creator?.id ?? null,
        email: data.email || null,
        requested_fields: data.fields,
        message: data.message || null,
        created_by: context.userId,
        sent_at: data.send ? new Date().toISOString() : null,
      })
      .select("id")
      .single();
    if (error || !row) throw new Error("Couldn't create the request.");

    const formUrl = `${SITE}/stats/${token}`;
    let emailStatus: "sent" | "suppressed" | "not_sent" = "not_sent";
    if (data.send && data.email) {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      const templateData = {
        creatorName: creator?.name ?? undefined,
        campaignTitle: report?.title ?? undefined,
        postUrl: post.post_url ?? undefined,
        formUrl,
        message: data.message || undefined,
        fieldsLabel: data.fields.map((f) => labelFor(f).toLowerCase()).join(", "),
      };
      const res = await sendTemplateEmail("stats-request", data.email, {
        templateData,
        idempotencyKey: `stats-request-${row.id}`,
        replyTo: COMMUNITY_EMAIL,
      });
      emailStatus = res.sent ? "sent" : "suppressed";
      try {
        await sendTemplateEmail("stats-request", COMMUNITY_EMAIL, {
          templateData: { ...templateData, copyNote: `Copy of the request sent to ${creator?.name ?? "creator"} (${data.email})` },
          idempotencyKey: `stats-request-copy-${row.id}`,
        });
      } catch (e) {
        console.error("stats copy email failed", e);
      }
    }
    return { id: row.id, formUrl, emailStatus };
  });

export const getStatsScreenshotUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ requestId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("post_stats_requests")
      .select("screenshot_paths")
      .eq("id", data.requestId)
      .maybeSingle();
    if (!row) throw new Error("Not found");
    const db = await admin();
    const urls: string[] = [];
    for (const p of row.screenshot_paths ?? []) {
      const { data: s } = await db.storage.from("stats-screenshots").createSignedUrl(p, 3600);
      if (s?.signedUrl) urls.push(s.signedUrl);
    }
    return { urls };
  });

/* ---------------- Public: token-gated form ---------------- */

export const getStatsRequestPublic = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: TokenSchema }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: row } = await db
      .from("post_stats_requests")
      .select("id, status, requested_fields, message, answers, post_id, creator_id, viewed_at, screenshot_paths")
      .eq("token", data.token)
      .maybeSingle();
    if (!row) return { found: false as const };
    const { data: post } = await db
      .from("campaign_report_posts")
      .select("post_url, thumbnail_url, platform, campaign_report_creators(name, campaign_reports(title))")
      .eq("id", row.post_id)
      .maybeSingle();
    if (!row.viewed_at) {
      await db
        .from("post_stats_requests")
        .update({ viewed_at: new Date().toISOString(), status: row.status === "requested" ? "viewed" : row.status })
        .eq("id", row.id);
    }
    const c = (post as any)?.campaign_report_creators;
    return {
      found: true as const,
      locked: row.status === "applied",
      submitted: row.status === "submitted" || row.status === "applied",
      fields: row.requested_fields as StatsFieldKey[],
      message: row.message,
      values: ((row.answers as StatsAnswers)?.values ?? {}) as Record<string, string>,
      note: (row.answers as StatsAnswers)?.note ?? "",
      screenshotCount: (row.screenshot_paths ?? []).length,
      postUrl: post?.post_url ?? null,
      thumbnailUrl: post?.thumbnail_url ?? null,
      platform: post?.platform ?? null,
      creatorName: c?.name ?? null,
      campaignTitle: c?.campaign_reports?.title ?? null,
    };
  });

const ImageSchema = z.object({
  type: z.enum(["image/jpeg", "image/png", "image/webp"]),
  base64: z.string().max(14_000_000),
});

export const submitStatsRequestPublic = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        token: TokenSchema,
        values: z.record(z.string(), z.string().trim().max(500)),
        note: z.string().trim().max(2000).optional(),
        images: z.array(ImageSchema).max(MAX_STATS_SCREENSHOTS),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: row } = await db
      .from("post_stats_requests")
      .select("id, status, requested_fields, screenshot_paths, answers, post_id, report_id")
      .eq("token", data.token)
      .maybeSingle();
    if (!row) throw new Error("This link isn't valid any more.");
    if (row.status === "applied") throw new Error("These stats have already been reviewed — thank you!");

    const fields = row.requested_fields as StatsFieldKey[];
    const values: Record<string, string> = {};
    for (const k of fields) {
      const v = data.values[k];
      if (v && v.trim()) values[k] = v.trim();
    }

    // Store screenshots (replace previous set when new ones are uploaded).
    let paths: string[] = row.screenshot_paths ?? [];
    if (data.images.length > 0) {
      paths = [];
      for (const [i, img] of data.images.entries()) {
        const bytes = Uint8Array.from(atob(img.base64), (c) => c.charCodeAt(0));
        if (bytes.byteLength > 10 * 1024 * 1024) throw new Error("Each screenshot must be under 10MB.");
        const ext = img.type === "image/png" ? "png" : img.type === "image/webp" ? "webp" : "jpg";
        const path = `${row.id}/${Date.now()}-${i}.${ext}`;
        const { error } = await db.storage.from("stats-screenshots").upload(path, bytes, { contentType: img.type });
        if (error) throw new Error("Couldn't upload a screenshot — please try again.");
        paths.push(path);
      }
    }

    let extracted: Record<string, string> = ((row.answers as StatsAnswers)?.extracted ?? {}) as Record<string, string>;
    if (data.images.length > 0) {
      try {
        extracted = await extractStatsFromImages(data.images, fields);
      } catch (e) {
        console.error("stats screenshot extraction failed", e);
        extracted = {};
      }
    }

    const answers: StatsAnswers = { values, extracted, note: data.note || undefined };
    const firstSubmit = row.status !== "submitted";
    const { error: uErr } = await db
      .from("post_stats_requests")
      .update({ answers, screenshot_paths: paths, status: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", row.id);
    if (uErr) throw new Error("Couldn't save your stats — please try again.");

    if (firstSubmit) {
      try {
        const { data: post } = await db
          .from("campaign_report_posts")
          .select("campaign_report_creators(name, campaign_reports(title))")
          .eq("id", row.post_id)
          .maybeSingle();
        const c = (post as any)?.campaign_report_creators;
        const lines = fields
          .map((k) => {
            const v = values[k] ?? extracted[k];
            return v ? `${labelFor(k)}: ${v}${!values[k] ? " (from screenshot)" : ""}` : null;
          })
          .filter(Boolean)
          .join("\n");
        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
        await sendTemplateEmail("stats-submitted", COMMUNITY_EMAIL, {
          templateData: {
            creatorName: c?.name,
            campaignTitle: c?.campaign_reports?.title,
            summary: lines || undefined,
            screenshots: paths.length,
            builderUrl: `${SITE}/campaign-reports?edit=${row.report_id}`,
          },
          idempotencyKey: `stats-submitted-${row.id}`,
        });
      } catch (e) {
        console.error("stats submitted email failed", e);
      }
    }
    return { ok: true, extracted };
  });

/* ---------------- AI screenshot reading ---------------- */

async function extractStatsFromImages(
  images: { type: string; base64: string }[],
  fields: StatsFieldKey[],
): Promise<Record<string, string>> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return {};
  const properties: Record<string, unknown> = {};
  for (const k of fields) properties[k] = { type: ["string", "null"], description: labelFor(k) };

  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      Authorization: `Bearer ${apiKey}`,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      instructions:
        "You read social media in-app insights screenshots (Instagram, TikTok, YouTube). Extract only the requested metrics exactly as shown. Return plain numbers without commas (convert 12.4K to 12400, 1.2M to 1200000). Watch time in hours as a number. For text fields (countries, age split) return a short comma-separated summary with percentages. Use null for anything not clearly visible — never guess.",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: `Extract these metrics: ${fields.map(labelFor).join(", ")}.` },
            ...images.map((img) => ({ type: "input_image", image_url: `data:${img.type};base64,${img.base64}` })),
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "stats",
          strict: true,
          schema: { type: "object", properties, required: fields, additionalProperties: false },
        },
      },
    }),
  });
  if (!res.ok || !res.body) {
    console.error("AI extraction error", res.status, (await res.text()).slice(0, 300));
    return {};
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const ev = JSON.parse(payload);
        if (ev.type === "response.output_text.delta" && typeof ev.delta === "string") out += ev.delta;
      } catch {
        /* ignore */
      }
    }
  }
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(out);
  } catch {
    return {};
  }
  const result: Record<string, string> = {};
  for (const k of fields) {
    const v = parsed[k];
    if (v != null && String(v).trim()) result[k] = String(v).trim().slice(0, 300);
  }
  return result;
}
