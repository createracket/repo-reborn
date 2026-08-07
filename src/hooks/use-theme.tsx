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

/** Routes that always render dark, whatever the saved preference. */
const ALWAYS_DARK = ["/", "/auth", "/login", "/signup"];

/** Public/shared pages that always render dark for consistent external viewing. */
const ALWAYS_DARK_PREFIXES = ["/partner", "/roster/", "/spotlight/", "/report/"];

function isAlwaysDark(pathname: string) {
  const p = pathname.replace(/\/+$/, "") || "/";
  return ALWAYS_DARK.includes(p) || ALWAYS_DARK_PREFIXES.some((x) => p === x.replace(/\/$/, "") || p.startsWith(x));
}


/**
 * Light mode is only available to signed-in users. Detect a Supabase session
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
 * first paint. Dark is the default; light is opt-in for signed-in users and
 * never applies to the homepage or auth pages.
 */
export const themeInitScript = `(function(){try{var d=document.documentElement;var t=localStorage.getItem("${STORAGE_KEY}");var p=location.pathname.replace(/\\/+$/,"")||"/";var ad=${JSON.stringify(ALWAYS_DARK)};var ap=${JSON.stringify(ALWAYS_DARK_PREFIXES)};var alwaysDark=ad.indexOf(p)>-1;for(var j=0;j<ap.length&&!alwaysDark;j++){var pre=ap[j];if(p===pre.replace(/\\/$/,"")||p.indexOf(pre)===0){alwaysDark=true}}var s=false;for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.indexOf("sb-")===0&&k.slice(-11)==="-auth-token"&&localStorage.getItem(k)){s=true;break}}if(t==="light"&&!alwaysDark&&s){d.classList.remove("dark")}else{d.classList.add("dark")}}catch(e){document.documentElement.classList.add("dark")}})();`;

type ThemeContextValue = {
  theme: Theme;
  /** True when the current route/session allows switching to light mode. */
  canUseLight: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<Theme>("dark");
  const [signedIn, setSignedIn] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const canUseLight = signedIn && !isAlwaysDark(pathname);
  const theme: Theme = canUseLight && preference === "light" ? "light" : "dark";

  // Sync with whatever the pre-hydration script decided.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      stored = null;
    }
    setPreference(stored === "light" ? "light" : "dark");
    setSignedIn(hasSupabaseSession());
  }, [pathname]);

  // Re-apply on every route/session change so protected pages honour the
  // preference and always-dark pages snap back to dark.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setPreference(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable — theme still applies for this session */
    }
  }, []);

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
