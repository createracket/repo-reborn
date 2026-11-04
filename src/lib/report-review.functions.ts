import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { reviewApproveSchema, reviewCommentSchema, reviewEnabled, MAX_COMMENTS_PER_DRAFT, DRAFT_MEDIA_BUCKET, DRAFT_MEDIA_URL_TTL_SECONDS, type ReviewDraft } from "./report-review";

// Public (no login) actions. Only drafts that are published on a published,
// code-free Review-enabled report can be touched.
async function loadPublicDraft(draftId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: draft } = await supabaseAdmin
    .from("report_draft_posts")
    .select("id, published, report_id")
    .eq("id", draftId)
    .maybeSingle();
  if (!draft || !draft.published) throw new Error("Draft not found");
  const { data: report } = await supabaseAdmin
    .from("campaign_reports")
    .select("slug, published, access_code")
    .eq("id", draft.report_id)
    .maybeSingle();
  if (!report || !report.published || report.access_code || !reviewEnabled(report.slug)) throw new Error("Draft not found");
  return supabaseAdmin;
}

export const submitDraftComment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => reviewCommentSchema.parse(input))
  .handler(async ({ data }) => {
    const admin = await loadPublicDraft(data.draftId);
    const { count } = await admin.from("report_draft_comments").select("id", { count: "exact", head: true }).eq("draft_id", data.draftId);
    if ((count ?? 0) >= MAX_COMMENTS_PER_DRAFT) throw new Error("This draft has reached its comment limit");
    const { error } = await admin.from("report_draft_comments").insert({ draft_id: data.draftId, author_name: data.name || null, body: data.body });
    if (error) throw new Error("Could not save comment");
    await admin.from("report_draft_posts").update({ approval_status: "amends", approved_at: null }).eq("id", data.draftId);
    return { ok: true };
  });

export const setDraftApproval = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => reviewApproveSchema.parse(input))
  .handler(async ({ data }) => {
    const admin = await loadPublicDraft(data.draftId);
    const { error } = await admin
      .from("report_draft_posts")
      .update(data.approved
        ? { approval_status: "approved", approved_at: new Date().toISOString(), approved_by_name: data.name || null }
        : { approval_status: "pending", approved_at: null, approved_by_name: null })
      .eq("id", data.draftId);
    if (error) throw new Error("Could not save approval");
    return { ok: true };
  });

type ReviewDraftRow = ReviewDraft & { media_path: string | null; thumbnail_path?: string | null };

// Public read for the Review tab. Uploaded files live in a private bucket; this
// returns short-lived signed links only for drafts the review RPC exposes
// (published drafts on a published, code-free Review-enabled report).
export const getReviewDrafts = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1).max(200) }).parse(input))
  .handler(async ({ data }): Promise<ReviewDraft[]> => {
    if (!reviewEnabled(data.slug)) return [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("get_report_review_drafts", { _slug: data.slug });
    if (error) throw new Error("Drafts could not be loaded");
    const drafts = ((rows as unknown) as ReviewDraftRow[]) ?? [];
    const paths = drafts.flatMap((d) => [d.media_path, d.thumbnail_path]).filter((p): p is string => !!p);
    const signed = new Map<string, string>();
    if (paths.length) {
      const { data: urls } = await supabaseAdmin.storage.from(DRAFT_MEDIA_BUCKET).createSignedUrls(paths, DRAFT_MEDIA_URL_TTL_SECONDS);
      for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
    }
    return drafts.map(({ media_path, thumbnail_path, ...d }) => ({
      ...d,
      thumbnail_url: thumbnail_path ? signed.get(thumbnail_path) ?? null : null,
      link_url: d.link_url ?? null,
      media_url: media_path ? signed.get(media_path) ?? null : d.media_url,
    }));
  });
