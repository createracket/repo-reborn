import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";

const SESSION_KEY = "cr_pv_sid";

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

    lastSent.current = pathname;
    const sid = getSessionId();
    const ref = document.referrer && !document.referrer.startsWith(window.location.origin)
      ? document.referrer.slice(0, 1024)
      : null;

    // Fire and forget. Server handles bot detection + country via edge headers.
    // Attach the session token when signed in so admin activity can be isolated.
    (async () => {
      let token: string | null = null;
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token ?? null;
      } catch {}
      try {
        const payload = JSON.stringify({ session_id: sid, path: pathname.slice(0, 512), referrer: ref });
        await fetch("/api/public/track-pageview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: payload,
          keepalive: true,
        });
      } catch {}
    })();
  }, [pathname]);


  return null;
}
