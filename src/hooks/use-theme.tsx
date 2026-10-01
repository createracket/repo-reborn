import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouterState } from "@tanstack/react-router";

export type Theme = "dark" | "light";

const STORAGE_KEY = "cr-theme";
// Keep the Tixel preference key so existing visitors retain their choice.
const REPORT_STORAGE_KEY = "cr-tixel-report-theme";

/** Routes that always render dark, whatever the saved preference. */
const ALWAYS_DARK = ["/", "/auth", "/login", "/signup"];

/** Other public/shared pages remain dark; reports and rosters have a visitor-facing toggle. */
const ALWAYS_DARK_PREFIXES = ["/partner", "/spotlight/"];
const REPORT_PREFIX = "/report/";
const ROSTER_PREFIX = "/roster/";

function isReportPath(pathname: string) {
  return pathname.startsWith(REPORT_PREFIX) && pathname.length > REPORT_PREFIX.length;
}

function isRosterPath(pathname: string) {
  return pathname.startsWith(ROSTER_PREFIX) && pathname.length > ROSTER_PREFIX.length;
}

function isSharedLightPath(pathname: string) {
  return isReportPath(pathname) || isRosterPath(pathname);
}

function isAlwaysDark(pathname: string) {
  const p = pathname.replace(/\/+$/, "") || "/";
  return ALWAYS_DARK.includes(p) || ALWAYS_DARK_PREFIXES.some((x) => p === x.replace(/\/$/, "") || p.startsWith(x));
}


/**
 * Most light mode is only available to signed-in users. Detect a Supabase session
 * from its localStorage token so the pre-paint script can decide without
 * waiting for the auth client to boot.
 */
function hasSupabaseSession() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token") && localStorage.getItem(key)) {
        return true;
      }
    }
  } catch {
    /* storage unavailable */
  }
  return false;
}

/**
 * Inline script injected into <head> so the correct theme is applied before
 * first paint. Reports and rosters share a visitor-accessible preference.
 */
export const themeInitScript = `(function(){try{var d=document.documentElement;var p=location.pathname.replace(/\\/+$/ ,"")||"/";var r=p.indexOf("${REPORT_PREFIX}")===0&&p.length>${REPORT_PREFIX.length};var roster=p.indexOf("${ROSTER_PREFIX}")===0&&p.length>${ROSTER_PREFIX.length};var shared=r||roster;var t=localStorage.getItem(shared?"${REPORT_STORAGE_KEY}":"${STORAGE_KEY}");var ad=${JSON.stringify(ALWAYS_DARK)};var ap=${JSON.stringify(ALWAYS_DARK_PREFIXES)};var alwaysDark=ad.indexOf(p)>-1;for(var j=0;j<ap.length&&!alwaysDark&&!shared;j++){var pre=ap[j];if(p===pre.replace(/\\/$/,"")||p.indexOf(pre)===0){alwaysDark=true}}var s=false;for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.indexOf("sb-")===0&&k.slice(-11)==="-auth-token"&&localStorage.getItem(k)){s=true;break}}if(t==="light"&&!alwaysDark&&(s||shared)){d.classList.remove("dark");d.classList.add("report-light")}else{d.classList.add("dark");d.classList.remove("report-light")}}catch(e){document.documentElement.classList.add("dark")}})();`;

type ThemeContextValue = {
  theme: Theme;
  /** True when the current route/session allows switching to light mode. */
  canUseLight: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme, pathname: string) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("report-light", theme === "light");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<Theme>("dark");
  const [signedIn, setSignedIn] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isShared = isSharedLightPath(pathname);
  const canUseLight = isShared || (signedIn && !isAlwaysDark(pathname));
  const theme: Theme = canUseLight && preference === "light" ? "light" : "dark";

  // Sync with whatever the pre-hydration script decided.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(isShared ? REPORT_STORAGE_KEY : STORAGE_KEY);
    } catch {
      stored = null;
    }
    setPreference(stored === "light" ? "light" : "dark");
    setSignedIn(hasSupabaseSession());
  }, [pathname, isShared]);

  // Re-apply on every route/session change so protected pages honour the
  // preference and always-dark pages snap back to dark.
  useEffect(() => {
    applyTheme(theme, pathname);
  }, [theme, pathname]);

  const setTheme = useCallback((next: Theme) => {
    setPreference(next);
    try {
      localStorage.setItem(isShared ? REPORT_STORAGE_KEY : STORAGE_KEY, next);
    } catch {
      /* storage unavailable — theme still applies for this session */
    }
  }, [isShared]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, canUseLight, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}


export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
