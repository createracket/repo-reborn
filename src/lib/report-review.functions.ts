import { createServerFn } from "@tanstack/react-start";
import { reviewApproveSchema, reviewCommentSchema, reviewEnabled, MAX_COMMENTS_PER_DRAFT } from "./report-review";

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
