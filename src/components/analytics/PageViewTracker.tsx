import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "cr_pv_sid";
const BOT_RE = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|preview|lighthouse|headless|monitor|axios|curl|wget/i;

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/-/g, "").slice(0, 32);
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return Math.random().toString(36).slice(2, 18);
  }
}

export function PageViewTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pathname) return;
    if (lastSent.current === pathname) return;

    // Skip admin/internal noise so traffic stats reflect real visitors
    if (
      pathname.startsWith("/admin") ||
      pathname.startsWith("/_authenticated") ||
      pathname.startsWith("/lovable") ||
      pathname.startsWith("/api/")
    ) {
      return;
    }

    const ua = navigator.userAgent || "";
    if (BOT_RE.test(ua)) return;

    lastSent.current = pathname;
    const sid = getSessionId();
    const ref = document.referrer && !document.referrer.startsWith(window.location.origin)
      ? document.referrer.slice(0, 1024)
      : null;

    (async () => {
      const { data: u } = await supabase.auth.getUser();
      // Fire and forget — never block UI on analytics failures
      void supabase.from("page_views" as any).insert({
        session_id: sid,
        path: pathname.slice(0, 512),
        referrer: ref,
        user_agent: ua.slice(0, 512),
        user_id: u.user?.id ?? null,
      });
    })().catch(() => {});
  }, [pathname]);

  return null;
}
