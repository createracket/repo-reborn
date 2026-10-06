import { useEffect, useState } from "react";

/**
 * Returns a counter that bumps when fresh data should be fetched quietly:
 * every `intervalMs` while the tab is visible, and when the user returns to
 * the tab after it has been hidden for at least `returnAfterMs`.
 * Add the returned value to a loading effect's dependency list.
 */
export function useRefreshTick(intervalMs: number, returnAfterMs = 30_000): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let hiddenAt: number | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    const bump = () => setTick((t) => t + 1);
    const start = () => {
      if (!timer) timer = setInterval(bump, intervalMs);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        stop();
      } else {
        if (hiddenAt && Date.now() - hiddenAt >= returnAfterMs) bump();
        hiddenAt = null;
        start();
      }
    };
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs, returnAfterMs]);

  return tick;
}
