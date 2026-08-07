import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, canUseLight, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  // Light mode is a signed-in-only feature, and never on the homepage/auth pages.
  if (!canUseLight) return null;



  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn("text-muted-foreground hover:text-foreground", className)}
    >
      {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  );
}
