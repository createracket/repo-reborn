import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Current signed-in user's monthly allowances. */
export const getMyUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getQuota } = await import("./usage.server");
    const actions = ["profile_sync", "vibe_intro", "voice_note"] as const;
    const rows = await Promise.all(
      actions.map(async (a) => {
        const q = await getQuota(context.userId, a);
        return {
          action: a,
          used: q.used,
          limit: q.limit + q.bonus,
          remaining: q.admin ? -1 : q.remaining,
          blocked: q.blocked,
          admin: q.admin,
          resets: q.resets,
        };
      }),
    );
    return { actions: rows };
  });

/** Admin: usage across all members for a given period (YYYY-MM). */
export const adminUsageOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ period: z.string().regex(/^\d{4}-\d{2}$/).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { isAdmin, currentPeriod } = await import("./usage.server");
    if (!(await isAdmin(context.userId))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const period = data.period ?? currentPeriod();

    const [{ data: events }, { data: limits }] = await Promise.all([
      supabaseAdmin.from("usage_events").select("user_id, action, count, bonus, updated_at").eq("period", period),
      supabaseAdmin.from("usage_limits").select("action, monthly_limit, label").order("action"),
    ]);

    const ids = Array.from(new Set((events ?? []).map((e) => e.user_id)));
    let profiles: Array<{ id: string; display_name: string | null; email: string | null; usage_blocked: boolean }> = [];
    if (ids.length) {
      const { data: p } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name, email, usage_blocked")
        .in("id", ids);
      profiles = (p ?? []) as typeof profiles;
    }
    const { data: blockedProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, email, usage_blocked")
      .eq("usage_blocked", true);

    const byId = new Map<string, { id: string; name: string; email: string | null; blocked: boolean; actions: Record<string, { count: number; bonus: number }>; total: number }>();
    const ensure = (id: string) => {
      if (!byId.has(id)) {
        const p = [...profiles, ...((blockedProfiles ?? []) as typeof profiles)].find((x) => x.id === id);
        byId.set(id, {
          id,
          name: p?.display_name || p?.email || id.slice(0, 8),
          email: p?.email ?? null,
          blocked: !!p?.usage_blocked,
          actions: {},
          total: 0,
        });
      }
      return byId.get(id)!;
    };
    (events ?? []).forEach((e) => {
      const row = ensure(e.user_id);
      row.actions[e.action] = { count: e.count, bonus: e.bonus };
      row.total += e.count;
    });
    ((blockedProfiles ?? []) as typeof profiles).forEach((p) => ensure(p.id));

    return {
      period,
      limits: (limits ?? []) as Array<{ action: string; monthly_limit: number; label: string }>,
      users: Array.from(byId.values()).sort((a, b) => b.total - a.total),
    };
  });

/** Admin: grant extra allowance for one action in the current period. */
export const adminGrantAllowance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        action: z.enum(["profile_sync", "vibe_intro", "voice_note"]),
        amount: z.number().int().min(-50).max(50),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { isAdmin, currentPeriod } = await import("./usage.server");
    if (!(await isAdmin(context.userId))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const period = currentPeriod();
    const { data: existing } = await supabaseAdmin
      .from("usage_events")
      .select("count, bonus")
      .eq("user_id", data.userId)
      .eq("action", data.action)
      .eq("period", period)
      .maybeSingle();
    const bonus = Math.max(0, (existing?.bonus ?? 0) + data.amount);
    await supabaseAdmin.from("usage_events").upsert(
      {
        user_id: data.userId,
        action: data.action,
        period,
        count: existing?.count ?? 0,
        bonus,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,action,period" },
    );
    return { ok: true as const, bonus };
  });

/** Admin: block or unblock all metered actions for a member. */
export const adminSetUsageBlocked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid(), blocked: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { isAdmin } = await import("./usage.server");
    if (!(await isAdmin(context.userId))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").update({ usage_blocked: data.blocked }).eq("id", data.userId);
    return { ok: true as const };
  });

/** Admin: change the default monthly limit for an action. */
export const adminSetUsageLimit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        action: z.enum(["profile_sync", "vibe_intro", "voice_note"]),
        monthlyLimit: z.number().int().min(0).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { isAdmin } = await import("./usage.server");
    if (!(await isAdmin(context.userId))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("usage_limits")
      .update({ monthly_limit: data.monthlyLimit, updated_at: new Date().toISOString() })
      .eq("action", data.action);
    return { ok: true as const };
  });

/** Admin: newest member profiles, for review after sign-up. */
export const adminRecentProfiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ limit: z.number().int().min(1).max(100).optional() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { isAdmin } = await import("./usage.server");
    if (!(await isAdmin(context.userId))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, email, account_type, bio, slug, created_at, updated_at, usage_blocked, subscription_tier")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 25);
    return { profiles: rows ?? [] };
  });
