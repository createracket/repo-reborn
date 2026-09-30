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
const REPORT_STORAGE_KEY = "cr-tixel-report-theme";

/** Routes that always render dark, whatever the saved preference. */
const ALWAYS_DARK = ["/", "/auth", "/login", "/signup"];

/** Public/shared pages that always render dark for consistent external viewing. */
const ALWAYS_DARK_PREFIXES = ["/partner", "/roster/", "/spotlight/", "/report/"];
const LIGHT_REPORT_PATH = "/report/tixel-report";

function isAlwaysDark(pathname: string) {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === LIGHT_REPORT_PATH) return false;
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
 * first paint. The Tixel report has a separate, visitor-accessible preference.
 */
export const themeInitScript = `(function(){try{var d=document.documentElement;var p=location.pathname.replace(/\\/+$/,"")||"/";var r=p==="${LIGHT_REPORT_PATH}";var t=localStorage.getItem(r?"${REPORT_STORAGE_KEY}":"${STORAGE_KEY}");var ad=${JSON.stringify(ALWAYS_DARK)};var ap=${JSON.stringify(ALWAYS_DARK_PREFIXES)};var alwaysDark=ad.indexOf(p)>-1;for(var j=0;j<ap.length&&!alwaysDark&&!r;j++){var pre=ap[j];if(p===pre.replace(/\\/$/,"")||p.indexOf(pre)===0){alwaysDark=true}}var s=false;for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.indexOf("sb-")===0&&k.slice(-11)==="-auth-token"&&localStorage.getItem(k)){s=true;break}}if(t==="light"&&!alwaysDark&&(s||r)){d.classList.remove("dark");d.classList.toggle("report-light",r)}else{d.classList.add("dark");d.classList.remove("report-light")}}catch(e){document.documentElement.classList.add("dark")}})();`;

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
  root.classList.toggle("report-light", theme === "light" && pathname.replace(/\/+$/, "") === LIGHT_REPORT_PATH);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<Theme>("dark");
  const [signedIn, setSignedIn] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isLightReport = pathname.replace(/\/+$/, "") === LIGHT_REPORT_PATH;
  const canUseLight = isLightReport || (signedIn && !isAlwaysDark(pathname));
  const theme: Theme = canUseLight && preference === "light" ? "light" : "dark";

  // Sync with whatever the pre-hydration script decided.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(isLightReport ? REPORT_STORAGE_KEY : STORAGE_KEY);
    } catch {
      stored = null;
    }
    setPreference(stored === "light" ? "light" : "dark");
    setSignedIn(hasSupabaseSession());
  }, [pathname, isLightReport]);

  // Re-apply on every route/session change so protected pages honour the
  // preference and always-dark pages snap back to dark.
  useEffect(() => {
    applyTheme(theme, pathname);
  }, [theme, pathname]);

  const setTheme = useCallback((next: Theme) => {
    setPreference(next);
    try {
      localStorage.setItem(isLightReport ? REPORT_STORAGE_KEY : STORAGE_KEY, next);
    } catch {
      /* storage unavailable — theme still applies for this session */
    }
  }, [isLightReport]);

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
