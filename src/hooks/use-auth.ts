import { useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

/**
 * One shared sign-in check for the whole app.
 *
 * Previously ~39 components each called `supabase.auth.getSession()` /
 * `getUser()` and subscribed to auth changes independently, so every page
 * paid several redundant round-trips before it could render. This module
 * resolves the session once, caches it, and fans the result out to every
 * subscriber synchronously.
 */

type AuthSnapshot = {
  ready: boolean;
  session: Session | null;
  userId: string | null;
  signedIn: boolean;
};

const SIGNED_OUT: AuthSnapshot = { ready: true, session: null, userId: null, signedIn: false };
const PENDING: AuthSnapshot = { ready: false, session: null, userId: null, signedIn: false };
// SSR must never claim a session — the server can't read localStorage.
const SERVER_SNAPSHOT: AuthSnapshot = PENDING;

function snapshotFor(session: Session | null): AuthSnapshot {
  return {
    ready: true,
    session,
    userId: session?.user?.id ?? null,
    signedIn: !!session,
  };
}

let snapshot: AuthSnapshot = PENDING;
let initPromise: Promise<AuthSnapshot> | undefined;
const listeners = new Set<() => void>();
// Admin-role answers, keyed by user id — asked once per session, not once per component.
const adminCache = new Map<string, Promise<boolean>>();

function emit() {
  for (const l of listeners) l();
}

function setSession(session: Session | null) {
  const next = snapshotFor(session);
  if (
    snapshot.ready === next.ready &&
    snapshot.userId === next.userId &&
    snapshot.session?.access_token === next.session?.access_token
  ) {
    return;
  }
  if (snapshot.userId !== next.userId) adminCache.clear();
  snapshot = next;
  emit();
}

function init(): Promise<AuthSnapshot> {
  if (typeof window === "undefined") return Promise.resolve(SERVER_SNAPSHOT);
  if (!initPromise) {
    supabase.auth.onAuthStateChange((_event, session) => setSession(session ?? null));
    initPromise = supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session ?? null);
        return snapshot;
      })
      .catch(() => {
        snapshot = SIGNED_OUT;
        emit();
        return snapshot;
      });
  }
  return initPromise;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  void init();
  return () => {
    listeners.delete(listener);
  };
}

/** Reactive auth state. `ready` is false only until the first resolve. */
export function useAuth(): AuthSnapshot {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => SERVER_SNAPSHOT,
  );
}

/**
 * Imperative access for effects and handlers — resolves the shared session
 * instead of firing another `getSession()` / `getUser()` request.
 */
export async function getAuthSession(): Promise<Session | null> {
  // Ensure initialisation has run, then read the LIVE snapshot — the promise
  // resolves with the value captured at first mount, which would stay
  // signed-out after a later login until a full page reload.
  await init();
  return snapshot.session;
}

export async function getAuthUserId(): Promise<string | null> {
  return (await getAuthSession())?.user?.id ?? null;
}

/** Admin role lookup, cached per user for the life of the session. */
export function isAdminUser(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return Promise.resolve(false);
  const cached = adminCache.get(userId);
  if (cached) return cached;
  const pending = Promise.resolve(
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle(),
  )
    .then(({ data }) => !!data)
    .catch(() => {
      adminCache.delete(userId);
      return false;
    });
  adminCache.set(userId, pending);
  return pending;
}

/** Resolves the current user's admin status using the shared session. */
export async function currentUserIsAdmin(): Promise<boolean> {
  return isAdminUser(await getAuthUserId());
}

/**
 * Drop-in replacement for `supabase.auth.getUser()` in client code.
 * Same shape, but reads the shared session instead of a network round-trip.
 * Server-side checks (RLS, `requireSupabaseAuth`) are unaffected.
 */
export async function getAuthUser(): Promise<{ data: { user: Session["user"] | null } }> {
  const session = await getAuthSession();
  return { data: { user: session?.user ?? null } };
}

/** Drop-in replacement for `supabase.auth.getSession()` in client code. */
export async function getAuthSessionResult(): Promise<{ data: { session: Session | null } }> {
  return { data: { session: await getAuthSession() } };
}
