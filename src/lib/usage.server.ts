// Server-only usage metering helpers. Never import from client code.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type MeteredAction = "profile_sync" | "vibe_intro" | "voice_note";

export const ACTION_LABELS: Record<MeteredAction, string> = {
  profile_sync: "Profile sync",
  vibe_intro: "Vibe check intro parse",
  voice_note: "Brief voice note transcription",
};

const DEFAULT_LIMITS: Record<MeteredAction, number> = {
  profile_sync: 1,
  vibe_intro: 3,
  voice_note: 3,
};

export function currentPeriod(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function nextResetLabel(d = new Date()): string {
  const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  return next.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
}

export async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

export async function getLimit(action: MeteredAction): Promise<number> {
  const { data } = await supabaseAdmin
    .from("usage_limits")
    .select("monthly_limit")
    .eq("action", action)
    .maybeSingle();
  const v = (data as { monthly_limit: number } | null)?.monthly_limit;
  return typeof v === "number" ? v : DEFAULT_LIMITS[action];
}

export type QuotaState = {
  used: number;
  bonus: number;
  limit: number;
  remaining: number;
  blocked: boolean;
  admin: boolean;
  resets: string;
};

export async function getQuota(userId: string, action: MeteredAction): Promise<QuotaState> {
  const [admin, limit, evt, prof] = await Promise.all([
    isAdmin(userId),
    getLimit(action),
    supabaseAdmin
      .from("usage_events")
      .select("count, bonus")
      .eq("user_id", userId)
      .eq("action", action)
      .eq("period", currentPeriod())
      .maybeSingle(),
    supabaseAdmin.from("profiles").select("usage_blocked").eq("id", userId).maybeSingle(),
  ]);

  const row = (evt.data as { count: number; bonus: number } | null) ?? { count: 0, bonus: 0 };
  const blocked = !!(prof.data as { usage_blocked?: boolean } | null)?.usage_blocked;
  const allowance = limit + row.bonus;
  return {
    used: row.count,
    bonus: row.bonus,
    limit,
    remaining: admin ? Number.POSITIVE_INFINITY : Math.max(0, allowance - row.count),
    blocked,
    admin,
    resets: nextResetLabel(),
  };
}

export class QuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuotaError";
  }
}

/** Throws QuotaError when the user may not run the action. Admins bypass. */
export async function assertQuota(userId: string, action: MeteredAction): Promise<QuotaState> {
  const q = await getQuota(userId, action);
  if (q.admin) return q;
  if (q.blocked) throw new QuotaError("Your account can't run this action right now. Contact support.");
  if (q.remaining <= 0)
    throw new QuotaError(
      `You've used your monthly allowance for ${ACTION_LABELS[action]} — next available ${q.resets}.`,
    );
  return q;
}

/** Records one successful use. No-op for admins. */
export async function consumeQuota(userId: string, action: MeteredAction): Promise<void> {
  if (await isAdmin(userId)) return;
  const period = currentPeriod();
  const { data } = await supabaseAdmin
    .from("usage_events")
    .select("count")
    .eq("user_id", userId)
    .eq("action", action)
    .eq("period", period)
    .maybeSingle();
  const next = ((data as { count: number } | null)?.count ?? 0) + 1;
  await supabaseAdmin
    .from("usage_events")
    .upsert(
      { user_id: userId, action, period, count: next, updated_at: new Date().toISOString() },
      { onConflict: "user_id,action,period" },
    );
}
