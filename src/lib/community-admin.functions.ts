import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const ACCOUNT_TYPES = ["ARTIST", "BAND", "CREATIVE", "FAN", "CREW"] as const;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil((MAX_UPLOAD_BYTES * 4) / 3) + 8;

const SaveCommunityProfileSchema = z.object({
  id: z.string().uuid().optional(),
  display_name: z.string().trim().min(1, "Name is required").max(120),
  account_type: z.enum(ACCOUNT_TYPES),
  tagline: z.string().trim().max(280).nullable().optional(),
  location: z.string().trim().max(160).nullable().optional(),
  avatar_url: z.string().trim().max(2048).nullable().optional(),
});

const DeleteCommunityProfileSchema = z.object({
  id: z.string().uuid(),
});

const UploadCommunityImageSchema = z.object({
  base64: z.string().min(1).max(MAX_BASE64_LENGTH),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
});

async function assertAdmin(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Admin access required");
}

export const adminListCommunityProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("community_profiles")
      .select("id, display_name, account_type, tagline, bio, location, avatar_url, values, socials")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSaveCommunityProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveCommunityProfileSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const payload = {
      display_name: data.display_name,
      account_type: data.account_type.toLowerCase(),
      tagline: data.tagline || null,
      location: data.location || null,
      avatar_url: data.avatar_url || null,
    };

    const result = data.id
      ? await supabaseAdmin
          .from("community_profiles")
          .update(payload)
          .eq("id", data.id)
          .select("id")
          .single()
      : await supabaseAdmin.from("community_profiles").insert(payload).select("id").single();

    if (result.error) throw new Error(result.error.message);
    return result.data;
  });

export const adminDeleteCommunityProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteCommunityProfileSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("community_profiles").delete().eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUploadCommunityImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UploadCommunityImageSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const extensionByType = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    } as const;
    const binary = atob(data.base64);
    const fileBytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

    if (fileBytes.byteLength > MAX_UPLOAD_BYTES) {
      throw new Error("Image must be under 8MB");
    }

    const path = `community/${crypto.randomUUID()}.${extensionByType[data.contentType]}`;
    const { error } = await supabaseAdmin.storage.from("spotlight-images").upload(path, fileBytes, {
      upsert: false,
      cacheControl: "3600",
      contentType: data.contentType,
    });

    if (error) throw new Error(error.message);

    const { data: publicData } = supabaseAdmin.storage.from("spotlight-images").getPublicUrl(path);

    return { publicUrl: publicData.publicUrl };
  });
