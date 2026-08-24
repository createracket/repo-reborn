import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ACCOUNT_TYPES = ["artist", "brand", "fan", "creative", "crew"] as const;

const CreateUserSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(200),
  display_name: z.string().trim().min(1).max(120).optional(),
  email_confirm: z.boolean().optional(),
  account_type: z.enum(ACCOUNT_TYPES).optional(),
});

async function assertAdmin(supabase: any, userId: string) {
  const { data: roleRow, error: roleErr } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (roleErr) throw new Error(roleErr.message);
  if (!roleRow) throw new Error("Forbidden");
}

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateUserSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: data.email_confirm ?? true,
      user_metadata: {
        ...(data.display_name ? { full_name: data.display_name } : {}),
        ...(data.account_type ? { account_type: data.account_type } : {}),
      },
    });
    if (error) throw new Error(error.message);

    // Ensure account_type is applied even if the trigger raced or lacked metadata
    if (created.user?.id && data.account_type) {
      await supabaseAdmin
        .from("profiles")
        .update({ account_type: data.account_type })
        .eq("id", created.user.id);
    }
    return { id: created.user?.id, email: created.user?.email };
  });

const DeleteUserSchema = z.object({ user_id: z.string().uuid() });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteUserSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    if (data.user_id === userId) throw new Error("You cannot delete your own account");

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const UpdateUserSchema = z.object({
  user_id: z.string().uuid(),
  email: z.string().trim().email().max(320).optional(),
  display_name: z.string().trim().max(120).nullable().optional(),
  account_type: z.enum(ACCOUNT_TYPES).nullable().optional(),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9-]+$/i, "Slug can only contain letters, numbers, and hyphens")
    .nullable()
    .optional(),
  password: z.string().min(8).max(200).optional(),
});

export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateUserSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    // Update auth user (email / password) if provided
    const authPatch: Record<string, unknown> = {};
    if (data.email) authPatch.email = data.email;
    if (data.password) authPatch.password = data.password;
    if (Object.keys(authPatch).length > 0) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, authPatch);
      if (error) throw new Error(error.message);
    }

    // Update profile fields
    const profilePatch: Record<string, unknown> = {};
    if (data.display_name !== undefined) profilePatch.display_name = data.display_name;
    if (data.account_type !== undefined) profilePatch.account_type = data.account_type;
    if (data.slug !== undefined) profilePatch.slug = data.slug ? data.slug.toLowerCase() : null;
    if (data.email) profilePatch.email = data.email;
    if (Object.keys(profilePatch).length > 0) {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update(profilePatch as any)
        .eq("id", data.user_id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Community profiles: profile rows with no auth account (managed) and hidden
// from public surfaces until an admin assigns an email / unhides them.
// ---------------------------------------------------------------------------

const CreateCommunitySchema = z.object({
  display_name: z.string().trim().min(1).max(120),
  slug: z.string().trim().max(80).optional().nullable(),
  account_type: z.enum(ACCOUNT_TYPES).optional().nullable(),
  location: z.string().trim().max(160).optional().nullable(),
});

async function uniqueSlug(base: string, taken: Set<string>): Promise<string> {
  const { normalizeSlug, validateSlug } = await import("@/lib/slugs");
  // Collapse repeated/edge hyphens and guarantee a valid-shaped root so the
  // uniqueness loop can always terminate.
  let root = normalizeSlug(base)
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/^[^a-z0-9]+/, "");
  if (root.length > 26) root = root.slice(0, 26).replace(/-+$/, "");
  if (root.length < 2) root = `creator-${root}`.replace(/-+$/, "");
  let candidate = root;
  let i = 1;
  while (i < 500 && (taken.has(candidate) || !validateSlug(candidate).ok)) {
    i += 1;
    candidate = `${root}-${i}`;
  }
  if (taken.has(candidate) || !validateSlug(candidate).ok) {
    candidate = `creator-${crypto.randomUUID().slice(0, 8)}`;
  }
  taken.add(candidate);
  return candidate;
}

export const adminCreateCommunityProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateCommunitySchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const { data: existing } = await supabaseAdmin.from("profiles").select("slug").not("slug", "is", null);
    const taken = new Set<string>(((existing ?? []) as any[]).map((r) => String(r.slug)));
    const slug = await uniqueSlug(data.slug || data.display_name, taken);

    const { data: row, error } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: crypto.randomUUID(),
        display_name: data.display_name,
        account_type: data.account_type ?? null,
        location: data.location ?? null,
        slug,
        managed: true,
        hidden: true,
        is_featured: false,
      } as any)
      .select("id, slug")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const VisibilitySchema = z.object({ profile_id: z.string().uuid(), hidden: z.boolean() });

export const adminSetProfileVisibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => VisibilitySchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ hidden: data.hidden } as any)
      .eq("id", data.profile_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const DeleteProfileSchema = z.object({ profile_id: z.string().uuid() });

/** Removes a managed profile row (no auth account attached). */
export const adminDeleteCommunityProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteProfileSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", data.profile_id)
      .eq("managed", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const AssignEmailSchema = z.object({
  profile_id: z.string().uuid(),
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(200).optional(),
});

/**
 * Turns a managed (account-less) profile into a real account: creates the auth
 * user, merges the managed row's data onto the trigger-created profile, and
 * removes the placeholder row.
 */
export const adminAssignEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AssignEmailSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const { data: managedRow, error: readErr } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", data.profile_id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!managedRow) throw new Error("Profile not found");
    if (!(managedRow as any).managed) throw new Error("This profile already has an account");

    const password = data.password ?? `${crypto.randomUUID()}Aa1!`;
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password,
      email_confirm: true,
      user_metadata: {
        ...((managedRow as any).display_name ? { full_name: (managedRow as any).display_name } : {}),
        ...((managedRow as any).account_type ? { account_type: (managedRow as any).account_type } : {}),
      },
    });
    if (createErr) throw new Error(createErr.message);
    const newId = created.user?.id;
    if (!newId) throw new Error("Account creation failed");

    // Free the slug before copying it across.
    await supabaseAdmin.from("profiles").update({ slug: null } as any).eq("id", data.profile_id);

    const { id: _id, created_at: _c, updated_at: _u, email: _e, managed: _m, ...carry } =
      managedRow as Record<string, any>;

    const { error: mergeErr } = await supabaseAdmin
      .from("profiles")
      .update({ ...carry, email: data.email, managed: false } as any)
      .eq("id", newId);
    if (mergeErr) throw new Error(mergeErr.message);

    await supabaseAdmin.from("profiles").delete().eq("id", data.profile_id);

    return { id: newId, email: data.email, temporary_password: data.password ? undefined : password };
  });

/**
 * Creates a hidden, account-less profile for every creator across all rosters,
 * merging duplicates by name. Safe to re-run: existing names/slugs are skipped.
 */
export const adminImportRosterCreators = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const [{ data: items, error: itemsErr }, { data: profiles, error: profErr }] = await Promise.all([
      supabaseAdmin.from("roster_items").select("*"),
      supabaseAdmin.from("profiles").select("id, slug, display_name, artist_name"),
    ]);
    if (itemsErr) throw new Error(itemsErr.message);
    if (profErr) throw new Error(profErr.message);

    const takenSlugs = new Set<string>();
    const takenNames = new Set<string>();
    ((profiles ?? []) as any[]).forEach((p) => {
      if (p.slug) takenSlugs.add(String(p.slug));
      if (p.display_name) takenNames.add(String(p.display_name).trim().toLowerCase());
      if (p.artist_name) takenNames.add(String(p.artist_name).trim().toLowerCase());
    });

    const score = (it: any) =>
      [it.avatar_url, it.location, it.instagram_url, it.tiktok_url, it.youtube_url, it.spotify_url,
       it.twitch_url, it.facebook_url, it.x_url, it.custom_url, it.category].filter(Boolean).length;

    const best = new Map<string, any>();
    ((items ?? []) as any[]).forEach((it) => {
      const name = String(it.name ?? "").trim();
      if (!name) return;
      const key = name.toLowerCase();
      const current = best.get(key);
      if (!current || score(it) > score(current)) best.set(key, it);
    });

    const rows: any[] = [];
    let skipped = 0;
    for (const [key, it] of best) {
      if (takenNames.has(key)) { skipped += 1; continue; }

      const socials: Record<string, string> = {};
      if (it.instagram_url) socials.instagram = it.instagram_url;
      if (it.tiktok_url) socials.tiktok = it.tiktok_url;
      if (it.youtube_url) socials.youtube = it.youtube_url;
      if (it.spotify_url) socials.spotify = it.spotify_url;
      if (it.twitch_url) socials.twitch = it.twitch_url;
      if (it.facebook_url) socials.facebook = it.facebook_url;
      if (it.x_url) socials.x = it.x_url;
      if (it.custom_url) {
        socials.custom_url = it.custom_url;
        if (it.custom_label) socials.custom_label = it.custom_label;
      }

      const totalFollowers =
        (it.instagram_followers ?? 0) + (it.tiktok_followers ?? 0) + (it.youtube_subscribers ?? 0) +
        (it.twitch_followers ?? 0) + (it.facebook_followers ?? 0) + (it.x_followers ?? 0) +
        (it.custom_followers ?? 0);

      const tags = Array.from(
        new Set([
          ...((Array.isArray(it.categories) ? it.categories : []) as string[]),
          ...(it.category ? [it.category as string] : []),
          ...(it.vibe ? [it.vibe as string] : []),
        ].map((t) => String(t).trim()).filter(Boolean)),
      );

      rows.push({
        id: crypto.randomUUID(),
        display_name: String(it.name).trim(),
        avatar_url: it.avatar_url ?? null,
        location: it.location ?? null,
        account_type: "artist",
        socials,
        vibe_tags: tags,
        total_followers: totalFollowers || null,
        monthly_streams: it.spotify_monthly_listens ?? null,
        slug: await uniqueSlug(String(it.name), takenSlugs),
        managed: true,
        hidden: true,
        is_featured: false,
      });
      takenNames.add(key);
    }

    if (rows.length) {
      const { error } = await supabaseAdmin.from("profiles").insert(rows as any);
      if (error) throw new Error(error.message);
    }
    return { created: rows.length, skipped };
  });

const UpdateCommunitySchema = z.object({
  profile_id: z.string().uuid(),
  display_name: z.string().trim().max(120).nullable().optional(),
  account_type: z.enum(ACCOUNT_TYPES).nullable().optional(),
  slug: z.string().trim().max(80).nullable().optional(),
});

/** Edits an account-less profile row (no auth user to update). */
export const adminUpdateCommunityProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateCommunitySchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const patch: Record<string, unknown> = {};
    if (data.display_name !== undefined) patch.display_name = data.display_name;
    if (data.account_type !== undefined) patch.account_type = data.account_type;
    if (data.slug !== undefined) patch.slug = data.slug ? data.slug.toLowerCase() : null;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabaseAdmin
      .from("profiles")
      .update(patch as any)
      .eq("id", data.profile_id)
      .eq("managed", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
