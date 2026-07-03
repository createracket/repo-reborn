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
